# RepoSynth

RepoSynth reverse engineers a public GitHub repository into a plausible prompt someone might have given an AI coding assistant to create it.

## What it does

- Accepts a full GitHub URL or `owner/repo` shorthand.
- Supports shareable routes such as `/vercel/next.js`.
- Fetches repository metadata, the root tree, and README content from the GitHub API.
- Sends that context to OpenRouter to synthesize the final prompt.
- Keeps API keys server-side through the Next.js App Router API route.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` and paste a public GitHub URL or `owner/repo` shorthand.

## Install option 1: OpenRouter

Use this when you want managed models without running a local model server.

```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-your-key
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
GITHUB_TOKEN=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Then run:

```bash
npm run dev
```

## Install option 2: Ollama

Use this when you want local-first inference.

1. Install Ollama from `https://ollama.com/download`.
2. Pull a model:

```bash
ollama pull llama3.1:8b
```

For stronger code reasoning on a capable machine:

```bash
ollama pull qwen2.5-coder:14b
```

3. Configure `.env.local`:

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
GITHUB_TOKEN=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run RepoSynth:

```bash
npm run dev
```

## Install option 3: LM Studio

Use this when you want a desktop GUI for local models with an OpenAI-compatible API.

1. Install LM Studio.
2. Download and load an instruct model.
3. Start the local server.
4. Configure `.env.local`:

```env
LLM_PROVIDER=openai-compatible
OPENAI_COMPAT_BASE_URL=http://localhost:1234/v1
OPENAI_COMPAT_API_KEY=
OPENAI_COMPAT_MODEL=your-loaded-model-id
GITHUB_TOKEN=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Then run:

```bash
npm run dev
```

## Install option 4: LocalAI, llama.cpp server, vLLM, or other OpenAI-compatible APIs

Use this when you already have a local or self-hosted OpenAI-compatible endpoint.

```env
LLM_PROVIDER=openai-compatible
OPENAI_COMPAT_BASE_URL=http://localhost:8080/v1
OPENAI_COMPAT_API_KEY=optional-key-if-your-server-requires-one
OPENAI_COMPAT_MODEL=your-model-name
GITHUB_TOKEN=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Then run:

```bash
npm run dev
```

## GitHub API access

`GITHUB_TOKEN` is optional for public repositories, but recommended for higher rate limits.

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
| `LLM_PROVIDER` | No | `openrouter`, `ollama`, or `openai-compatible`. Defaults to `openrouter`. |
| `OPENROUTER_API_KEY` | OpenRouter only | Authenticates OpenRouter requests. |
| `OPENROUTER_MODEL` | No | Defaults to `anthropic/claude-3.5-sonnet`. |
| `OLLAMA_BASE_URL` | Ollama only | Defaults to `http://localhost:11434`. |
| `OLLAMA_MODEL` | Ollama only | Defaults to `llama3.1:8b`. |
| `OPENAI_COMPAT_BASE_URL` | OpenAI-compatible only | Base URL ending in `/v1`, such as LM Studio or LocalAI. |
| `OPENAI_COMPAT_API_KEY` | No | Optional bearer token for OpenAI-compatible servers. |
| `OPENAI_COMPAT_MODEL` | OpenAI-compatible only | Model name sent to the local or self-hosted server. |
| `GITHUB_TOKEN` | No | Raises GitHub API rate limits. |
| `NEXT_PUBLIC_APP_URL` | No | Used for OpenRouter attribution headers. |
