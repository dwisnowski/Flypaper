"""LAN access helpers for QR / iPad pairing."""

from __future__ import annotations

import socket
from ipaddress import ip_address

from fastapi import APIRouter, Request

from app.config import get_settings

router = APIRouter(prefix="/network", tags=["network"])


def _is_private_ipv4(host: str) -> bool:
    try:
        addr = ip_address(host)
    except ValueError:
        return False
    return bool(addr.version == 4 and (addr.is_private or addr.is_loopback))


def discover_lan_ipv4() -> list[str]:
    """Best-effort list of non-loopback private IPv4 addresses on this machine."""
    found: list[str] = []

    # Primary: UDP connect trick (does not send packets) to learn the default route IP.
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            primary = sock.getsockname()[0]
            if _is_private_ipv4(primary) and primary not in ("127.0.0.1",):
                found.append(primary)
    except OSError:
        pass

    # Hostname resolution often lists additional interfaces.
    try:
        hostname = socket.gethostname()
        for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            ip = info[4][0]
            if _is_private_ipv4(ip) and ip != "127.0.0.1" and ip not in found:
                found.append(ip)
    except OSError:
        pass

    return found


@router.get("/access")
def network_access(request: Request) -> dict:
    """
    Return LAN URLs for scanning with a phone/iPad.

    Prefers the Vite frontend port (dev) so QR opens the SPA; path mirrors the
    current browser route when provided via ?path=.
    """
    settings = getattr(request.app.state, "settings", None) or get_settings()
    frontend_port = settings.frontend_port
    path = request.query_params.get("path") or "/"
    if not path.startswith("/"):
        path = "/" + path

    ips = discover_lan_ipv4()
    urls = [f"http://{ip}:{frontend_port}{path}" for ip in ips]
    preferred = urls[0] if urls else f"http://127.0.0.1:{frontend_port}{path}"

    return {
        "ips": ips,
        "frontend_port": frontend_port,
        "path": path,
        "preferred_url": preferred,
        "urls": urls or [preferred],
    }
