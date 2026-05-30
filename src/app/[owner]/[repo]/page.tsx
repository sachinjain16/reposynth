import { RepoAnalyzer } from "@/components/repo-analyzer";

type RepoRouteProps = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
};

export default async function RepoRoute({ params }: RepoRouteProps) {
  const { owner, repo } = await params;
  return <RepoAnalyzer initialRepo={`${owner}/${repo}`} autoRun />;
}
