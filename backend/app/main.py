from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app import __version__
from app.config import get_settings
from app.opensky.enrich import AircraftEnricher
from app.routers.scan import router as scan_router
from app.routers.weather import router as weather_router
from app.routers.network import router as network_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("flypaper")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings
    # OpenSky client is built per request (browser headers or .env fallback).
    enricher = AircraftEnricher(settings)
    enricher.start_background_load()
    app.state.enricher = enricher
    logger.info(
        "Flypaper %s ready (home=%.4f,%.4f radius=%skm)",
        __version__,
        settings.home_lat,
        settings.home_lon,
        settings.default_radius_km,
    )
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Flypaper",
        description="OpenSky flight wall — spend a credit, see the sky",
        version=__version__,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(scan_router, prefix="/api")
    app.include_router(weather_router, prefix="/api")
    app.include_router(network_router, prefix="/api")

    dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    if dist.exists():
        assets = dist / "assets"
        if assets.exists():
            app.mount("/assets", StaticFiles(directory=assets), name="assets")

        @app.get("/{full_path:path}")
        async def spa_fallback(full_path: str):
            index = dist / "index.html"
            file_path = dist / full_path
            if full_path and file_path.is_file():
                return FileResponse(file_path)
            return FileResponse(index)

    return app


app = create_app()
