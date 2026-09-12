from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    open_sky_client_id: str = ""
    open_sky_client_secret: str = ""
    open_sky_credentials_file: str | None = None

    home_lat: float = 37.7749
    home_lon: float = -122.4194
    default_radius_km: float = 150.0

    api_host: str = "0.0.0.0"
    api_port: int = 8000
    frontend_port: int = 5173
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    open_sky_api_base: str = "https://opensky-network.org/api"
    open_sky_token_url: str = (
        "https://auth.opensky-network.org/auth/realms/opensky-network/"
        "protocol/openid-connect/token"
    )

    aircraft_db_path: str = "backend/data/aircraftDatabase.csv"
    aircraft_db_url: str = (
        "https://opensky-network.org/datasets/metadata/aircraftDatabase.csv"
    )
    download_aircraft_db: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def credentials_path(self) -> Path | None:
        if not self.open_sky_credentials_file:
            return None
        path = Path(self.open_sky_credentials_file)
        if not path.is_absolute():
            path = ROOT_DIR / path
        return path if path.exists() else None

    @property
    def aircraft_db_file(self) -> Path:
        path = Path(self.aircraft_db_path)
        if not path.is_absolute():
            path = ROOT_DIR / path
        return path


@lru_cache
def get_settings() -> Settings:
    return Settings()
