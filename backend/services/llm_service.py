"""
LLM Service - DeepSeek 适配版
支持 DeepSeek Chat API（兼容 OpenAI 格式）
环境变量要求：
    DEEPSEEK_API_KEY: 你的 DeepSeek API Key
    DEEPSEEK_MODEL: 可选，默认为 deepseek-chat
"""

import os
import re
import json
import httpx
from typing import Optional, Dict, List, Union


class LLMService:
    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        if not self.api_key:
            raise ValueError("未找到 DEEPSEEK_API_KEY，请在 .env 文件中配置")
        self.base_url = "https://api.deepseek.com/v1"
        self.model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    async def chat_json(
        self,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
        model: Optional[str] = None
    ) -> Optional[Union[Dict, List]]:
        """
        调用 DeepSeek Chat API，返回解析后的 JSON 对象。
        自动提取被 markdown 代码块包裹的 JSON。
        """
        if model is None:
            model = self.model

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }

        last_error = None
        for attempt in range(2):
            try:
                async with httpx.AsyncClient(timeout=90.0) as client:
                    resp = await client.post(
                        f"{self.base_url}/chat/completions",
                        json=payload,
                        headers=headers,
                    )

                if resp.status_code != 200:
                    error_msg = f"DeepSeek API 返回 {resp.status_code}: {resp.text[:300]}"
                    print(f"❌ {error_msg}")
                    last_error = error_msg
                    continue

                data = resp.json()
                if "choices" not in data or not data["choices"]:
                    print("❌ DeepSeek 返回数据中无 choices")
                    last_error = "No choices in response"
                    continue

                content = data["choices"][0]["message"]["content"]
                if not content:
                    print("❌ DeepSeek 返回空内容")
                    last_error = "Empty content"
                    continue

                # 提取 JSON：优先匹配 markdown 代码块，否则匹配第一个 [ 或 {
                json_str = None
                code_block = re.search(r'```(?:json)?\s*([\[\{].*?[\]\}])\s*```', content, re.DOTALL)
                if code_block:
                    json_str = code_block.group(1)
                else:
                    match = re.search(r'(\[.*\]|\{.*\})', content, re.DOTALL)
                    if match:
                        json_str = match.group(1)

                if not json_str:
                    print(f"⚠️ 未在返回内容中找到 JSON 结构: {content[:200]}")
                    last_error = "No JSON found"
                    continue

                try:
                    parsed = json.loads(json_str)
                    return parsed
                except json.JSONDecodeError as e:
                    print(f"❌ JSON 解析失败: {e}")
                    last_error = f"JSON decode error: {e}"
                    continue

            except httpx.TimeoutException:
                print(f"⏰ DeepSeek 请求超时 (第 {attempt+1} 次尝试)")
                last_error = "Timeout"
            except Exception as e:
                print(f"❌ DeepSeek 请求异常: {type(e).__name__} - {e}")
                last_error = str(e)

        print(f"❌ 所有重试均失败，最后错误: {last_error}")
        return None

    async def chat(
        self,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 2048,
        model: Optional[str] = None
    ) -> Optional[str]:
        """普通文本对话，非 JSON 模式。返回纯文本响应内容。"""
        if model is None:
            model = self.model

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }

        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                resp = await client.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers,
                )
            if resp.status_code != 200:
                print(f"❌ DeepSeek API 错误 {resp.status_code}: {resp.text[:200]}")
                return None
            data = resp.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"❌ DeepSeek 普通对话异常: {e}")
            return None
