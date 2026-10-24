import { getArticles, visibleTo } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

/**
 * A short summary of a members-only page for search engines, marked with Google's paywalled-content markup
 * (isAccessibleForFree: false) so it counts as members-only content, not hidden text. Kept deliberately small:
 * the latest headlines only (the league table and results are public pages).
 */
export async function MembersPreview({ path }: { path: string }) {
  const body = await previewFor(path);
  if (!body) return null;
  const data = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: `${SITE_URL}${path}`,
    isAccessibleForFree: false,
    isPartOf: { "@type": ["CreativeWork", "Product"], name: "BOSA League membership", productID: `${new URL(SITE_URL).host}:membership` },
    hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".members-preview" },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
      <div className="members-preview" hidden>
        {body}
      </div>
    </>
  );
}

async function previewFor(path: string) {
  if (path === "/news") {
    const news = visibleTo(await getArticles({ limit: 8 }), false)
      .filter((a) => !a.membersOnly)
      .slice(0, 5);
    return (
      <>
        <h2>Latest BOSA League news</h2>
        <ul>
          {news.map((a) => (
            <li key={a.id}>
              <strong>{a.title}</strong>: {a.excerpt}
            </li>
          ))}
        </ul>
      </>
    );
  }
  return null;
}
