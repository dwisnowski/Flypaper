"""Proxy RainViewer public metadata (and optional tiles) for Safari CORS safety."""

from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, HTTPException, Response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/weather", tags=["weather"])

RAINVIEWER_MAPS = "https://api.rainviewer.com/public/weather-maps.json"


@router.get("/radar-maps")
def radar_maps() -> dict:
    try:
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            response = client.get(RAINVIEWER_MAPS)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        logger.warning("RainViewer maps fetch failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"RainViewer unreachable: {exc}") from exc


@router.get("/tile")
def proxy_tile(url: str) -> Response:
    """Optional tile proxy — only allow RainViewer tile hosts."""
    allowed = ("tilecache.rainviewer.com", "cdn.rainviewer.com", "api.rainviewer.com")
    if not any(host in url for host in allowed):
        raise HTTPException(status_code=400, detail="Host not allowed")
    if not url.startswith("https://"):
        raise HTTPException(status_code=400, detail="HTTPS required")
    try:
        with httpx.Client(timeout=30.0, follow_redirects=True) as client:
            response = client.get(url)
            response.raise_for_status()
            return Response(
                content=response.content,
                media_type=response.headers.get("content-type", "image/png"),
                headers={"Cache-Control": "public, max-age=300"},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
