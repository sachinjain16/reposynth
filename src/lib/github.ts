export type NormalizedRepo = {
  owner: string;
  repo: string;
  slug: string;
};

export type RepoMetadata = {
  fullName: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  stars: number;
  forks: number;
  topics: string[];
  defaultBranch: string;
  createdAt: string;
  updatedAt: string;
  license: string | null;
};

export type TreeItem = {
  path: string;
  type: "blob" | "tree";
  size?: number;
};

export type RepoContext = {
  metadata: RepoMetadata;
  rootTree: TreeItem[];
  readme: string | null;
};

type GitHubRepoResponse = {
  full_name: string;
  description: string | null;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics?: string[];
  default_branch: string;
  created_at: string;
  updated_at: string;
  license: { spdx_id?: string; name?: string } | null;
};

type GitHubTreeResponse = {
  tree: Array<{
    path: string;
    type: "blob" | "tree";
    size?: number;
  }>;
};

type GitHubReadmeResponse = {
  content: string;
  encoding: string;
};

const GITHUB_URL_PATTERN =
  /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s?#]+)(?:[/?#].*)?$/i;
const SHORTHAND_PATTERN = /^([^/\s]+)\/([^/\s]+)$/;

export function normalizeRepoInput(input: string): NormalizedRepo {
  const trimmed = input.trim().replace(/^\/+/, "");
  const githubMatch = trimmed.match(GITHUB_URL_PATTERN);
  const shorthandMatch = trimmed.match(SHORTHAND_PATTERN);
  const match = githubMatch ?? shorthandMatch;

  if (!match) {
    throw new Error("Enter a GitHub URL or owner/repo shorthand.");
  }

  const owner = decodeURIComponent(match[1]);
  const repo = decodeURIComponent(match[2]).replace(/\.git$/i, "");

  if (!owner || !repo || owner.includes("..") || repo.includes("..")) {
    throw new Error("That repository identifier does not look valid.");
  }

  return {
    owner,
    repo,
    slug: `${owner}/${repo}`
  };
}

export async function fetchRepoContext(input: string): Promise<RepoContext> {
  const { owner, repo } = normalizeRepoInput(input);
  const [repoResponse, treeResponse, readmeResponse] = await Promise.all([
    githubFetch<GitHubRepoResponse>(`https://api.github.com/repos/${owner}/${repo}`),
    githubFetch<GitHubTreeResponse>(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD`
    ),
    githubFetch<GitHubReadmeResponse>(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      { optional: true }
    )
  ]);

  return {
    metadata: {
      fullName: repoResponse.full_name,
      description: repoResponse.description,
      homepage: repoResponse.homepage,
      language: repoResponse.language,
      stars: repoResponse.stargazers_count,
      forks: repoResponse.forks_count,
      topics: repoResponse.topics ?? [],
      defaultBranch: repoResponse.default_branch,
      createdAt: repoResponse.created_at,
      updatedAt: repoResponse.updated_at,
      license:
        repoResponse.license?.spdx_id && repoResponse.license.spdx_id !== "NOASSERTION"
          ? repoResponse.license.spdx_id
          : repoResponse.license?.name ?? null
    },
    rootTree: treeResponse.tree
      .filter((item) => item.type === "blob" || item.type === "tree")
      .sort((a, b) => Number(a.type === "blob") - Number(b.type === "blob") || a.path.localeCompare(b.path))
      .slice(0, 120),
    readme: readmeResponse ? decodeReadme(readmeResponse) : null
  };
}

async function githubFetch<T>(
  url: string,
  options: { optional?: boolean } = {}
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : {})
    },
    next: { revalidate: 3600 }
  });

  if (options.optional && response.status === 404) {
    return null as T;
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `GitHub request failed with ${response.status}: ${detail.slice(0, 240)}`
    );
  }

  return (await response.json()) as T;
}

function decodeReadme(readme: GitHubReadmeResponse): string {
  if (readme.encoding !== "base64") {
    return "";
  }

  const decoded = Buffer.from(readme.content, "base64").toString("utf8");
  return decoded.length > 12000 ? `${decoded.slice(0, 12000)}\n\n[README truncated]` : decoded;
}
