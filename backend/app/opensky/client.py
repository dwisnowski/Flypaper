"""OpenSky OAuth2 client and state-vector / track fetcher."""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import httpx
from starlette.requests import Request

from app.config import Settings

logger = logging.getLogger(__name__)

TOKEN_REFRESH_MARGIN_S = 30

HEADER_CLIENT_ID = "X-OpenSky-Client-Id"
HEADER_CLIENT_SECRET = "X-OpenSky-Client-Secret"

CreditBucket = Literal["states", "tracks", "flights"]

# Access tokens keyed by OpenSky client_id (never log secrets).
_token_by_client: dict[str, tuple[str, datetime]] = {}

_last_credits: dict[CreditBucket, int | None] = {
    "states": None,
    "tracks": None,
    "flights": None,
}
_last_credits_at: dict[CreditBucket, float | None] = {
    "states": None,
    "tracks": None,
    "flights": None,
}


@dataclass
class ApiResult:
    payload: Any
    credits_remaining: int | None
    status_code: int
    raw_headers: dict[str, str]


@dataclass
class StatesResult:
    states: list[list[Any]]
    time: int | None
    credits_remaining: int | None
    raw_headers: dict[str, str]


@dataclass
class TrackResult:
    icao24: str
    start_time: int | None
    end_time: int | None
    callsign: str | None
    path: list[list[Any]]
    credits_remaining: int | None


class OpenSkyRateLimitError(Exception):
    def __init__(
        self,
        message: str,
        *,
        retry_after_seconds: int | None = None,
        credits_remaining: int | None = None,
        bucket: CreditBucket = "states",
    ) -> None:
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds
        self.credits_remaining = credits_remaining
        self.bucket = bucket



class CredentialsMissingError(Exception):
    """No browser headers and no server .env / credentials file."""


def resolve_server_credentials(settings: Settings) -> tuple[str, str] | None:
    """Return (client_id, client_secret) from env / credentials file, or None."""
    client_id = (settings.open_sky_client_id or "").strip()
    client_secret = (settings.open_sky_client_secret or "").strip()

    cred_path = settings.credentials_path
    if cred_path is not None:
        try:
            data = json.loads(cred_path.read_text(encoding="utf-8"))
            client_id = (
                data.get("clientId") or data.get("client_id") or client_id or ""
            ).strip()
            client_secret = (
                data.get("clientSecret") or data.get("client_secret") or client_secret or ""
            ).strip()
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning("Could not read credentials file %s: %s", cred_path, exc)

    if client_id and client_secret:
        return client_id, client_secret
    return None


def server_opensky_configured(settings: Settings) -> bool:
    return resolve_server_credentials(settings) is not None


def credentials_from_request(request: Request) -> tuple[str, str] | None:
    client_id = (request.headers.get(HEADER_CLIENT_ID) or "").strip()
    client_secret = (request.headers.get(HEADER_CLIENT_SECRET) or "").strip()
    if client_id and client_secret:
        return client_id, client_secret
    return None


def resolve_request_credentials(
    request: Request, settings: Settings
) -> tuple[str, str]:
    """Prefer per-request browser headers; fall back to server .env."""
    header_creds = credentials_from_request(request)
    if header_creds is not None:
        return header_creds
    server = resolve_server_credentials(settings)
    if server is not None:
        return server
    raise CredentialsMissingError(
        "OpenSky credentials missing. Enter your API client id and secret in the "
        "app (stored in this browser), or set OPEN_SKY_CLIENT_ID / "
        "OPEN_SKY_CLIENT_SECRET locally in .env."
    )


class TokenManager:
    def __init__(self, settings: Settings, client_id: str, client_secret: str) -> None:
        self._settings = settings
        self._client_id = client_id
        self._client_secret = client_secret

    def get_token(self) -> str:
        cached = _token_by_client.get(self._client_id)
        if cached is not None:
            token, expires_at = cached
            if datetime.now(timezone.utc) < expires_at:
                return token
        return self._refresh()

    def _refresh(self) -> str:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                self._settings.open_sky_token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self._client_id,
                    "client_secret": self._client_secret,
                },
            )
            if response.status_code in (400, 401, 403):
                raise CredentialsMissingError(
                    "OpenSky rejected these API credentials. Check your client id "
                    "and secret."
                )
            response.raise_for_status()
            data = response.json()

        token = data["access_token"]
        expires_in = int(data.get("expires_in", 1800))
        expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=max(expires_in - TOKEN_REFRESH_MARGIN_S, 60)
        )
        _token_by_client[self._client_id] = (token, expires_at)
        logger.info(
            "OpenSky access token refreshed for client_id=%s… (expires in %ss)",
            self._client_id[:8],
            expires_in,
        )
        return token

    def auth_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.get_token()}"}

    def invalidate(self) -> None:
        _token_by_client.pop(self._client_id, None)


