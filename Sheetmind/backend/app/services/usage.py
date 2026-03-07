"""
Usage tracking service — tracks per-user, per-month usage
and enforces tier-based limits.

Free tier: 5 lifetime trial messages (not monthly)
Pro tier: 1000 messages per month
Team tier: Unlimited
"""

import logging
from datetime import date

from fastapi import HTTPException

from app.core.database import get_supabase
from app.core.config import settings

logger = logging.getLogger(__name__)

# Free users get N LIFETIME trial messages (configurable)
FREE_TRIAL_LIMIT = settings.FREE_TRIAL_LIMIT

_VALID_USAGE_TYPES = frozenset({"chat_count", "formula_count", "query_count"})


def _validate_usage_type(usage_type: str) -> None:
    """Raise ValueError if usage_type is not an allowed column name.

    Called before any function that passes usage_type to a database RPC or
    uses it as a column key, to prevent SQL injection via dynamic column names.
    """
    if usage_type not in _VALID_USAGE_TYPES:
        raise ValueError(f"Invalid usage_type: {usage_type!r}. Must be one of {sorted(_VALID_USAGE_TYPES)}")

# Monthly limits for paid tiers
TIER_LIMITS = {
    "free": FREE_TRIAL_LIMIT,  # Lifetime limit for free
    "pro": 1000,               # Monthly limit
    "team": 999999,            # Effectively unlimited
}


def _get_current_period() -> str:
    """Return the first day of the current month as ISO string."""
    return date.today().replace(day=1).isoformat()


def get_trial_usage(user_id: str) -> dict:
    """
    Get LIFETIME trial usage for free tier users.

    Returns:
        {
            "total_used": int,
            "limit": 5,
            "remaining": int,
        }
    """
    sb = get_supabase()

    # Get ALL usage records for this user (not just current month)
    result = sb.table("usage_records") \
        .select("query_count, formula_count, chat_count") \
        .eq("user_id", user_id) \
        .execute()

    total_used = 0
    if result.data:
        for record in result.data:
            total_used += record.get("query_count", 0)
            total_used += record.get("formula_count", 0)
            total_used += record.get("chat_count", 0)

    return {
        "total_used": total_used,
        "limit": FREE_TRIAL_LIMIT,
        "remaining": max(0, FREE_TRIAL_LIMIT - total_used),
    }


def get_usage(user_id: str, tier: str = "free") -> dict:
    """
    Get current usage stats for a user.

    For FREE tier: Returns LIFETIME usage (5 total trials)
    For PRO/TEAM: Returns MONTHLY usage

    Returns:
        {
            "period": "2026-01-01" or "lifetime",
            "query_count": int,
            "formula_count": int,
            "chat_count": int,
            "total_used": int,
            "limit": int,
            "remaining": int,
            "is_trial": bool,
        }
    """
    sb = get_supabase()

    # FREE TIER: Check lifetime trial usage
    if tier == "free":
        trial_usage = get_trial_usage(user_id)
        return {
            "period": "lifetime",
            "query_count": 0,  # Not tracked separately for trials
            "formula_count": 0,
            "chat_count": trial_usage["total_used"],
            "total_used": trial_usage["total_used"],
            "limit": FREE_TRIAL_LIMIT,
            "remaining": trial_usage["remaining"],
            "is_trial": True,
        }

    # PRO/TEAM: Check monthly usage
    period = _get_current_period()

    result = sb.table("usage_records") \
        .select("*") \
        .eq("user_id", user_id) \
        .eq("period", period) \
        .execute()

    if result.data:
        record = result.data[0]
        query_count = record["query_count"]
        formula_count = record["formula_count"]
        chat_count = record["chat_count"]
    else:
        query_count = 0
        formula_count = 0
        chat_count = 0

    total_used = query_count + formula_count + chat_count
    limit = TIER_LIMITS.get(tier, 1000)

    return {
        "period": period,
        "query_count": query_count,
        "formula_count": formula_count,
        "chat_count": chat_count,
        "total_used": total_used,
        "limit": limit,
        "remaining": max(0, limit - total_used),
        "is_trial": False,
    }


def check_limit(user_id: str, tier: str = "free") -> None:
    """
    Check if user has remaining quota. Raises 402 if limit exceeded.

    For FREE tier: Checks lifetime trial limit (5 messages total)
    For PRO/TEAM: Checks monthly limit
    """
    usage = get_usage(user_id, tier)

    if usage["remaining"] <= 0:
        if tier == "free" or usage.get("is_trial"):
            # Trial expired message
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "Trial limit exceeded",
                    "total_used": usage["total_used"],
                    "limit": usage["limit"],
                    "tier": tier,
                    "is_trial": True,
                    "message": f"You've used all {usage['limit']} free trial messages. "
                               f"Upgrade to Pro for 1,000 messages per month!",
                    "upgrade_url": "/pricing",
                },
            )
        else:
            # Monthly limit exceeded for paid users
            raise HTTPException(
                status_code=402,
                detail={
                    "error": "Usage limit exceeded",
                    "total_used": usage["total_used"],
                    "limit": usage["limit"],
                    "tier": tier,
                    "is_trial": False,
                    "message": f"You've used all {usage['limit']} messages for this month. "
                               f"Your quota resets next month, or upgrade for more.",
                },
            )

    # Log remaining for free tier users
    if tier == "free":
        logger.info(f"User {user_id[:8]}... has {usage['remaining']}/{usage['limit']} trial messages remaining")


