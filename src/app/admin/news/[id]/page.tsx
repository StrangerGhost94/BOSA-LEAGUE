import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { PageHeader } from "@/components/panel-shell";
import { ArticleForm } from "@/components/admin/article-form";
import { getCompetitions, getTeams } from "@/lib/data";

export default async function EditArticle({ params }: { params: { id: string } }) {
  const a = await db.query.articles.findFirst({ where: eq(articles.id, params.id) });
  if (!a) notFound();
  const [teams, comps] = await Promise.all([getTeams(), getCompetitions()]);
  return (
    <>
      <PageHeader eyebrow="Edit story" title={a.title.length > 60 ? a.title.slice(0, 60) + "..." : a.title} />
      <ArticleForm article={a} teams={teams} comps={comps} />
    </>
  );
}
