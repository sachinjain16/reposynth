"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type AnalyzeResponse = {
  repo: string;
  sharePath: string;
  prompt: string;
  context: {
    metadata: {
      fullName: string;
      description: string | null;
      language: string | null;
      stars: number;
      forks: number;
      topics: string[];
      license: string | null;
    };
    rootTree: Array<{
      path: string;
      type: "blob" | "tree";
    }>;
    readme: string | null;
  };
};

type RepoAnalyzerProps = {
  initialRepo?: string;
  autoRun?: boolean;
};

export function RepoAnalyzer({ initialRepo = "", autoRun = false }: RepoAnalyzerProps) {
  const [repo, setRepo] = useState(initialRepo);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const shareUrl = useMemo(() => {
    if (!result || typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}${result.sharePath}`;
  }, [result]);

  const analyze = useCallback(async (nextRepo = repo) => {
    const trimmed = nextRepo.trim();
    if (!trimmed) {
      setError("Paste a GitHub URL or owner/repo shorthand.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: trimmed })
      });
      const payload = (await response.json()) as AnalyzeResponse | { error: string };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error : "Analysis failed.");
      }

      setResult(payload as AnalyzeResponse);
      window.history.replaceState(null, "", (payload as AnalyzeResponse).sharePath);
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "Could not analyze that repository."
      );
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    if (autoRun && initialRepo) {
      void analyze(initialRepo);
    }
  }, [analyze, autoRun, initialRepo]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void analyze();
  }

  async function copyPrompt() {
    if (result?.prompt) {
      await navigator.clipboard.writeText(result.prompt);
    }
  }

  return (
    <main className="min-h-screen px-6 py-10 sm:px-8">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-col gap-5 text-center">
          <div className="mx-auto rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-blue-200 shadow-2xl shadow-blue-950/40">
            Reverse engineer GitHub repos into AI build prompts
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-7xl">
              RepoSynth
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Paste a public repository URL and get the synthetic prompt someone
              might have given an AI coding assistant to build it.
            </p>
          </div>
        </header>

        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-white/10 bg-white/[0.06] p-3 shadow-2xl shadow-black/30 backdrop-blur"
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={repo}
              onChange={(event) => setRepo(event.target.value)}
              placeholder="vercel/next.js or https://github.com/vercel/next.js"
              className="min-h-14 flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-5 text-base text-white outline-none ring-blue-400/40 transition placeholder:text-slate-500 focus:border-blue-300 focus:ring-4"
            />
            <button
              type="submit"
              disabled={loading}
              className="min-h-14 rounded-2xl bg-blue-500 px-7 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Synthesizing..." : "Generate prompt"}
            </button>
          </div>
        </form>

        {error ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {loading ? <LoadingState /> : null}

        {result ? (
          <section className="grid gap-5 lg:grid-cols-[0.9fr_1.6fr]">
            <aside className="rounded-3xl border border-white/10 bg-white/[0.06] p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-blue-200">
                Repository
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                {result.context.metadata.fullName}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                {result.context.metadata.description ?? "No description provided."}
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <Metric label="Language" value={result.context.metadata.language ?? "Unknown"} />
                <Metric label="Stars" value={result.context.metadata.stars.toLocaleString()} />
                <Metric label="Forks" value={result.context.metadata.forks.toLocaleString()} />
                <Metric label="License" value={result.context.metadata.license ?? "Unknown"} />
              </dl>
              <div className="mt-6 flex flex-wrap gap-2">
                {result.context.metadata.topics.slice(0, 12).map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
                  >
                    {topic}
                  </span>
                ))}
              </div>
              <p className="mt-6 break-all text-xs text-slate-400">
                Share: {shareUrl}
              </p>
            </aside>

            <article className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-black/30">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-purple-200">
                    Synthetic prompt
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Likely build request
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={copyPrompt}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                >
                  Copy prompt
                </button>
              </div>
              <pre className="max-h-[38rem] overflow-auto whitespace-pre-wrap rounded-2xl bg-black/40 p-5 text-sm leading-7 text-slate-100">
                {result.prompt}
              </pre>
            </article>
          </section>
        ) : null}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <dt className="text-xs uppercase tracking-widest text-slate-500">{label}</dt>
      <dd className="mt-2 font-semibold text-slate-100">{value}</dd>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-slate-300">
      <div className="h-3 w-44 animate-pulse rounded-full bg-white/20" />
      <div className="mt-6 space-y-3">
        <div className="h-4 animate-pulse rounded-full bg-white/10" />
        <div className="h-4 w-11/12 animate-pulse rounded-full bg-white/10" />
        <div className="h-4 w-9/12 animate-pulse rounded-full bg-white/10" />
      </div>
    </div>
  );
}
