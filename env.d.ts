/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USDA_API_KEY: string
  readonly VITE_OPENROUTER_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
