import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional

from app.core.config import settings
from app.core.database import get_supabase, get_supabase_anon
from app.core.auth import get_current_user
from app.services.rate_limiter import check_rate_limit_by_ip

logger = logging.getLogger(__name__)

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
    access_token: str
    refresh_token: str


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
async def login(request: Request):
    """
    Return the Supabase OAuth URL for Google login.
    Uses implicit flow (no PKCE) so tokens come back in the URL hash fragment.
    Redirects to our own /oauth-complete page which relays tokens
    back to the opener window via postMessage.
    """
    from urllib.parse import urlencode

    # Build callback URL pointing to our backend's oauth-complete page
    base = str(request.base_url).rstrip("/")
    redirect_url = f"{base}{settings.API_PREFIX}/auth/oauth-complete"

    # Construct OAuth URL manually — avoids SDK's PKCE flow which returns
    # a ?code= param that requires a code_verifier to exchange.
    # Without code_challenge, Supabase uses implicit flow → #access_token in hash.
    url = f"{settings.SUPABASE_URL}/auth/v1/authorize?" + urlencode({
        "provider": "google",
        "redirect_to": redirect_url,
        "prompt": "select_account",
    })

    return {"url": url}


@router.get("/oauth-complete", response_class=HTMLResponse)
async def oauth_complete():
    """
    Callback page served after Google OAuth completes.
    Extracts tokens from the URL hash fragment and sends them
    back to the opener window (GAS sidebar) via postMessage,
    then closes itself.
    """
    # Build a list of allowed origins for postMessage targeting.
    # This prevents tokens from being intercepted by a malicious opener.
    import json as _json
    allowed_origins = list(settings.cors_origins_list)
    if settings.FRONTEND_URL and settings.FRONTEND_URL not in allowed_origins:
        allowed_origins.append(settings.FRONTEND_URL)
    allowed_origins_js = _json.dumps(allowed_origins)

    return HTMLResponse(content=f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SheetMind — Login</title>
<style>
  *{{margin:0;padding:0;box-sizing:border-box}}
  body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
       display:flex;align-items:center;justify-content:center;min-height:100vh;
       background:linear-gradient(135deg,#ecfdf5,#f0fdfa,#ecfeff)}}
  .card{{text-align:center;padding:2.5rem;background:#fff;border-radius:1rem;
        box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:360px;width:90%}}
  .spinner{{width:40px;height:40px;border:3px solid #d1fae5;border-top-color:#10b981;
           border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 1rem}}
  @keyframes spin{{to{{transform:rotate(360deg)}}}}
  h2{{font-size:1.125rem;color:#111827;margin-bottom:.5rem}}
  p{{font-size:.875rem;color:#6b7280}}
  .success{{color:#059669}}
  .error{{color:#dc2626}}
</style>
</head>
<body>
<div class="card" id="card">
  <div class="spinner" id="spinner"></div>
  <h2 id="title">Completing login...</h2>
  <p id="msg">Please wait</p>
</div>
<script>
(function(){{
  var hash = window.location.hash.substring(1);
  var params = new URLSearchParams(hash);
  var accessToken = params.get("access_token");
  var refreshToken = params.get("refresh_token");
  var el = function(id){{ return document.getElementById(id); }};
  var allowedOrigins = {allowed_origins_js};

  if (accessToken && window.opener) {{
    // Send tokens to each allowed origin — only the real opener will receive it.
    // postMessage with a specific targetOrigin ensures other origins cannot intercept.
    var sent = false;
    for (var i = 0; i < allowedOrigins.length; i++) {{
      try {{
        window.opener.postMessage({{
          type: "sheetmind-oauth",
          access_token: accessToken,
          refresh_token: refreshToken || "",
          origin: window.location.origin
        }}, allowedOrigins[i]);
        sent = true;
      }} catch(e) {{ /* opener may have been closed */ }}
    }}
    // Log if no postMessage was delivered (helps debug origin mismatches)
    if (!sent) {{
      console.warn("SheetMind: Could not deliver tokens — origin mismatch. Check addon configuration.");
    }}

    el("spinner").style.display = "none";
    el("title").textContent = "Login successful!";
    el("title").className = "success";
    el("msg").textContent = "This window will close automatically.";
    setTimeout(function(){{ window.close(); }}, 1500);
  }} else if (accessToken && !window.opener) {{
    // Opened as a regular tab (popup was blocked)
    el("spinner").style.display = "none";
    el("title").textContent = "Login successful!";
    el("title").className = "success";
    el("msg").textContent = "You can close this window and return to SheetMind.";
  }} else {{
    el("spinner").style.display = "none";
    el("title").textContent = "Login failed";
    el("title").className = "error";
    el("msg").textContent = "No tokens received. Please close this window and try again.";
  }}
}})();
</script>
</body>
</html>""")


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
        except Exception:
            pass  # User might already exist

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
        raise HTTPException(status_code=401, detail="Sign in failed. Please try again.")


@router.post("/callback")
async def callback(body: TokenRequest, request: Request):
    """
    Exchange Supabase tokens after OAuth redirect.
    The frontend sends the access_token and refresh_token it received
    from the URL hash after Google OAuth redirect.
    Returns user info + tokens.
    """
    _check_auth_rate_limit(request, "callback")
    client = get_supabase_anon()

    try:
        session = client.auth.set_session(body.access_token, body.refresh_token)
        user = session.user

        if not user:
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
            "access_token": session.session.access_token,
            "refresh_token": session.session.refresh_token,
            "expires_at": session.session.expires_at,
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
    """Sign out the current user (invalidates token on Supabase side)."""
    # Token invalidation happens client-side by discarding the token.
    # Supabase tokens are stateless JWTs, so server-side logout
    # is handled by the client clearing stored tokens.
    return {"status": "logged_out", "message": "Clear tokens on client side."}
