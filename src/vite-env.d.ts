/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Optional local dev key for direct Piston calls in `npm run dev`. */
  readonly VITE_PISTON_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
