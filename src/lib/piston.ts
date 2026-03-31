export type PistonLanguage = "python" | "javascript" | "cpp" | "c" | "go";

export type PistonExecuteRequest = {
  language: PistonLanguage;
  code: string;
  stdin?: string;
};

export type PistonExecuteResult = {
  stdout?: string;
  stderr?: string;
  output?: string;
  code?: number;
  signal?: string;
};

const PISTON_PROXY_URL = "/api/piston-execute";
const PISTON_DIRECT_URL = "https://emkc.org/api/v2/piston/execute";

function mapLanguage(language: PistonLanguage): string {
  switch (language) {
    case "python":
      return "python";
    case "javascript":
      return "javascript";
    case "cpp":
      return "c++";
    case "c":
      return "c";
    case "go":
      return "go";
  }
}

function mapVersion(language: PistonLanguage): string {
  switch (language) {
    case "python":
      return "3.10.0";
    case "javascript":
      return "18.15.0";
    case "cpp":
      return "10.2.0";
    case "c":
      return "10.2.0";
    case "go":
      return "1.16.2";
  }
}

export async function pistonExecute(req: PistonExecuteRequest): Promise<PistonExecuteResult> {
  const body = {
    language: mapLanguage(req.language),
    version: mapVersion(req.language),
    files: [{ content: req.code }],
    stdin: req.stdin ?? "",
  };

  const endpoint = import.meta.env.DEV ? PISTON_DIRECT_URL : PISTON_PROXY_URL;
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  // Local dev fallback: optional direct key from .env.local.
  if (import.meta.env.DEV && import.meta.env.VITE_PISTON_API_KEY) {
    headers.Authorization = import.meta.env.VITE_PISTON_API_KEY;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Piston error: ${res.status} ${res.statusText}. ${text}`);
  }

  const json = (await res.json()) as any;

  return {
    stdout: json?.run?.stdout,
    stderr: json?.run?.stderr,
    output: json?.run?.output,
    code: json?.run?.code,
    signal: json?.run?.signal,
  };
}
