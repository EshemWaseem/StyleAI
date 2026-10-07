# llm_service.py
"""
Unified LLM client — Groq | Gemini | Ollama.
Drop-in replacement for the old OllamaService.

Routing:
- Images present → VISION_PROVIDER   (default: gemini)
- Text only      → LLM_PROVIDER      (default: groq)
"""

import asyncio
import json
import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

GROQ_BASE = "https://api.groq.com/openai/v1"
GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta"


class LLMService:
    def __init__(self) -> None:
        self.timeout = settings.AI_REQUEST_TIMEOUT
        self._client: httpx.AsyncClient | None = None
        self._semaphore = asyncio.Semaphore(4)
        self._lock = asyncio.Lock()

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            async with self._lock:
                if self._client is None or self._client.is_closed:
                    self._client = httpx.AsyncClient(
                        timeout=httpx.Timeout(
                            connect=10.0,
                            read=self.timeout,
                            write=30.0,
                            pool=10.0,
                        ),
                        limits=httpx.Limits(
                            max_keepalive_connections=10,
                            max_connections=20,
                        ),
                    )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    # ==================================================
    # PUBLIC — drop-in API
    # ==================================================
    async def generate_json(
        self,
        prompt: str,
        model: Optional[str] = None,
        images: Optional[list[str]] = None,
        temperature: float = 0.3,
        num_predict: int = 800,
        keep_alive: str | None = None,
    ) -> dict:
        if images:
            return await self._vision_json(prompt, images, model, temperature, num_predict)
        return await self._text_json(prompt, model, temperature, num_predict)

    async def generate_text(
        self,
        prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.5,
        num_predict: int = 800,
        keep_alive: str | None = None,
    ) -> str:
        return await self._text_text(prompt, model, temperature, num_predict)

    # ==================================================
    # ROUTING
    # ==================================================
    async def _text_json(self, prompt, model, temperature, num_predict):
        provider = (settings.LLM_PROVIDER or "groq").lower()
        model = model or settings.text_model
        logger.debug("text_json via %s (model=%s)", provider, model)

        if provider == "groq":
            return await self._groq_json(prompt, model, temperature, num_predict)
        if provider == "gemini":
            return await self._gemini_json(prompt, model, temperature, num_predict)
        if provider == "ollama":
            return await self._ollama_json(prompt, model, temperature, num_predict)
        raise ValueError(f"Unknown LLM_PROVIDER: {provider}")

    async def _text_text(self, prompt, model, temperature, num_predict):
        provider = (settings.LLM_PROVIDER or "groq").lower()
        model = model or settings.text_model

        if provider == "groq":
            return await self._groq_text(prompt, model, temperature, num_predict)
        if provider == "gemini":
            return await self._gemini_text(prompt, model, temperature, num_predict)
        if provider == "ollama":
            return await self._ollama_text(prompt, model, temperature, num_predict)
        raise ValueError(f"Unknown LLM_PROVIDER: {provider}")

    async def _vision_json(self, prompt, images, model, temperature, num_predict):
        provider = (settings.VISION_PROVIDER or "gemini").lower()
        model = model or settings.vision_model
        logger.debug("vision_json via %s (model=%s)", provider, model)

        if provider == "gemini":
            return await self._gemini_vision_json(prompt, images, model, temperature, num_predict)
        if provider == "groq":
            return await self._groq_vision_json(prompt, images, model, temperature, num_predict)
        if provider == "ollama":
            return await self._ollama_json(prompt, model, temperature, num_predict, images=images)
        raise ValueError(f"Unknown VISION_PROVIDER: {provider}")

    # ==================================================
    # GROQ
    # ==================================================
    async def _groq_json(self, prompt, model, temperature, num_predict):
        raw = await self._groq_chat(prompt, model, temperature, num_predict, json_mode=True)
        return self._parse_json(raw)

    async def _groq_text(self, prompt, model, temperature, num_predict):
        return await self._groq_chat(prompt, model, temperature, num_predict, json_mode=False)

    async def _groq_vision_json(self, prompt, images, model, temperature, num_predict):
        content = [{"type": "text", "text": prompt}]
        for img in images:
            b64 = self._normalize_b64(img)
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
            })

        payload = {
            "model": model,
            "messages": [{"role": "user", "content": content}],
            "temperature": temperature,
            "max_tokens": num_predict,
            "response_format": {"type": "json_object"},
        }
        raw = await self._groq_call(payload)
        return self._parse_json(raw)

    async def _groq_chat(self, prompt, model, temperature, num_predict, json_mode: bool):
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
            "max_tokens": num_predict,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        return await self._groq_call(payload)

    async def _groq_call(self, payload: dict) -> str:
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not configured")

        client = await self._get_client()
        async with self._semaphore:
            try:
                resp = await client.post(
                    f"{GROQ_BASE}/chat/completions",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json",
                    },
                )
                resp.raise_for_status()
            except httpx.ReadTimeout as e:
                raise ValueError(f"Groq timeout after {self.timeout}s") from e
            except httpx.HTTPStatusError as e:
                logger.error("Groq HTTP %s: %s", e.response.status_code, e.response.text[:300])
                raise ValueError(f"Groq HTTP error: {e.response.status_code}") from e
            except httpx.RequestError as e:
                logger.error("Groq unreachable: %s", e)
                raise ValueError(f"Groq unreachable: {e}") from e

        data = resp.json()
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise ValueError(f"Groq malformed response: {e}") from e
        if not content:
            raise ValueError("Empty response from Groq")
        return content.strip()

    # ==================================================
    # GEMINI
    # ==================================================
    async def _gemini_json(self, prompt, model, temperature, num_predict):
        raw = await self._gemini_call(
            prompt=prompt, model=model, temperature=temperature,
            num_predict=num_predict, json_mode=True,
        )
        return self._parse_json(raw)

    async def _gemini_text(self, prompt, model, temperature, num_predict):
        return await self._gemini_call(
            prompt=prompt, model=model, temperature=temperature,
            num_predict=num_predict, json_mode=False,
        )

    async def _gemini_vision_json(self, prompt, images, model, temperature, num_predict):
        parts = [{"text": prompt}]
        for img in images:
            b64 = self._normalize_b64(img)
            parts.append({
                "inline_data": {"mime_type": "image/jpeg", "data": b64}
            })

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": num_predict,
                "responseMimeType": "application/json",
            },
        }
        raw = await self._gemini_raw_call(model, payload)
        return self._parse_json(raw)

    async def _gemini_call(self, prompt, model, temperature, num_predict, json_mode):
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": num_predict,
            },
        }
        if json_mode:
            payload["generationConfig"]["responseMimeType"] = "application/json"
        return await self._gemini_raw_call(model, payload)

    async def _gemini_raw_call(self, model: str, payload: dict) -> str:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not configured")

        client = await self._get_client()
        url = f"{GEMINI_BASE}/models/{model}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": settings.GEMINI_API_KEY,
        }

        async with self._semaphore:
            try:
                resp = await client.post(url, json=payload, headers=headers)
                resp.raise_for_status()
            except httpx.ReadTimeout as e:
                raise ValueError(f"Gemini timeout after {self.timeout}s") from e
            except httpx.HTTPStatusError as e:
                logger.error("Gemini HTTP %s: %s", e.response.status_code, e.response.text[:300])
                raise ValueError(f"Gemini HTTP error: {e.response.status_code}") from e
            except httpx.RequestError as e:
                logger.error("Gemini unreachable: %s", e)
                raise ValueError(f"Gemini unreachable: {e}") from e

        data = resp.json()
        try:
            parts = data["candidates"][0]["content"]["parts"]
            text = "".join(p.get("text", "") for p in parts)
        except (KeyError, IndexError) as e:
            raise ValueError(f"Gemini malformed response: {e}") from e
        if not text:
            raise ValueError("Empty response from Gemini")
        return text.strip()

    # ==================================================
    # OLLAMA (legacy — dev only)
    # ==================================================
    async def _ollama_json(self, prompt, model, temperature, num_predict, images=None):
        raw = await self._ollama_call(prompt, model, temperature, num_predict, True, images)
        return self._parse_json(raw)

    async def _ollama_text(self, prompt, model, temperature, num_predict):
        return await self._ollama_call(prompt, model, temperature, num_predict, False)

    async def _ollama_call(self, prompt, model, temperature, num_predict, json_mode, images=None):
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": num_predict,
                "repeat_penalty": 1.15,
                "repeat_last_n": 128,
                "top_p": 0.9,
                "top_k": 40,
            },
        }
        if json_mode:
            payload["format"] = "json"
        if images:
            payload["images"] = [self._normalize_b64(i) for i in images]

        client = await self._get_client()
        async with self._semaphore:
            try:
                resp = await client.post(
                    f"{settings.OLLAMA_URL.rstrip('/')}/api/generate",
                    json=payload,
                )
                resp.raise_for_status()
            except httpx.HTTPStatusError as e:
                raise ValueError(f"Ollama HTTP error: {e.response.status_code}") from e
            except httpx.RequestError as e:
                raise ValueError(f"Ollama unreachable: {e}") from e

        data = resp.json()
        raw = (data.get("response") or "").strip()
        if not raw:
            raise ValueError("Empty response from Ollama")
        return raw

    # ==================================================
    # HELPERS
    # ==================================================
    @staticmethod
    def _normalize_b64(img: str) -> str:
        if not img:
            return ""
        if "," in img and img.startswith("data:"):
            return img.split(",", 1)[1]
        return img

    @staticmethod
    def _parse_json(raw: str) -> dict:
        text = raw.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip().startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(text[start:end + 1])
                except json.JSONDecodeError:
                    pass
            logger.error("Non-JSON response: %s", text[:300])
            raise ValueError(f"Invalid JSON: {text[:200]}")


llm_service = LLMService()