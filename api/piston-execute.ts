type ExecuteRequestBody = {
  language: string;
  version: string;
  files: Array<{ content: string }>;
  stdin?: string;
};

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

export default async function handler(
  req: {
    method?: string;
    body?: unknown;
  },
  res: {
    status: (code: number) => { json: (payload: unknown) => unknown };
    setHeader: (name: string, value: string) => void;
  }
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const body = req.body as ExecuteRequestBody | undefined;
  if (!body || !body.language || !body.version || !Array.isArray(body.files)) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  const pistonApiKey = process.env.PISTON_API_KEY;
  if (pistonApiKey) {
    headers.Authorization = pistonApiKey;
  }

  try {
    const upstreamResponse = await fetch(PISTON_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const text = await upstreamResponse.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        json = text;
      }
    }

    if (!upstreamResponse.ok) {
      return res.status(upstreamResponse.status).json({
        error: "Piston request failed",
        details: json ?? text,
      });
    }

    return res.status(200).json(json);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to execute code via Piston",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
