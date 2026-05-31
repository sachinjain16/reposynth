import { NextResponse } from "next/server";
import { fetchRepoContext, normalizeRepoInput } from "@/lib/github";
import { synthesizePrompt } from "@/lib/llm";

type AnalyzeRequest = {
  repo?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequest;

    if (!body.repo) {
      return NextResponse.json({ error: "Repo is required." }, { status: 400 });
    }

    const normalized = normalizeRepoInput(body.repo);
    const context = await fetchRepoContext(normalized.slug);
    const prompt = await synthesizePrompt(context);

    return NextResponse.json({
      repo: normalized.slug,
      context,
      prompt,
      sharePath: `/${normalized.owner}/${normalized.repo}`
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong.";
    const status = message.includes("not configured") ? 500 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