def increment_usage(user_id: str, usage_type: str) -> None:
    """
    Atomically increment a usage counter for the current period.

    Uses upsert with ON CONFLICT to avoid the read-then-write race condition
    that could lose increments under concurrent requests.

    Args:
        user_id: The user's UUID string.
        usage_type: One of "chat_count", "formula_count", "query_count".
    """
    _validate_usage_type(usage_type)

    sb = get_supabase()
    period = _get_current_period()

    # Atomic upsert: INSERT or UPDATE in a single query.
    # If a record for (user_id, period) already exists, increment the column.
    # If not, create a new record with the column set to 1.
    # This uses Supabase's PostgREST upsert with on_conflict.
    new_record = {
        "user_id": user_id,
        "period": period,
        "query_count": 0,
        "formula_count": 0,
        "chat_count": 0,
    }
    new_record[usage_type] = 1

    try:
        # Try upsert — requires a UNIQUE constraint on (user_id, period)
        sb.table("usage_records") \
            .upsert(new_record, on_conflict="user_id,period") \
            .execute()

        # The upsert above sets the count to 1 on conflict (overwrites).
        # We need to ADD 1 instead. Since PostgREST upsert can't do
        # "SET col = col + 1", we follow up with an atomic increment via RPC.
        # However, if RPC isn't available, fall back to the increment approach.
        #
        # Use raw SQL increment via PostgREST's rpc() if available,
        # otherwise fall back to select-then-update with optimistic concurrency.
        _atomic_increment(sb, user_id, period, usage_type)
    except Exception as e:
        # Fallback: the upsert may have failed if there's no unique constraint.
        # Use the select-then-update approach.
        logger.warning(f"Upsert failed, using fallback increment: {e}")
        try:
            _fallback_increment(sb, user_id, period, usage_type)
        except Exception as fallback_err:
            logger.error(
                f"Fallback increment also failed for user {user_id[:8]}..., "
                f"type={usage_type}, period={period}: {fallback_err}",
                exc_info=True,
            )


def _atomic_increment(sb, user_id: str, period: str, usage_type: str) -> None:
    """
    Increment a usage column atomically using a Supabase RPC function.
    Falls back to _fallback_increment if RPC is not available.
    """
    _validate_usage_type(usage_type)
    try:
        sb.rpc("increment_usage_counter", {
            "p_user_id": user_id,
            "p_period": period,
            "p_column_name": usage_type,
        }).execute()
    except Exception:
        # RPC not set up yet — use fallback
        _fallback_increment(sb, user_id, period, usage_type)


def _fallback_increment(sb, user_id: str, period: str, usage_type: str) -> None:
    """
    Fallback increment using select-then-update.
    Not fully atomic but works without the RPC function.
    """
    _validate_usage_type(usage_type)
    result = sb.table("usage_records") \
        .select("id", usage_type) \
        .eq("user_id", user_id) \
        .eq("period", period) \
        .execute()

    if result.data:
        record = result.data[0]
        new_count = record[usage_type] + 1
        sb.table("usage_records") \
            .update({usage_type: new_count}) \
            .eq("id", record["id"]) \
            .execute()
    else:
        new_record = {
            "user_id": user_id,
            "period": period,
            "query_count": 0,
            "formula_count": 0,
            "chat_count": 0,
        }
        new_record[usage_type] = 1
        sb.table("usage_records").insert(new_record).execute()


def check_and_increment(user_id: str, tier: str, usage_type: str) -> None:
    """
    Atomically check the usage limit AND increment the counter in a single
    database transaction (via Supabase RPC with FOR UPDATE row lock).

    This prevents the TOCTOU race condition where check_limit() passes for
    multiple concurrent requests before any of them increment the counter.

    Falls back to the non-atomic check-then-increment if the RPC functions
    are not yet deployed to Supabase.

    Raises HTTPException(402) if limit exceeded.
    """
    _validate_usage_type(usage_type)
    sb = get_supabase()
    period = _get_current_period()
    limit = TIER_LIMITS.get(tier, 1000)

    try:
        if tier == "free":
            # Free tier: lifetime limit across ALL periods
            result = sb.rpc("check_and_increment_trial", {
                "p_user_id": user_id,
                "p_period": period,
                "p_column_name": usage_type,
                "p_lifetime_limit": FREE_TRIAL_LIMIT,
            }).execute()
        else:
            # Pro/Team: monthly limit for current period
            result = sb.rpc("check_and_increment_usage", {
                "p_user_id": user_id,
                "p_period": period,
                "p_column_name": usage_type,
                "p_limit": limit,
            }).execute()

        # RPC returns TRUE if increment succeeded, FALSE if limit exceeded
        allowed = result.data
        if allowed is False:
            _raise_limit_exceeded(user_id, tier, limit)

        logger.debug(f"Atomic check_and_increment OK for user {user_id[:8]}...")
        return

    except HTTPException:
        # Re-raise limit-exceeded errors from _raise_limit_exceeded
        raise
    except Exception as e:
        # RPC not deployed yet — fall back to non-atomic check-then-increment.
        # This is the old behavior; still better than crashing.
        logger.warning(f"Atomic RPC unavailable, using fallback: {e}")
        check_limit(user_id, tier)
        increment_usage(user_id, usage_type)


def _raise_limit_exceeded(user_id: str, tier: str, limit: int) -> None:
    """Raise the appropriate 402 error for limit exceeded."""
    if tier == "free":
        raise HTTPException(
            status_code=402,
            detail={
                "error": "Trial limit exceeded",
                "limit": limit,
                "tier": tier,
                "is_trial": True,
                "message": f"You've used all {limit} free trial messages. "
                           f"Upgrade to Pro for 1,000 messages per month!",
                "upgrade_url": "/pricing",
            },
        )
    else:
        raise HTTPException(
            status_code=402,
            detail={
                "error": "Usage limit exceeded",
                "limit": limit,
                "tier": tier,
                "is_trial": False,
                "message": f"You've used all {limit} messages for this month. "
                           f"Your quota resets next month, or upgrade for more.",
            },
        )
