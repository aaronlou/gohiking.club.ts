import {
  EVALUATION_JSON_SCHEMA,
  SYSTEM_PROMPT,
  buildEvaluationPrompt,
  type EvaluationContext,
} from "./prompt";
import {
  extractJsonObject,
  normalizeEvaluation,
  rawEvaluationSchema,
  type PhotoEvaluation,
} from "./schema";

export class AIServiceError extends Error {
  code:
    | "not_configured"
    | "unavailable"
    | "timeout"
    | "invalid_response"
    | "model_missing"
    | "unauthorized";
  publicMessage: string;

  constructor(code: AIServiceError["code"], publicMessage: string, cause?: unknown) {
    super(publicMessage, { cause });
    this.name = "AIServiceError";
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

type OllamaProvider = {
  kind: "ollama";
  url: string;
  model: string;
  label: string;
};

type OpenAIProvider = {
  kind: "openai";
  baseUrl: string;
  apiKey: string;
  model: string;
  label: string;
};

type Provider = OllamaProvider | OpenAIProvider;

export type EvaluationResult = PhotoEvaluation & {
  provider: string;
  model: string;
  latencyMs: number;
};

function resolveProvider(): Provider {
  const requested = (process.env.AI_PROVIDER ?? "ollama").toLowerCase();

  if (requested === "openai") {
    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL;
    if (!apiKey || !model) {
      throw new AIServiceError(
        "not_configured",
        "负责观看照片的模型还没有准备好。请稍后再试，或联系站点管理员。",
      );
    }
    return {
      kind: "openai",
      baseUrl: (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, ""),
      apiKey,
      model,
      label: model,
    };
  }

  if (requested !== "ollama") {
    throw new AIServiceError(
      "not_configured",
      `未知的 AI_PROVIDER：${requested}。请使用 ollama 或 openai。`,
    );
  }

  return {
    kind: "ollama",
    url: (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434").replace(/\/$/, ""),
    model: process.env.OLLAMA_MODEL ?? "qwen3.5:9b",
    label: process.env.OLLAMA_MODEL ?? "qwen3.5:9b",
  };
}

function apiErrorForStatus(status: number, detail: string) {
  if (status === 401 || status === 403) {
    return new AIServiceError("unauthorized", "观看照片的模型暂时没有通过身份验证，请联系站点管理员。");
  }
  if (status === 404) {
    return new AIServiceError(
      "model_missing",
      "观看照片的模型还没有准备好。请稍后再试，或检查模型配置。",
      detail,
    );
  }
  return new AIServiceError(
    "unavailable",
    "观看照片的模型暂时没有回应，稍后再试一次吧。",
    detail,
  );
}

async function callOllama(
  provider: OllamaProvider,
  prompt: string,
  imageBase64: string,
  signal: AbortSignal,
) {
  const response = await fetch(`${provider.url}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: provider.model,
      stream: false,
      think: false,
      format: EVALUATION_JSON_SCHEMA,
      keep_alive: "10m",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt, images: [imageBase64] },
      ],
      options: {
        temperature: 0.2,
        top_p: 0.9,
        num_predict: 1400,
      },
    }),
    signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw apiErrorForStatus(response.status, detail.slice(0, 500));
  }

  const payload = (await response.json()) as {
    message?: { content?: string };
    error?: string;
  };

  if (!payload.message?.content) {
    throw new AIServiceError(
      "invalid_response",
      "这一次，模型没有留下手记。稍后再试一次吧。",
      payload.error ?? payload,
    );
  }

  return payload.message.content;
}

async function callOpenAI(
  provider: OpenAIProvider,
  prompt: string,
  imageBase64: string,
  signal: AbortSignal,
) {
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.2,
      max_tokens: 1400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    }),
    signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw apiErrorForStatus(response.status, detail.slice(0, 500));
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new AIServiceError("invalid_response", "这一次，模型没有留下手记。稍后再试一次吧。", payload);
  }

  return content;
}

export async function evaluatePhoto(
  image: Buffer,
  context: EvaluationContext,
): Promise<EvaluationResult> {
  const provider = resolveProvider();
  const timeout = Number(process.env.AI_TIMEOUT_MS ?? 180_000);
  const signal = AbortSignal.timeout(timeout);
  const imageBase64 = image.toString("base64");
  const prompt = buildEvaluationPrompt(context);
  const startedAt = Date.now();

  let content = "";
  try {
    content =
      provider.kind === "ollama"
        ? await callOllama(provider, prompt, imageBase64, signal)
        : await callOpenAI(provider, prompt, imageBase64, signal);
  } catch (error) {
    if (error instanceof AIServiceError) throw error;
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new AIServiceError("timeout", "观看用时有点长，照片好好地保留着，稍后再试一次吧。", error);
    }
    throw new AIServiceError(
      "unavailable",
      provider.kind === "ollama"
        ? "暂时连不上观看照片的模型。请确认 Ollama 正在运行，并已下载指定模型。"
        : "暂时连不上观看照片的模型，稍后再试一次吧。",
      error,
    );
  }

  let parsed: unknown;
  try {
    parsed = extractJsonObject(content);
  } catch (error) {
    throw new AIServiceError("invalid_response", "这一次的手记没有写完，稍后再试一次吧。", {
      error,
      preview: content.slice(0, 300),
    });
  }

  const validated = rawEvaluationSchema.safeParse(parsed);
  if (!validated.success) {
    throw new AIServiceError("invalid_response", "这一次的手记少了一点信息，稍后再试一次吧。", {
      issues: validated.error.issues,
      preview: content.slice(0, 300),
    });
  }

  const evaluation = normalizeEvaluation(validated.data);
  const latencyMs = Date.now() - startedAt;

  console.info(
    `[ai] provider=${provider.kind} model=${provider.label} score=${evaluation.score} latency=${latencyMs}ms`,
  );

  return {
    ...evaluation,
    provider: provider.kind,
    model: provider.label,
    latencyMs,
  };
}

export function describeProvider() {
  const requested = (process.env.AI_PROVIDER ?? "ollama").toLowerCase();
  if (requested === "openai") {
    return {
      id: "openai" as const,
      label: "云端观看手记",
      model: process.env.AI_MODEL ?? "未配置",
    };
  }
  return {
    id: "ollama" as const,
    label: "本地观看手记",
    model: process.env.OLLAMA_MODEL ?? "qwen3.5:9b",
  };
}
