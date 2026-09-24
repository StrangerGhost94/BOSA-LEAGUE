import { PageHeader } from "@/components/panel-shell";
import { ArticleForm } from "@/components/admin/article-form";
import { getCompetitions, getTeams } from "@/lib/data";

export const metadata = { title: "New story" };

export default async function NewArticle() {
  const [teams, comps] = await Promise.all([getTeams(), getCompetitions()]);
  return (
    <>
      <PageHeader eyebrow="Newsroom" title="Write a story" />
      <ArticleForm teams={teams} comps={comps} />
    </>
  );
}
