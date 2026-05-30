import type { RepoContext } from "@/lib/github";

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export async function synthesizePrompt(context: RepoContext): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "RepoSynth"
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet",
      messages: [
        {
          role: "system",
          content:
            "You reverse engineer public GitHub repositories into plausible AI coding assistant prompts. Produce a single high-quality synthetic prompt, not commentary. Preserve observable facts, infer likely requirements, include constraints, tech choices, UX/API expectations, acceptance criteria, and sensible non-goals. Do not claim access to files beyond the provided metadata, root tree, and README."
        },
        {
          role: "user",
          content: buildModelInput(context)
        }
      ],
      temperature: 0.35,
      max_tokens: 1800
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `OpenRouter request failed with ${response.status}: ${detail.slice(0, 240)}`
    );
  }

  const payload = (await response.json()) as OpenRouterResponse;
  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("OpenRouter returned an empty response.");
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
    rootTree.map((item) => `- ${item.type === "tree" ? "dir " : "file"} ${item.path}${item.size ? ` (${item.size} bytes)` : ""}`).join("\n"),
    "",
    "README:",
    readme ?? "No README found."
  ].join("\n");
}
