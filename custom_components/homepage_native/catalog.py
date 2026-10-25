"""Validate and reduce Homepage data to a credential-free launcher catalog."""
from __future__ import annotations

import re
from urllib.parse import urljoin, urlsplit, urlunsplit


class InvalidCatalog(ValueError):
    """Homepage returned something other than a service catalog."""


def normalize_url(value: str) -> str:
    """Require a plain HTTP(S) base URL with no embedded credentials."""
    if not isinstance(value, str):
        raise ValueError("Expected a URL")
    parts = urlsplit(value.strip())
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise ValueError("Expected an http:// or https:// URL")
    if parts.username or parts.password or parts.query or parts.fragment:
        raise ValueError("Do not include credentials, query parameters, or fragments")
    try:
        parts.port
    except ValueError as err:
        raise ValueError("Invalid port") from err
    return urlunsplit((parts.scheme, parts.netloc.lower(), parts.path.rstrip("/"), "", ""))


def safe_link(value: object, base: str) -> str | None:
    """Resolve relative paths; reject executable schemes and userinfo."""
    if not isinstance(value, str) or not value.strip():
        return None
    if any(ord(c) < 32 for c in value) or "\\" in value:
        return None
    target = urljoin(base + "/", value.strip())
    try:
        parts = urlsplit(target)
        if parts.scheme not in ("http", "https") or not parts.hostname:
            return None
        if parts.username or parts.password:
            return None
        parts.port
    except ValueError:
        return None
    return target


def resolve_icon(value: object, base: str) -> dict[str, str]:
    """Translate Homepage icon identifiers into HA icons or image URLs."""
    fallback = {"icon": "mdi:application-outline"}
    if not isinstance(value, str) or not value:
        return fallback
    mdi = re.fullmatch(r"mdi[:-]([a-z0-9-]+?)(?:-#[0-9a-fA-F]{6})?", value)
    if mdi:
        return {"icon": "mdi:" + mdi.group(1)}
    if value.startswith(("https://", "http://", "/", "./")):
        target = safe_link(value, base)
        return {"image": target} if target else fallback
    simple = re.fullmatch(r"si-([a-z0-9-]+?)(?:-#[0-9a-fA-F]{6})?", value)
    if simple:
        return {"image": f"https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/{simple.group(1)}.svg"}
    selfhst = re.fullmatch(r"sh-([a-zA-Z0-9_-]+)(?:\.(svg|png|webp))?", value)
    if selfhst:
        name, extension = selfhst.group(1), selfhst.group(2) or "svg"
        return {"image": f"https://cdn.jsdelivr.net/gh/selfhst/icons/{extension}/{name}.{extension}"}
    dashboard = re.fullmatch(r"([a-zA-Z0-9_-]+)(?:\.(svg|png|webp))?", value)
    if dashboard:
        name, extension = dashboard.group(1), dashboard.group(2) or "png"
        return {"image": f"https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/{extension}/{name}.{extension}"}
    return fallback


def parse_catalog(payload: object, base: str) -> list[dict]:
    """Whitelist display fields; never retain widgets, credentials or raw API data."""
    if not isinstance(payload, list):
        raise InvalidCatalog("Expected an array of Homepage service groups")
    groups: list[dict] = []
    total = 0

    def visit(items: list, parents: tuple[str, ...] = (), depth: int = 0) -> None:
        nonlocal total
        if depth > 8:
            raise InvalidCatalog("Too many nested groups")
        for item in items:
            if not isinstance(item, dict) or not isinstance(item.get("name"), str):
                raise InvalidCatalog("Invalid service group")
            raw_services = item.get("services", [])
            children = item.get("groups", [])
            if not isinstance(raw_services, list) or not isinstance(children, list):
                raise InvalidCatalog("Invalid service group contents")
            path = (*parents, item["name"][:200])
            services = []
            for raw in raw_services:
                if not isinstance(raw, dict) or not isinstance(raw.get("name"), str):
                    raise InvalidCatalog("Invalid service")
                total += 1
                if total > 2000:
                    raise InvalidCatalog("Catalog exceeds 2000 services")
                service = {
                    "name": raw["name"][:200],
                    "description": str(raw.get("description") or "")[:1000],
                    "url": safe_link(raw.get("href"), base) or base,
                    **resolve_icon(raw.get("icon"), base),
                }
                services.append(service)
            if services:
                groups.append({"name": " / ".join(path), "services": services})
            visit(children, path, depth + 1)
    visit(payload)
    return groups
