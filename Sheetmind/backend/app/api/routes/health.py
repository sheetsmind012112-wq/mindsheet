import asyncio
import logging
import time

from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse
from typing import Optional

from app.core.config import settings
from app.core.database import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter()

# Per-check timeout (seconds) — if a single check exceeds this, mark it degraded
_CHECK_TIMEOUT = 3


@router.api_route("/health", methods=["GET", "HEAD"])
async def health_check():
    return {
        "status": "healthy",
        "service": "SheetMind API",
        "version": "0.1.0",
        "environment": settings.APP_ENV,
    }


def _check_supabase() -> str:
    """Synchronous Supabase connectivity check (runs in thread pool)."""
    sb = get_supabase()
    sb.table("users").select("id").limit(1).execute()
    return "connected"


def _check_redis() -> str:
    """Synchronous Redis connectivity check (runs in thread pool)."""
    from app.services.rate_limiter import _get_redis
    r = _get_redis()
    if r and r.ping():
        return "connected"
    return "unavailable"


@router.api_route("/health/db", methods=["GET", "HEAD"])
async def health_check_db(x_health_key: Optional[str] = Header(default=None)):
    """Check Supabase and Redis connectivity. Returns 503 if any critical service is down.

    In production, requires X-Health-Key header matching HEALTH_CHECK_KEY env var.
    Without the key, returns only status (no internal details).
    """
    is_prod = settings.APP_ENV == "production"
    health_key = getattr(settings, "HEALTH_CHECK_KEY", "")
    authorized = not is_prod or (health_key and x_health_key == health_key)
    checks: dict = {}
    healthy = True
    start = time.time()
    loop = asyncio.get_event_loop()

    # Check Supabase with hard timeout
    try:
        result = await asyncio.wait_for(
            loop.run_in_executor(None, _check_supabase),
            timeout=_CHECK_TIMEOUT,
        )
        checks["database"] = result
    except asyncio.TimeoutError:
        logger.warning(f"Health check — Supabase timed out after {_CHECK_TIMEOUT}s")
        checks["database"] = "timeout"
        healthy = False
    except Exception as e:
        logger.warning(f"Health check — Supabase failed: {e}")
        checks["database"] = "unavailable"
        healthy = False

    # Check Redis with hard timeout
    try:
        result = await asyncio.wait_for(
            loop.run_in_executor(None, _check_redis),
            timeout=_CHECK_TIMEOUT,
        )
        checks["redis"] = result
        if result != "connected":
            # Redis unavailable but not a hard failure
            pass
    except asyncio.TimeoutError:
        logger.warning(f"Health check — Redis timed out after {_CHECK_TIMEOUT}s")
        checks["redis"] = "timeout"
    except Exception as e:
        logger.warning(f"Health check — Redis failed: {e}")
        checks["redis"] = "unavailable"

    elapsed_ms = int((time.time() - start) * 1000)

    status = "healthy" if healthy else "degraded"
    status_code = 200 if healthy else 503

    # Only return internal details to authorized callers
    content: dict = {"status": status}
    if authorized:
        content["checks"] = checks
        content["elapsed_ms"] = elapsed_ms

    return JSONResponse(status_code=status_code, content=content)
