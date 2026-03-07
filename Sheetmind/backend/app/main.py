import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from api_analytics.fastapi import Analytics

from app.core.config import settings
from app.api.router import api_router

# Configure logging to show INFO level
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warm up external connections at startup to avoid cold-start latency."""
    # Set default thread pool for run_in_executor(None, ...) calls (auth, DB).
    # Default asyncio pool is min(32, cpu+4) which may bottleneck at 100 users.
    loop = asyncio.get_event_loop()
    default_executor = ThreadPoolExecutor(
        max_workers=settings.THREAD_POOL_SIZE,
        thread_name_prefix="sheetmind-io",
    )
    loop.set_default_executor(default_executor)
    logger.info(f"Default thread pool: {settings.THREAD_POOL_SIZE} workers")

    # Warm Supabase connection + HTTP pool across key tables
    try:
        from app.core.database import get_supabase
        sb = get_supabase()
        for table in ("users", "conversations", "messages", "usage_records"):
            sb.table(table).select("id").limit(1).execute()
        logger.info("Supabase client warmed up")
    except Exception as e:
        logger.warning(f"Supabase warm-up failed: {e}")

    # Attempt Redis connection (will set cooldown if unavailable)
    try:
        from app.services.cache import _get_redis
        _get_redis()
    except Exception:
        pass

    yield

    # Shutdown: clean up thread pools
    default_executor.shutdown(wait=False)
    try:
        from app.api.routes.chat import _bg_executor
        _bg_executor.shutdown(wait=False)
    except Exception:
        pass


_is_prod = settings.APP_ENV == "production"

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered Google Sheets & Excel add-on with confidence scores and source linking",
    version="0.1.0",
    lifespan=lifespan,
    # Disable interactive API docs in production — they expose all endpoints
    # and request schemas publicly. Enable locally via APP_ENV=development.
    docs_url=None if _is_prod else "/docs",
    redoc_url=None if _is_prod else "/redoc",
    openapi_url=None if _is_prod else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    # Only match Google Apps Script sandbox domains, not all of googleusercontent.com
    # (which also hosts user-uploaded content like Drive previews, Blogger images, etc.)
    allow_origin_regex=r"https://n-[a-z0-9-]+-script\.googleusercontent\.com",
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Security headers middleware — hardens responses against common attacks
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if settings.APP_ENV == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# API Analytics — free latency dashboard at https://www.apianalytics.dev
if settings.API_ANALYTICS_KEY:
    app.add_middleware(Analytics, api_key=settings.API_ANALYTICS_KEY)

app.include_router(api_router, prefix=settings.API_PREFIX)
