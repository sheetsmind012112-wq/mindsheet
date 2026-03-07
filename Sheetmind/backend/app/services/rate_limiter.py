"""
Rate limiter — per-user, per-minute request limiting using Redis.
Falls back to an in-process sliding window counter when Redis is unavailable.

Tier limits:
  - Free: 5 requests/minute
  - Pro: 20 requests/minute
  - Team: 50 requests/minute

Fallback behaviour (Redis down):
  An in-process counter is used instead of failing open.
  With multiple workers the effective limit is (limit × workers), but that
  is far safer than unlimited access.
"""

import time
import threading
import logging

import redis

from app.core.config import settings

logger = logging.getLogger(__name__)

RATE_LIMITS = {
    "free": 5,
    "pro": 20,
    "team": 50,
}

WINDOW_SECONDS = 60
_REDIS_RETRY_INTERVAL = 60  # seconds before retrying a failed Redis connection

_redis_client: redis.Redis | None = None
_redis_last_fail: float = 0
_redis_down_since: float = 0  # tracks when Redis first went down


def _get_redis() -> redis.Redis | None:
    """Get Redis client, returning None if Redis is unavailable.

    Skips retries for _REDIS_RETRY_INTERVAL seconds after a failure to avoid
    adding connection-timeout latency to every request.
    """
    global _redis_client, _redis_last_fail, _redis_down_since

    if _redis_client is not None:
        return _redis_client

    if _redis_last_fail and (time.time() - _redis_last_fail) < _REDIS_RETRY_INTERVAL:
        return None

    try:
        client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=1,
            socket_timeout=1,
            max_connections=50,
        )
        client.ping()
        _redis_client = client
        _redis_last_fail = 0
        if _redis_down_since:
            downtime = int(time.time() - _redis_down_since)
            logger.info(f"Redis rate-limiter recovered after {downtime}s — switching back from in-process fallback")
            _redis_down_since = 0
        return _redis_client
    except Exception as e:
        _redis_last_fail = time.time()
        if not _redis_down_since:
            _redis_down_since = time.time()
            logger.error(f"Redis rate-limiter DOWN — switching to in-process fallback: {e}")
        elif time.time() - _redis_down_since > 300:
            logger.error(f"Redis rate-limiter still DOWN for {int(time.time() - _redis_down_since)}s — using in-process fallback")
        return None


# ---------------------------------------------------------------------------
# In-process fallback counters (used when Redis is unavailable)
# ---------------------------------------------------------------------------
# Structure: {key: [count, window_index]}
# window_index = int(time.time()) // WINDOW_SECONDS — changes each minute.

_fallback_lock = threading.Lock()
_fallback_counters: dict[str, list] = {}  # {key: [count, window_index]}
_fallback_last_cleanup: float = 0
_FALLBACK_CLEANUP_INTERVAL = 120  # clean expired entries every 2 minutes


def _fallback_cleanup() -> None:
    """Remove counters from expired windows (called under _fallback_lock)."""
    global _fallback_last_cleanup
    now = time.time()
    if now - _fallback_last_cleanup < _FALLBACK_CLEANUP_INTERVAL:
        return
    current_window = int(now) // WINDOW_SECONDS
    expired_keys = [k for k, v in _fallback_counters.items() if v[1] < current_window]
    for k in expired_keys:
        del _fallback_counters[k]
    _fallback_last_cleanup = now


def _fallback_check(key: str, limit: int) -> dict:
    """
    Increment and check an in-process sliding window counter.

    Not shared across Uvicorn workers — provides per-worker rate limiting.
    With N workers a user can make up to (limit × N) requests per minute,
    which is still a finite bound (much better than unlimited).
    """
    with _fallback_lock:
        _fallback_cleanup()
        current_window = int(time.time()) // WINDOW_SECONDS
        entry = _fallback_counters.get(key)

        if entry is None or entry[1] != current_window:
            _fallback_counters[key] = [1, current_window]
            count = 1
        else:
            entry[0] += 1
            count = entry[0]

    remaining = max(0, limit - count)
    allowed = count <= limit
    retry_after = WINDOW_SECONDS if not allowed else None

    return {
        "allowed": allowed,
        "limit": limit,
        "remaining": remaining,
        "retry_after": retry_after,
    }


