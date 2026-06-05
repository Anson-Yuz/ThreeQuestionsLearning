import os
import json
import re
import asyncio
import httpx
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

class LLMService:
    """MiniMax API 调用服务"""

    def __init__(self):
        self.api_key = os.getenv("MINIMAX_API_KEY", "")
        self.api_host = os.getenv("MINIMAX_API_HOST", "https://api.minimaxi.com")
        self.model = os.getenv("LLM_MODEL", "MiniMax-M2.7")
        self.max_retries = 2

        if not self.api_key:
            print("⚠️ 警告: MINIMAX_API_KEY 未设置，LLM 功能将不可用")

    async def chat(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> str:
        """调用 LLM 进行对话 — 失败时返回空字符串"""

        if not self.api_key:
            print("⚠️ LLM: API Key 未配置")
            return ""

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        print(f"🔧 LLM 请求: model={self.model}, max_tokens={max_tokens}, prompt长度={len(prompt)}, temperature={temperature}")

        last_error = None
        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(
                        f"{self.api_host}/v1/text/chatcompletion_v2",
                        headers={
                            "Authorization": f"Bearer {self.api_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": self.model,
                            "messages": messages,
                            "temperature": temperature,
                            "max_tokens": max_tokens
                        }
                    )

                    print(f"🔧 LLM 响应状态码: {response.status_code}")
                    if response.status_code != 200:
                        print(f"🔧 LLM 错误响应: {response.text[:500]}")
                        last_error = f"HTTP {response.status_code}"
                        continue

                    data = response.json()

                    base_resp = data.get("base_resp", {})
                    if base_resp.get("status_code", 0) != 0:
                        print(f"❌ LLM API 错误: {base_resp.get('status_msg', 'unknown')}")
                        last_error = f"API {base_resp.get('status_msg', 'unknown')}"
                        continue

                    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                    if not content:
                        print("⚠️ LLM 返回空内容")
                    return content

            except asyncio.TimeoutError:
                print(f"❌ LLM 调用超时 (尝试 {attempt + 1}/{self.max_retries + 1})")
                last_error = "Timeout"
            except Exception as e:
                print(f"❌ LLM 调用失败: {type(e).__name__} - {e}")
                last_error = str(e)

            if attempt < self.max_retries:
                await asyncio.sleep(1)

        print(f"❌ LLM 全部重试失败，最后错误: {last_error}")
        return ""

    async def chat_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
        model: Optional[str] = None
    ) -> Optional[Dict]:
        """调用 LLM 并解析 JSON 响应 — 自动处理 markdown 代码块"""
        model = "abab5.5s-chat"  # 强制快速模型，忽略传入参数
        raw = await self.chat(prompt, system_prompt, temperature, max_tokens)
        if not raw:
            return None

        # 去除 markdown 代码块包裹
        text = raw.strip()
        if text.startswith("```"):
            text = re.sub(r'^```(?:json)?\s*\n?', '', text)
            text = re.sub(r'\n?```\s*$', '', text)
            text = text.strip()

        # 尝试找到 JSON 对象/数组的起止位置
        if not text.startswith('{') and not text.startswith('['):
            m_start = text.find('{')
            a_start = text.find('[')
            if m_start == -1 and a_start == -1:
                print(f"⚠️ LLM 返回内容不含 JSON: {text[:200]}")
                return None
            start = m_start if a_start == -1 else (a_start if m_start == -1 else min(m_start, a_start))
            text = text[start:]
            # 找到对应的闭合
            depth = 0
            end = 0
            for i, ch in enumerate(text):
                if ch in '{[':
                    depth += 1
                elif ch in '}]':
                    depth -= 1
                    if depth == 0:
                        end = i + 1
                        break
            if end > 0:
                text = text[:end]

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            print(f"⚠️ LLM JSON 解析失败: {e}\n  原始内容前200字符: {text[:200]}")
            return None