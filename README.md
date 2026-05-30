# RepoSynth

RepoSynth reverse engineers a public GitHub repository into a plausible prompt someone might have given an AI coding assistant to create it.

## What it does

- Accepts a full GitHub URL or `owner/repo` shorthand.
- Supports shareable routes such as `/vercel/next.js`.
- Fetches repository metadata, the root tree, and README content from the GitHub API.
- Sends that context to OpenRouter to synthesize the final prompt.
- Keeps API keys server-side through the Next.js App Router API route.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `OPENROUTER_API_KEY` in `.env.local`. `GITHUB_TOKEN` is optional but recommended for higher GitHub API rate limits.

## Improvement ideas baked into the roadmap

RepoSynth starts intentionally simple, but the idea gets stronger with deeper repository understanding:

1. Fetch more high-signal files such as `package.json`, `pyproject.toml`, `Dockerfile`, config files, and selected source entry points.
2. Add a repo map phase that classifies framework, runtime, routes, data model, tests, deployment target, and architectural patterns before generating the prompt.
3. Cache GitHub and model results by commit SHA to reduce cost and latency.
4. Offer output modes: starter prompt, production-grade prompt, clone brief, architecture brief, and implementation checklist.
5. Add diff-aware analysis for a specific branch, tag, or commit.
6. Add confidence markers so inferred requirements are separated from directly observed repository facts.
7. Support private repositories with GitHub OAuth and explicit user consent.
8. Add model comparison so multiple LLMs can generate candidate prompts and a judge model can merge the best result.

## Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | Yes | Authenticates OpenRouter requests. |
| `OPENROUTER_MODEL` | No | Defaults to `anthropic/claude-3.5-sonnet`. |
| `GITHUB_TOKEN` | No | Raises GitHub API rate limits. |
| `NEXT_PUBLIC_APP_URL` | No | Used for OpenRouter attribution headers. |
