import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { getArticles } from "@/lib/data";
import { getCurrentUser, hasMembership } from "@/lib/auth";
import { FadeIn } from "@/components/motion";
import { NewsCard, NewsCover } from "@/components/news";
import { MembersLock } from "@/components/members-lock";
import { CATEGORY_LABEL, fmtLong } from "@/lib/format";
import { can } from "@/lib/roles";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const a = await db.query.articles.findFirst({ where: eq(articles.slug, params.slug) });
  return { title: a?.title ?? "Story", description: a?.excerpt };
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const a = await db.query.articles.findFirst({ where: eq(articles.slug, params.slug), with: { team: true, competition: true } });
  const user = await getCurrentUser();
  if (!a || (!a.published && !can(user?.role, "news"))) notFound();
  const member = hasMembership(user);
  const locked = a.membersOnly && !member;
  const paragraphs = a.body.split(/\n+/).filter(Boolean);
  const more = (await getArticles({ limit: 4 })).filter((x) => x.id !== a.id).slice(0, 3);

  return (
    <>
      <section className="relative pt-32">
        <div className="container-x max-w-4xl">
          <FadeIn>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em]">
              <Link href={`/news?c=${a.category}`} className="text-gold hover:underline">
                {CATEGORY_LABEL[a.category]}
              </Link>
              {a.competition && <span className="text-ivory/40">{a.competition.name}</span>}
              {!a.published && <span className="text-crimson-400">Draft</span>}
            </div>
            <h1 className="headline mt-6 text-4xl sm:text-6xl">{a.title}</h1>
            <p className="mt-6 font-serif text-xl leading-relaxed text-ivory/65 sm:text-2xl">{a.excerpt}</p>
            <div className="mt-8 flex items-center gap-3 border-y border-white/[0.07] py-4 text-sm text-ivory/50">
              <span>{a.authorName ?? "BOSA Newsroom"}</span>
              <span className="h-1 w-1 rounded-full bg-gold/60" />
              <span>{fmtLong(a.publishedAt)}</span>
              <span className="h-1 w-1 rounded-full bg-gold/60" />
              <span>{a.readMinutes} min read</span>
            </div>
          </FadeIn>
        </div>
        <FadeIn delay={0.15} className="container-x mt-10 max-w-6xl">
          <NewsCover a={a} big className="aspect-[21/9] w-full rounded-3xl" />
        </FadeIn>
      </section>
      <section className="container-x mt-14 max-w-3xl">
        {locked ? (
          <>
            <div className="ivory-card p-8 sm:p-12">
              <div className="prose-luxe">
                <p>{paragraphs[0]}</p>
              </div>
              <div className="pointer-events-none -mt-24 h-24 bg-gradient-to-t from-ivory to-transparent" />
            </div>
            <div className="mt-8">
              <MembersLock title="Continue reading as a member" body="This story is reserved for BOSA League members. A one-time membership unlocks every members-only story, the full match centre and player profiles." signedIn={!!user} />
            </div>
          </>
        ) : (
          <FadeIn>
            <article className="ivory-card p-8 sm:p-12">
              <div className="prose-luxe">
                {paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </article>
          </FadeIn>
        )}
      </section>
      {more.length > 0 && (
        <section className="container-x pt-24">
          <div className="eyebrow mb-6">More from the Newsroom</div>
          <div className="grid gap-6 md:grid-cols-3">
            {more.map((x) => (
              <NewsCard key={x.id} a={x} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
