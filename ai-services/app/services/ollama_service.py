# ollama_service.py
"""
Ollama HTTP client. JSON-mode + raw-text helpers. No business logic.
"""

import asyncio
import json
import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class OllamaService:
    def __init__(self) -> None:
        self.base_url = settings.OLLAMA_URL
        self.timeout = settings.AI_REQUEST_TIMEOUT
        self._client: httpx.AsyncClient | None = None
        # Ollama serializes GPU/CPU work — limit concurrency to avoid pileup
        self._semaphore = asyncio.Semaphore(2)
        self._lock = asyncio.Lock()

    async def _get_client(self) -> httpx.AsyncClient:
        """Lazy singleton client — created once, reused."""
        if self._client is None or self._client.is_closed:
            async with self._lock:
                if self._client is None or self._client.is_closed:
                    self._client = httpx.AsyncClient(
                        base_url=self.base_url,
                        timeout=httpx.Timeout(
                            connect=10.0,
                            read=self.timeout,
                            write=30.0,
                            pool=10.0,
                        ),
                        limits=httpx.Limits(
                            max_keepalive_connections=5,
                            max_connections=10,
                        ),
                    )
        return self._client

    async def close(self) -> None:
        """Close the singleton client on shutdown."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    # ==================================================
    # JSON MODE — returns parsed dict
    # ==================================================
    async def generate_json(
        self,
        prompt: str,
        model: Optional[str] = None,
        images: Optional[list[str]] = None,
        temperature: float = 0.3,
        num_predict: int = 800,
        keep_alive: str = "30m",
    ) -> dict:
        """
        Call Ollama /api/generate with format=json.
        Returns parsed dict. Raises on empty/non-JSON/transport errors.
        """
        model = model or settings.OLLAMA_TEXT_MODEL

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "keep_alive": keep_alive,
                        "options": {
                "temperature": temperature,
                "num_predict": num_predict,
                "repeat_penalty": 1.15,
                "repeat_last_n": 128,
                "top_p": 0.9,
                "top_k": 40,
                "presence_penalty": 0.3,
                "frequency_penalty": 0.3,
                "stop": ["\nUser:", "\n\nUser:", "\nAssistant:", "<|im_end|>"],
            },
        }
        if images:
            payload["images"] = images

        client = await self._get_client()

        async with self._semaphore:
            try:
                resp = await client.post("/api/generate", json=payload)
                resp.raise_for_status()
            except httpx.ReadTimeout as e:
                logger.error("Ollama timeout after %ss (model=%s)", self.timeout, model)
                raise ValueError(f"Ollama timed out after {self.timeout}s") from e
            except httpx.HTTPStatusError as e:
                logger.error(
                    "Ollama HTTP %s: %s", e.response.status_code, e.response.text[:200]
                )
                raise ValueError(f"Ollama HTTP error: {e.response.status_code}") from e
            except httpx.RequestError as e:
                logger.error("Ollama unreachable: %s", e)
                raise ValueError(f"Ollama unreachable: {e}") from e

        data = resp.json()
        raw = data.get("response", "").strip()
        if not raw:
            raise ValueError("Empty response from Ollama")

        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            logger.error("Non-JSON from Ollama: %s", raw[:300])
            raise ValueError(f"Invalid JSON from Ollama: {e}") from e

    # ==================================================
    # TEXT MODE — raw string (used by /api/v1/chat/text)
    # ==================================================
    async def generate_text(
        self,
        prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.5,
        num_predict: int = 800,
        keep_alive: str = "30m",
    ) -> str:
        """
        Like generate_json but NO JSON mode — returns raw text.
        """
        model = model or settings.OLLAMA_TEXT_MODEL

        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "keep_alive": keep_alive,
            "options": {
                "temperature": temperature,
                "num_predict": num_predict,
            },
        }

        client = await self._get_client()

        async with self._semaphore:
            try:
                resp = await client.post("/api/generate", json=payload)
                resp.raise_for_status()
            except httpx.ReadTimeout as e:
                logger.error("Ollama text timeout (model=%s)", model)
                raise ValueError(f"Ollama timed out after {self.timeout}s") from e
            except httpx.HTTPStatusError as e:
                logger.error(
                    "Ollama HTTP %s: %s", e.response.status_code, e.response.text[:200]
                )
                raise ValueError(f"Ollama HTTP error: {e.response.status_code}") from e
            except httpx.RequestError as e:
                logger.error("Ollama unreachable: %s", e)
                raise ValueError(f"Ollama unreachable: {e}") from e

        data = resp.json()
        raw = (data.get("response") or "").strip()
        if not raw:
            raise ValueError("Empty response from Ollama")
        return raw


ollama_service = OllamaService()