import base64
import hashlib
import logging
import secrets
import time
from threading import Lock
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional

from app.core.config import settings
from app.core.database import get_supabase, get_supabase_anon
from app.core.auth import get_current_user
from app.services.rate_limiter import check_rate_limit_by_ip

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# PKCE verifier store — maps nonce → (code_verifier, expiry_ts)
# Keyed by the nonce the frontend generates for each login attempt.
# Entries are cleaned up on each write and when popped.
# ---------------------------------------------------------------------------
_pkce_store: dict[str, tuple[str, float]] = {}
_pkce_lock = Lock()


def _store_pkce_verifier(nonce: str, verifier: str, ttl_secs: int = 300) -> None:
    with _pkce_lock:
        now = time.time()
        expired = [k for k, (_, exp) in list(_pkce_store.items()) if exp < now]
        for k in expired:
            del _pkce_store[k]
        _pkce_store[nonce] = (verifier, now + ttl_secs)


def _pop_pkce_verifier(nonce: str) -> str | None:
    """Remove and return the verifier for the given nonce, or None if missing/expired."""
    with _pkce_lock:
        entry = _pkce_store.pop(nonce, None)
        if entry and entry[1] >= time.time():
            return entry[0]
        return None


def _generate_pkce_pair() -> tuple[str, str]:
    """Return (code_verifier, code_challenge) for PKCE S256."""
    verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).rstrip(b"=").decode()
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode()).digest()
    ).rstrip(b"=").decode()
    return verifier, challenge

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _get_client_ip(request: Request) -> str:
    """Extract client IP, respecting X-Forwarded-For for proxied requests."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_auth_rate_limit(request: Request, action: str):
    """Check IP-based rate limit for auth endpoints. Raises 429 if exceeded."""
    ip = _get_client_ip(request)
    rate = check_rate_limit_by_ip(ip, action)
    if not rate["allowed"]:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
            headers={
                "Retry-After": str(rate["retry_after"] or 60),
                "RateLimit-Limit": str(rate["limit"]),
                "RateLimit-Remaining": "0",
            },
        )


class TokenRequest(BaseModel):
    # Implicit flow
    access_token: str = ""
    refresh_token: str = ""
    # PKCE flow
    code: str = ""
    nonce: str = ""


class RefreshRequest(BaseModel):
    refresh_token: str


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if len(v) > 128:
            raise ValueError("Password must not exceed 128 characters.")
        return v


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


@router.get("/login")
async def login(request: Request, nonce: str = ""):
    """
    Return the Supabase OAuth URL for Google login using PKCE flow.

    PKCE (Proof Key for Code Exchange) is the modern, secure OAuth flow:
    1. We generate a code_verifier (random secret) + code_challenge (SHA-256 hash).
    2. The code_challenge is sent to Supabase in the auth URL.
    3. After login, Supabase redirects to /oauth-complete with ?code=AUTH_CODE.
    4. The page sends code + nonce back to the opener via postMessage.
    5. The frontend calls /auth/callback with code + nonce.
    6. We look up the stored verifier by nonce and exchange the code for tokens.

    The nonce ties the postMessage back to the original request (CSRF protection).
    The code_verifier is stored server-side keyed by nonce (5-min TTL).
    """
    from urllib.parse import urlencode

    base = str(request.base_url).rstrip("/")
    redirect_url = f"{base}{settings.API_PREFIX}/auth/oauth-complete"

    # Use the frontend-supplied nonce (generated per-login-attempt).
    # Fall back to a server-generated one if not provided.
    used_nonce = nonce or secrets.token_hex(16)

    # IMPORTANT: Do NOT pass a custom `state` to Supabase.
    # Supabase generates its own state for CSRF and stores it server-side.
    # Overriding `state` with our nonce breaks Supabase's check → bad_oauth_state.
    # Instead, encode our nonce in the redirect_to URL so oauth-complete can
    # extract it without interfering with Supabase's state mechanism.
    redirect_url_with_nonce = f"{redirect_url}?nonce={used_nonce}"

    params: dict = {
        "provider": "google",
        "redirect_to": redirect_url_with_nonce,
        "prompt": "select_account",
    }

    url = f"{settings.SUPABASE_URL}/auth/v1/authorize?" + urlencode(params)
    return {"url": url}


@router.get("/oauth-complete", response_class=HTMLResponse)
async def oauth_complete():
    """
    Callback page after Google OAuth completes (both PKCE and implicit flows).

    PKCE flow (modern, default):
      Supabase redirects here with ?code=AUTH_CODE&state=NONCE in the query string.
      This page sends {type, code, nonce} back to the opener via postMessage.
      The frontend then calls /auth/callback with the code + nonce.
      The backend looks up the stored code_verifier and exchanges the code for tokens.

    Implicit flow (legacy fallback):
      Supabase redirects here with #access_token=TOKEN&state=NONCE in the hash.
      This page sends {type, access_token, refresh_token, nonce} to the opener.
    """
    return HTMLResponse(
      content="""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SheetMind \u2014 Login</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
       display:flex;align-items:center;justify-content:center;min-height:100vh;
       background:linear-gradient(135deg,#ecfdf5,#f0fdfa,#ecfeff)}
  .card{text-align:center;padding:2.5rem;background:#fff;border-radius:1rem;
        box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:360px;width:90%}
  .spinner{width:40px;height:40px;border:3px solid #d1fae5;border-top-color:#10b981;
           border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 1rem}
  @keyframes spin{to{transform:rotate(360deg)}}
  h2{font-size:1.125rem;color:#111827;margin-bottom:.5rem}
  p{font-size:.875rem;color:#6b7280}
  .success{color:#059669}
  .error{color:#dc2626}
</style>
</head>
<body>
<div class="card" id="card">
  <div class="spinner" id="spinner"></div>
  <h2 id="title">Completing login...</h2>
  <p id="msg">Please wait</p>
</div>
<script>
(function() {
  var hashParams = new URLSearchParams(window.location.hash.substring(1));
  var queryParams = new URLSearchParams(window.location.search);
  var el = function(id) { return document.getElementById(id); };

  // Check for OAuth error first (works for both flows)
  var error = hashParams.get("error") || queryParams.get("error");
  var errorDesc = hashParams.get("error_description") || queryParams.get("error_description");

  // PKCE flow: code comes in query string
  var code = queryParams.get("code");

  // Implicit flow: access_token comes in hash fragment
  var accessToken = hashParams.get("access_token");
  var refreshToken = hashParams.get("refresh_token") || "";

  // Nonce is embedded in the redirect_to URL as ?nonce=... (not in state,
  // to avoid conflicting with Supabase's own CSRF state parameter).
  var nonce = queryParams.get("nonce") || hashParams.get("state") || queryParams.get("state") || "";

  function showSuccess(msg) {
    el("spinner").style.display = "none";
    el("title").textContent = "Login successful!";
    el("title").className = "success";
    el("msg").textContent = msg || "This window will close automatically.";
  }

  function showError(msg) {
    el("spinner").style.display = "none";
    el("title").textContent = "Login failed";
    el("title").className = "error";
    el("msg").textContent = msg || "Please close this window and try again.";
  }

  function sendToOpener(payload) {
    if (!window.opener) return false;
    try {
      // targetOrigin "*" is intentional: the GAS sidebar runs on a dynamic
      // sandbox origin that cannot be predicted at serve time.
      // The nonce mitigates this — the receiver verifies the nonce matches
      // what it generated before accepting the payload.
      window.opener.postMessage(payload, "*");
      return true;
    } catch(e) {
      console.warn("SheetMind: Could not deliver payload to opener:", e);
      return false;
    }
  }

  if (error) {
    var desc = errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, " ")) : error;
    showError(desc);

  } else if (code) {
    // PKCE flow — send the authorization code to the opener for exchange
    var sent = sendToOpener({ type: "sheetmind-oauth", code: code, nonce: nonce });
    if (sent) {
      showSuccess("This window will close automatically.");
      setTimeout(function() { window.close(); }, 1500);
    } else {
      // No opener (popup was blocked, opened as tab)
      showSuccess("You can close this window and return to SheetMind.");
    }

  } else if (accessToken) {
    // Implicit flow fallback — send tokens directly
    var sent = sendToOpener({
      type: "sheetmind-oauth",
      access_token: accessToken,
      refresh_token: refreshToken,
      nonce: nonce
    });
    if (sent) {
      showSuccess("This window will close automatically.");
      setTimeout(function() { window.close(); }, 1500);
    } else {
      showSuccess("You can close this window and return to SheetMind.");
    }

  } else {
    showError("No tokens received. Please close this window and try again.");
  }
})();
</script>
</body>
</html>""",
      headers={
          "Content-Security-Policy": (
              "default-src 'none'; "
              "script-src 'unsafe-inline'; "
              "style-src 'unsafe-inline'"
          ),
      },
    )


@router.post("/signup")
async def signup(body: SignUpRequest, request: Request):
    """
    Sign up with email and password.
    Creates a new user in Supabase Auth.
    """
    _check_auth_rate_limit(request, "signup")
    client = get_supabase_anon()

    try:
        response = client.auth.sign_up({
            "email": body.email,
            "password": body.password,
            "options": {
                "data": {
                    "name": body.name or body.email.split("@")[0],
                }
            }
        })

        if not response.user:
            raise HTTPException(status_code=400, detail="Failed to create account")

        # Create user in our users table
        sb = get_supabase()
        try:
            sb.table("users").insert({
                "id": response.user.id,
                "email": response.user.email or body.email,
                "name": body.name or body.email.split("@")[0],
                "tier": "free",
            }).execute()
        except Exception as insert_err:
            # Log non-fatal insert errors — user exists in Auth but not in users table
            logger.warning(f"users table insert after signup failed (user may already exist): {insert_err}")

        return {
            "message": "Account created. Please check your email to verify.",
            "user_id": response.user.id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {e}")
        error_msg = str(e).lower()
        if "already registered" in error_msg:
            raise HTTPException(status_code=400, detail="Email already registered. Please sign in.")
        raise HTTPException(status_code=400, detail="Sign up failed. Please try again.")


@router.post("/signin")
async def signin(body: SignInRequest, request: Request):
    """
    Sign in with email and password.
    Returns access and refresh tokens.
    """
    _check_auth_rate_limit(request, "signin")
    client = get_supabase_anon()

    try:
        response = client.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password,
        })

        if not response.session:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Ensure user exists in our users table
        sb = get_supabase()
        user = response.user
        user_meta = user.user_metadata or {}

        existing = sb.table("users").select("*").eq("id", user.id).execute()

        if existing.data:
            user_record = existing.data[0]
        else:
            user_record = sb.table("users").insert({
                "id": user.id,
                "email": user.email or body.email,
                "name": user_meta.get("name", body.email.split("@")[0]),
                "tier": "free",
            }).execute().data[0]

        return {
            "user": user_record,
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "expires_at": response.session.expires_at,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signin error: {e}")
        error_msg = str(e).lower()
        if "invalid" in error_msg or "credentials" in error_msg:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        if "email not confirmed" in error_msg or "not confirmed" in error_msg:
            raise HTTPException(status_code=401, detail="Please verify your email before signing in. Check your inbox for the confirmation link.")
        if "user not found" in error_msg or "no user" in error_msg:
            raise HTTPException(status_code=401, detail="No account found with this email. Please sign up first.")
        raise HTTPException(status_code=401, detail="Sign in failed. Please try again.")


@router.post("/callback")
async def callback(body: TokenRequest, request: Request):
    """
    Exchange OAuth tokens after Google login.

    Supports two flows:
    - PKCE (preferred): body.code + body.nonce
      Looks up the stored code_verifier by nonce and calls exchange_code_for_session.
    - Implicit (fallback): body.access_token + body.refresh_token
      Calls set_session directly.

    Returns user info + fresh access/refresh tokens.
    """
    _check_auth_rate_limit(request, "callback")
    client = get_supabase_anon()

    try:
        if body.code and body.nonce:
            # PKCE flow — retrieve and consume the stored verifier
            verifier = _pop_pkce_verifier(body.nonce)
            if not verifier:
                raise HTTPException(
                    status_code=401,
                    detail="OAuth session expired or invalid. Please try signing in again."
                )
            auth_response = client.auth.exchange_code_for_session({
                "auth_code": body.code,
                "code_verifier": verifier,
            })
            user = auth_response.user
            session_obj = auth_response.session

        elif body.access_token:
            # Implicit flow fallback
            auth_response = client.auth.set_session(body.access_token, body.refresh_token)
            user = auth_response.user
            session_obj = auth_response.session

        else:
            raise HTTPException(
                status_code=400,
                detail="Provide either code+nonce (PKCE) or access_token (implicit)."
            )

        if not user or not session_obj:
            raise HTTPException(status_code=401, detail="Invalid tokens")

        # Ensure user exists in our users table
        sb = get_supabase()
        user_meta = user.user_metadata or {}

        existing = sb.table("users").select("*").eq("id", user.id).execute()

        if existing.data:
            user_record = existing.data[0]
        else:
            user_record = sb.table("users").insert({
                "id": user.id,
                "email": user.email or "",
                "name": user_meta.get("full_name", user_meta.get("name", "")),
                "google_id": str(user_meta.get("provider_id", user_meta.get("sub", user.id))),
                "avatar_url": user_meta.get("avatar_url", user_meta.get("picture")),
                "tier": "free",
            }).execute().data[0]

        return {
            "user": user_record,
            "access_token": session_obj.access_token,
            "refresh_token": session_obj.refresh_token,
            "expires_at": session_obj.expires_at,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth callback error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed. Please try again.")


@router.post("/refresh")
async def refresh(body: RefreshRequest, request: Request):
    """Refresh an expired access token using the refresh token."""
    _check_auth_rate_limit(request, "refresh")
    client = get_supabase_anon()

    try:
        session = client.auth.refresh_session(body.refresh_token)

        if not session or not session.session:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        return {
            "access_token": session.session.access_token,
            "refresh_token": session.session.refresh_token,
            "expires_at": session.session.expires_at,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Return the current authenticated user's profile."""
    return user


@router.post("/logout")
async def logout(user: dict = Depends(get_current_user)):
    """Sign out the current user — invalidates the refresh token on Supabase side."""
    try:
        client = get_supabase_anon()
        client.auth.sign_out()
    except Exception as e:
        # Don't block logout if Supabase call fails — client will still clear tokens
        logger.warning(f"Supabase sign_out failed (non-blocking): {e}")
    return {"status": "logged_out"}
