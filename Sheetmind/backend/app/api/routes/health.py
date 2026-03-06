import asyncio
import logging
import time
from functools import partial

from fastapi import APIRouter
from fastapi.responses import JSONResponse

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
async def health_check_db():
    """Check Supabase and Redis connectivity. Returns 503 if any critical service is down."""
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

    return JSONResponse(
        status_code=status_code,
        content={
            "status": status,
            "checks": checks,
            "elapsed_ms": elapsed_ms,
        },
    )
