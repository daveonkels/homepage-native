"""Small, bounded, read-only Homepage API client."""
from __future__ import annotations

import asyncio
import json
from urllib.parse import urlsplit

from aiohttp import ClientError, ClientSession

from .catalog import InvalidCatalog, parse_catalog

MAX_RESPONSE_BYTES = 2 * 1024 * 1024


class CannotConnect(Exception):
    """The Homepage API cannot be reached."""


class AuthRequired(Exception):
    """The Homepage API requires authentication."""


async def fetch_catalog(session: ClientSession, url: str, api_url: str = "") -> list[dict]:
    """Fetch only the catalog. Never call widget proxies or individual services."""
    endpoint = (api_url or url).rstrip("/") + "/api/services"
    # An internal address may need the public Host header for Homepage's host allowlist.
    headers = {"Host": urlsplit(url).netloc} if api_url else None
    try:
        async with asyncio.timeout(15):
            async with session.get(endpoint, headers=headers, allow_redirects=False) as response:
                if response.status in (401, 403) or 300 <= response.status < 400:
                    raise AuthRequired
                if response.status != 200:
                    raise CannotConnect(f"Homepage returned HTTP {response.status}")
                chunks = bytearray()
                async for chunk in response.content.iter_chunked(65536):
                    chunks.extend(chunk)
                    if len(chunks) > MAX_RESPONSE_BYTES:
                        raise InvalidCatalog("Catalog response is too large")
                try:
                    payload = json.loads(chunks)
                except (ValueError, UnicodeError) as err:
                    raise InvalidCatalog("Homepage did not return JSON") from err
                return parse_catalog(payload, url)
    except (ClientError, TimeoutError) as err:
        # Never log raw responses or request headers.
        raise CannotConnect("Could not reach the Homepage API") from err