# ---------------------------------------------------------------------------
# Public API — per-user rate limiting
# ---------------------------------------------------------------------------

def check_rate_limit(user_id: str, tier: str = "free") -> dict:
    """
    Check if the user is within their per-minute rate limit.

    Returns:
        {
            "allowed": bool,
            "limit": int,
            "remaining": int,
            "retry_after": int | None,  # seconds until window resets
        }
    """
    limit = RATE_LIMITS.get(tier, 5)
    key = f"rate:{user_id}:{int(time.time()) // WINDOW_SECONDS}"

    r = _get_redis()
    if r is None:
        return _fallback_check(key, limit)

    try:
        pipe = r.pipeline()
        pipe.incr(key)
        pipe.expire(key, WINDOW_SECONDS)
        results = pipe.execute()

        current_count = results[0]
        remaining = max(0, limit - current_count)
        allowed = current_count <= limit

        retry_after = None
        if not allowed:
            ttl = r.ttl(key)
            retry_after = ttl if ttl > 0 else WINDOW_SECONDS

        return {
            "allowed": allowed,
            "limit": limit,
            "remaining": remaining,
            "retry_after": retry_after,
        }
    except redis.exceptions.ConnectionError as e:
        global _redis_client, _redis_last_fail
        _redis_client = None
        _redis_last_fail = time.time()
        logger.warning(f"Rate limit Redis connection lost, switching to fallback: {e}")
        return _fallback_check(key, limit)
    except Exception as e:
        logger.warning(f"Rate limit Redis error, switching to fallback: {e}")
        return _fallback_check(key, limit)


# ---------------------------------------------------------------------------
# Public API — IP-based rate limiting for auth endpoints
# ---------------------------------------------------------------------------

AUTH_RATE_LIMITS = {
    "signup": 5,      # 5 signups per IP per minute
    "signin": 10,     # 10 login attempts per IP per minute
    "refresh": 30,    # 30 refreshes per IP per minute
    "callback": 10,   # 10 OAuth callbacks per IP per minute
}


def check_rate_limit_by_ip(ip: str, action: str = "signin") -> dict:
    """
    IP-based rate limiting for auth endpoints.

    Returns:
        {
            "allowed": bool,
            "limit": int,
            "remaining": int,
            "retry_after": int | None,
        }
    """
    limit = AUTH_RATE_LIMITS.get(action, 10)
    key = f"auth_rate:{action}:{ip}:{int(time.time()) // WINDOW_SECONDS}"

    r = _get_redis()
    if r is None:
        return _fallback_check(key, limit)

    try:
        pipe = r.pipeline()
        pipe.incr(key)
        pipe.expire(key, WINDOW_SECONDS)
        results = pipe.execute()

        current_count = results[0]
        remaining = max(0, limit - current_count)
        allowed = current_count <= limit

        retry_after = None
        if not allowed:
            ttl = r.ttl(key)
            retry_after = ttl if ttl > 0 else WINDOW_SECONDS

        return {
            "allowed": allowed,
            "limit": limit,
            "remaining": remaining,
            "retry_after": retry_after,
        }
    except redis.exceptions.ConnectionError as e:
        global _redis_client, _redis_last_fail  # noqa: F811
        _redis_client = None
        _redis_last_fail = time.time()
        logger.warning(f"Auth rate limit Redis connection lost, switching to fallback: {e}")
        return _fallback_check(key, limit)
    except Exception as e:
        logger.warning(f"Auth rate limit Redis error, switching to fallback: {e}")
        return _fallback_check(key, limit)
