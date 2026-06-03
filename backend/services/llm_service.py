import os
import json
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

        if not self.api_key:
            print("⚠️ 警告: MINIMAX_API_KEY 未设置，LLM 功能将不可用")

    async def chat(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> str:
        """调用 LLM 进行对话"""

        if not self.api_key:
            return self._mock_response(prompt)

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
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

                if response.status_code == 200:
                    data = response.json()
                    return data.get("choices", [{}])[0].get("message", {}).get("content", "")
                else:
                    print(f"❌ LLM API 错误: {response.status_code}")
                    return self._mock_response(prompt)

            except Exception as e:
                print(f"❌ LLM 调用失败: {e}")
                return self._mock_response(prompt)

    def _mock_response(self, prompt: str) -> str:
        """模拟响应（当 API 不可用时）"""
        return f"【模拟响应】收到了你的问题：{prompt[:50]}... 我会基于课程内容为你解答。"