class OpenSkyClient:
    def __init__(self, settings: Settings, client_id: str, client_secret: str) -> None:
        self._settings = settings
        self._tokens = TokenManager(settings, client_id, client_secret)

    @classmethod
    def from_request(cls, request: Request, settings: Settings) -> OpenSkyClient:
        client_id, client_secret = resolve_request_credentials(request, settings)
        return cls(settings, client_id, client_secret)

    def _request(
        self,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        bucket: CreditBucket = "states",
        allow_404: bool = False,
    ) -> ApiResult:
        url = f"{self._settings.open_sky_api_base.rstrip('/')}{path}"
        headers = self._tokens.auth_headers()

        with httpx.Client(timeout=60.0) as client:
            response = client.get(url, params=params, headers=headers)
            if response.status_code == 401:
                self._tokens.invalidate()
                headers = self._tokens.auth_headers()
                response = client.get(url, params=params, headers=headers)

            if response.status_code == 429:
                retry_after = response.headers.get("X-Rate-Limit-Retry-After-Seconds")
                remember_credits(0, bucket=bucket)
                raise OpenSkyRateLimitError(
                    f"OpenSky {bucket} rate limit exceeded. Retry after {retry_after}s.",
                    retry_after_seconds=int(retry_after) if retry_after else None,
                    credits_remaining=0,
                    bucket=bucket,
                )

            if allow_404 and response.status_code == 404:
                remaining_raw = response.headers.get("X-Rate-Limit-Remaining")
                credits_remaining = int(remaining_raw) if remaining_raw is not None else None
                remember_credits(credits_remaining, bucket=bucket)
                return ApiResult(
                    payload=None,
                    credits_remaining=credits_remaining,
                    status_code=404,
                    raw_headers={k: v for k, v in response.headers.items()},
                )

            response.raise_for_status()
            payload = response.json() if response.content else None

        remaining_raw = response.headers.get("X-Rate-Limit-Remaining")
        credits_remaining = int(remaining_raw) if remaining_raw is not None else None
        remember_credits(credits_remaining, bucket=bucket)

        return ApiResult(
            payload=payload,
            credits_remaining=credits_remaining,
            status_code=response.status_code,
            raw_headers={k: v for k, v in response.headers.items()},
        )

    def get_states_in_bbox(
        self,
        lamin: float,
        lamax: float,
        lomin: float,
        lomax: float,
        *,
        extended: bool = True,
    ) -> StatesResult:
        params: dict[str, Any] = {
            "lamin": lamin,
            "lamax": lamax,
            "lomin": lomin,
            "lomax": lomax,
        }
        if extended:
            params["extended"] = 1

        result = self._request("/states/all", params=params, bucket="states")
        payload = result.payload or {}
        states = payload.get("states") or []
        return StatesResult(
            states=states,
            time=payload.get("time"),
            credits_remaining=result.credits_remaining,
            raw_headers=result.raw_headers,
        )

    def get_track(self, icao24: str, *, time_secs: int = 0) -> TrackResult | None:
        """Live/historical trajectory. time_secs=0 requests the live track if any."""
        result = self._request(
            "/tracks/all",
            params={"icao24": icao24.lower(), "time": int(time_secs)},
            bucket="tracks",
            allow_404=True,
        )
        if result.status_code == 404 or not result.payload:
            return None

        payload = result.payload
        callsign = payload.get("callsign") or payload.get("calllsign")
        if isinstance(callsign, str):
            callsign = callsign.strip() or None

        return TrackResult(
            icao24=str(payload.get("icao24") or icao24).lower(),
            start_time=payload.get("startTime"),
            end_time=payload.get("endTime"),
            callsign=callsign,
            path=payload.get("path") or [],
            credits_remaining=result.credits_remaining,
        )


def remember_credits(remaining: int | None, *, bucket: CreditBucket = "states") -> None:
    if remaining is not None:
        _last_credits[bucket] = remaining
        _last_credits_at[bucket] = time.time()


def get_remembered_credits(
    bucket: CreditBucket = "states",
) -> tuple[int | None, float | None]:
    return _last_credits.get(bucket), _last_credits_at.get(bucket)
