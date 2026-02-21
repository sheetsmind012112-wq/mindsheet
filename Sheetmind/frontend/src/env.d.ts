/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend API base URL (e.g. "https://api.sheetmind.xyz/api") */
  readonly VITE_API_URL: string;
  /** PostHog project API key */
  readonly VITE_POSTHOG_KEY: string;
  /** PostHog ingestion host */
  readonly VITE_POSTHOG_HOST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
