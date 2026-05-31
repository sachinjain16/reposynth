import type { RepoContext } from "@/lib/github";

type LlmProvider = "openrouter" | "ollama" | "openai-compatible";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type OllamaResponse = {
  message?: {
    content?: string;
  };
};

const systemPrompt =
  "You reverse engineer public GitHub repositories into plausible AI coding assistant prompts. Produce a single high-quality synthetic prompt, not commentary. Preserve observable facts, infer likely requirements, include constraints, tech choices, UX/API expectations, acceptance criteria, and sensible non-goals. Do not claim access to files beyond the provided metadata, root tree, and README.";

export async function synthesizePrompt(context: RepoContext): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: systemPrompt
    },
    {
      role: "user",
      content: buildModelInput(context)
    }
  ];
  const provider = getProvider();

  if (provider === "ollama") {
    return synthesizeWithOllama(messages);
  }

  if (provider === "openai-compatible") {
    return synthesizeWithOpenAiCompatible(messages);
  }

  return synthesizeWithOpenRouter(messages);
}

function getProvider(): LlmProvider {
  const provider = process.env.LLM_PROVIDER ?? "openrouter";

  if (
    provider === "openrouter" ||
    provider === "ollama" ||
    provider === "openai-compatible"
  ) {
    return provider;
  }

  throw new Error(
    "LLM_PROVIDER must be one of: openrouter, ollama, openai-compatible."
  );
}

async function synthesizeWithOpenRouter(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  return postChatCompletion({
    url: "https://openrouter.ai/api/v1/chat/completions",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "RepoSynth"
    },
    model: process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet",
    messages,
    errorPrefix: "OpenRouter"
  });
}

async function synthesizeWithOpenAiCompatible(
  messages: ChatMessage[]
): Promise<string> {
  const baseUrl = process.env.OPENAI_COMPAT_BASE_URL;

  if (!baseUrl) {
    throw new Error("OPENAI_COMPAT_BASE_URL is not configured.");
  }

  return postChatCompletion({
    url: `${baseUrl.replace(/\/$/, "")}/chat/completions`,
    headers: process.env.OPENAI_COMPAT_API_KEY
      ? { Authorization: `Bearer ${process.env.OPENAI_COMPAT_API_KEY}` }
      : {},
    model: process.env.OPENAI_COMPAT_MODEL ?? "local-model",
    messages,
    errorPrefix: "OpenAI-compatible provider"
  });
}

async function synthesizeWithOllama(messages: ChatMessage[]): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL ?? "llama3.1:8b";

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: 0.35,
        num_predict: 1800
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Ollama request failed with ${response.status}: ${detail.slice(0, 240)}`
    );
  }

  const payload = (await response.json()) as OllamaResponse;
  const content = payload.message?.content?.trim();

  if (!content) {
    throw new Error("Ollama returned an empty response.");
  }

  return content;
}

async function postChatCompletion({
  url,
  headers,
  model,
  messages,
  errorPrefix
}: {
  url: string;
  headers: Record<string, string>;
  model: string;
  messages: ChatMessage[];
  errorPrefix: string;
}): Promise<string> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.35,
      max_tokens: 1800
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `${errorPrefix} request failed with ${response.status}: ${detail.slice(0, 240)}`
    );
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error(`${errorPrefix} returned an empty response.`);
  }

  return content;
}

function buildModelInput(context: RepoContext): string {
  const { metadata, rootTree, readme } = context;

  return [
    `Repository: ${metadata.fullName}`,
    `Description: ${metadata.description ?? "No description"}`,
    `Homepage: ${metadata.homepage ?? "None"}`,
    `Primary language: ${metadata.language ?? "Unknown"}`,
    `Topics: ${metadata.topics.length ? metadata.topics.join(", ") : "None"}`,
    `Stars: ${metadata.stars}`,
    `Forks: ${metadata.forks}`,
    `Default branch: ${metadata.defaultBranch}`,
    `License: ${metadata.license ?? "Unknown"}`,
    "",
    "Root file tree:",
    rootTree
      .map(
        (item) =>
          `- ${item.type === "tree" ? "dir " : "file"} ${item.path}${
            item.size ? ` (${item.size} bytes)` : ""
          }`
      )
      .join("\n"),
    "",
    "README:",
    readme ?? "No README found."
  ].join("\n");
}
