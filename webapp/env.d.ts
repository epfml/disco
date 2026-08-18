/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full URL of the Disco server. When set to "localhost", the URL is derived from window.location. */
  readonly VITE_SERVER_URL: string;
  readonly VITE_SERVER_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
