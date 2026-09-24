import Link from "next/link";
import { PageHeader } from "@/components/panel-shell";
import { ActionForm, Submit } from "@/components/form";
import { Icon, Pill } from "@/components/ui";
import { getArticles } from "@/lib/data";
import { deleteArticleAction, togglePublishAction } from "@/app/actions/admin";
import { CATEGORY_LABEL, timeAgo } from "@/lib/format";

export const metadata = { title: "Newsroom" };

export default async function AdminNews() {
  const articles = await getArticles({ includeDrafts: true });
  return (
    <>
      <PageHeader eyebrow={`${articles.length} stories`} title="Newsroom">
        <Link href="/admin/news/new" className="btn-primary btn-sm">
          <Icon name="plus" size={14} /> New story
        </Link>
      </PageHeader>
      <div className="panel divide-y divide-white/[0.05]">
        {articles.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-[240px] flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="gold">{CATEGORY_LABEL[a.category]}</Pill>
                {!a.published && <Pill tone="crimson">Draft</Pill>}
                {a.featured && <Pill>Featured</Pill>}
                {a.membersOnly && <Pill tone="emerald">Members</Pill>}
              </div>
              <Link href={`/admin/news/${a.id}`} className="mt-2 block font-serif text-lg hover:text-gold">
                {a.title}
              </Link>
              <div className="text-xs text-ivory/45">
                {a.authorName} · {timeAgo(a.publishedAt)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/news/${a.slug}`} className="btn-quiet btn-sm">
                View
              </Link>
              <Link href={`/admin/news/${a.id}`} className="btn-ghost btn-sm">
                Edit
              </Link>
              <ActionForm action={togglePublishAction}>
                <input type="hidden" name="id" value={a.id} />
                <Submit className="btn-quiet btn-sm">{a.published ? "Unpublish" : "Publish"}</Submit>
              </ActionForm>
              <ActionForm action={deleteArticleAction} confirm="Delete this story permanently?">
                <input type="hidden" name="id" value={a.id} />
                <Submit className="btn-danger btn-sm">Delete</Submit>
              </ActionForm>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
