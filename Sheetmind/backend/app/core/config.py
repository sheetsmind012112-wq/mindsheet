from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings
from typing import List

# Priority: .env.local (local dev secrets) → .env (template/defaults)
# On Render/production, env vars are injected directly — no file needed.
_base_dir = Path(__file__).resolve().parent.parent.parent
_env_local = _base_dir / ".env.local"
_env_file = str(_env_local) if _env_local.exists() else ".env"


class Settings(BaseSettings):
    # App
    APP_NAME: str = "SheetMind"
    APP_ENV: str = "production"
    DEBUG: bool = False
    API_PREFIX: str = "/api"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4                  # uvicorn worker processes
    THREAD_POOL_SIZE: int = 20        # threads per worker for blocking I/O (AI calls, DB)

    # Free Trial
    FREE_TRIAL_LIMIT: int = 5  # Number of free messages for new users

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # OpenRouter (single key for all AI models)
    OPENROUTER_API_KEY: str = ""

    # Google Gemini API (direct, no proxy)
    GEMINI_API_KEY: str = ""
    GEMINI_ENABLED: bool = False  # Set True when Gemini key has quota

    # LangChain Agent Settings
    LANGCHAIN_ENABLED: bool = True  # Enable LangChain ReAct agent
    RAG_ENABLED: bool = True  # Enable RAG for large sheets

    # RAG Configuration
    CHROMA_PERSIST_DIR: str = "./chroma_db"  # Vector DB storage path
    RAG_THRESHOLD_ROWS: int = 500  # Activate RAG above this row count
    RAG_RESULTS_COUNT: int = 30  # Number of rows to retrieve via RAG

    # Memory Configuration
    MEMORY_WINDOW_SIZE: int = 10  # Number of conversation turns to remember

    # PII Detection — warn users when sensitive data is sent to LLM APIs
    PII_DETECTION_ENABLED: bool = True

    # Internal health check key — required to get detailed /health/db info in production
    HEALTH_CHECK_KEY: str = ""

    # API Analytics (free dashboard at apianalytics.dev)
    API_ANALYTICS_KEY: str = ""

    # Dodo Payments
    DODO_PAYMENTS_API_KEY: str = ""
    DODO_PAYMENTS_WEBHOOK_KEY: str = ""
    DODO_PAYMENTS_ENVIRONMENT: str = "test_mode"
    DODO_PRO_MONTHLY_PRODUCT_ID: str = ""
    DODO_PRO_ANNUAL_PRODUCT_ID: str = ""
    DODO_TEAM_MONTHLY_PRODUCT_ID: str = ""
    DODO_TEAM_ANNUAL_PRODUCT_ID: str = ""

    # CORS — comma-separated list of allowed origins.
    # localhost entries are automatically stripped in production.
    CORS_ORIGINS: str = "http://localhost:3000,https://docs.google.com"

    # Frontend redirect after login/billing
    FRONTEND_URL: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        if self.APP_ENV == "production":
            # Never allow localhost in production — strip it even if accidentally set
            origins = [o for o in origins if "localhost" not in o and "127.0.0.1" not in o]
        return origins

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        """Crash at startup if required secrets are missing in production.

        Catches misconfigured deployments immediately rather than failing
        with cryptic errors on the first real request.
        """
        if self.APP_ENV != "production":
            return self

        missing = []
        if not self.SUPABASE_URL:
            missing.append("SUPABASE_URL")
        if not self.SUPABASE_SERVICE_ROLE_KEY:
            missing.append("SUPABASE_SERVICE_ROLE_KEY")
        if not self.OPENROUTER_API_KEY:
            missing.append("OPENROUTER_API_KEY")
        if not self.FRONTEND_URL or "localhost" in self.FRONTEND_URL:
            missing.append("FRONTEND_URL (must not be localhost in production)")
        if self.DODO_PAYMENTS_API_KEY and self.DODO_PAYMENTS_ENVIRONMENT != "live":
            missing.append("DODO_PAYMENTS_ENVIRONMENT (must be 'live' in production when API key is set)")

        if missing:
            raise ValueError(
                f"Missing or invalid required environment variables for production:\n"
                + "\n".join(f"  - {v}" for v in missing)
            )

        return self

    model_config = {"env_file": _env_file, "extra": "ignore"}


settings = Settings()
