import Link from "next/link";
import clsx from "clsx";
import { Icon } from "@/components/ui";

const ITEMS = [
  { href: "/live", label: "Live centre", icon: "activity" as const },
  { href: "/members/card", label: "Member card", icon: "card" as const },
  { href: "/vote", label: "Vote", icon: "trophy" as const },
  { href: "/gallery", label: "Gallery", icon: "grid" as const },
  { href: "/members/perks", label: "Perks", icon: "sparkle" as const },
];

export function MembersNav({ active }: { active: string }) {
  return (
    <div className="mask-fade-x -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none sm:mx-0 sm:px-0">
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={clsx(
            "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
            active === i.href ? "border-gold/50 bg-gold/10 text-gold" : "border-white/10 text-ivory/70 hover:border-gold/30 hover:text-ivory",
          )}
        >
          <Icon name={i.icon} size={15} /> {i.label}
        </Link>
      ))}
    </div>
  );
}
