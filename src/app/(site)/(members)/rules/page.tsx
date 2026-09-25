import { FadeIn, RevealText, Stagger, StaggerItem } from "@/components/motion";
import { getRules } from "@/lib/data";

export const metadata = { title: "Competition Rules" };

export default async function RulesPage() {
  const rules = await getRules();
  const groups = new Map<string, typeof rules>();
  for (const r of rules) {
    const k = r.competition?.name ?? "All BOSA competitions";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  return (
    <>
      <section className="pb-10 pt-36">
        <div className="container-x">
          <div className="eyebrow">The regulations</div>
          <h1 className="headline mt-6 text-6xl sm:text-8xl">
            <RevealText text="Rules of the game." />
          </h1>
        </div>
      </section>
      <section className="container-x space-y-14">
        {Array.from(groups.entries()).map(([name, list]) => (
          <FadeIn key={name}>
            <h2 className="font-serif text-3xl text-gold-300">{name}</h2>
            <Stagger className="mt-6 grid gap-4 md:grid-cols-2">
              {list.map((r, i) => (
                <StaggerItem key={r.id}>
                  <div className="panel h-full p-6">
                    <div className="font-display text-sm text-gold/70">§ {String(i + 1).padStart(2, "0")}</div>
                    <h3 className="mt-2 font-serif text-2xl">{r.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-ivory/60">{r.body}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </FadeIn>
        ))}
      </section>
    </>
  );
}
