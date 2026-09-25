import Link from "next/link";
import clsx from "clsx";
import { FadeIn, RevealText, Stagger, StaggerItem } from "@/components/motion";
import { NewsCard } from "@/components/news";
import { EmptyState } from "@/components/ui";
import { getArticles } from "@/lib/data";
import { CATEGORY_LABEL } from "@/lib/format";

export const metadata = { title: "Newsroom" };

export default async function NewsPage({ searchParams }: { searchParams: { c?: string } }) {
  const cat = searchParams.c && CATEGORY_LABEL[searchParams.c] ? searchParams.c : undefined;
  const articles = await getArticles({ category: cat });
  const featured = !cat ? articles.filter((a) => a.featured).slice(0, 2) : [];
  const rest = articles.filter((a) => !featured.some((f) => f.id === a.id));

  return (
    <>
      <section className="relative overflow-hidden pb-12 pt-36">
        <div className="pointer-events-none absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-[radial-gradient(closest-side,rgba(204,38,84,0.20),rgba(204,38,84,0))]" />
        <div className="container-x relative">
          <div className="eyebrow">The BOSA Newsroom</div>
          <h1 className="headline mt-6 text-6xl sm:text-8xl lg:text-[120px]">
            <RevealText text="Stories worth" />
            <br />
            <RevealText text="the Sunday." className="gold-text italic" delay={0.2} />
          </h1>
          <FadeIn delay={0.4}>
            <nav className="mt-12 flex gap-2 overflow-x-auto scrollbar-none border-b border-white/[0.06] pb-4">
              <Link href="/news" className={clsx("chip whitespace-nowrap", !cat ? "border-gold/50 bg-gold/10 text-gold" : "text-ivory/60 hover:text-ivory")}>
                All stories
              </Link>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <Link key={k} href={`/news?c=${k}`} className={clsx("chip whitespace-nowrap", cat === k ? "border-gold/50 bg-gold/10 text-gold" : "text-ivory/60 hover:text-ivory")}>
                  {v}
                </Link>
              ))}
            </nav>
          </FadeIn>
        </div>
      </section>
      <section className="container-x">
        {articles.length === 0 && <EmptyState title="Nothing here yet" body="New stories in this category will appear here as soon as they are published." />}
        {featured.length > 0 && (
          <div className="mb-10 grid gap-6 lg:grid-cols-2">
            {featured.map((a, i) => (
              <FadeIn key={a.id} delay={i * 0.1}>
                <NewsCard a={a} variant="feature" />
              </FadeIn>
            ))}
          </div>
        )}
        <Stagger className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {rest.map((a) => (
            <StaggerItem key={a.id}>
              <NewsCard a={a} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>
    </>
  );
}
