/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Override the AppSync GraphQL endpoint URL (optional). */
  readonly VITE_APPSYNC_URL?: string;
  /** Override the AppSync API key (optional). Useful when amplify_outputs.json has a stale key. */
  readonly VITE_APPSYNC_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
