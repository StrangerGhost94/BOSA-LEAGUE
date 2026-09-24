import { ActionForm, Field, Submit } from "@/components/form";
import { saveArticleAction } from "@/app/actions/admin";
import { CATEGORY_LABEL, toLocalInput } from "@/lib/format";
import type { Article } from "@/db/schema";

export function ArticleForm({ article, teams, comps }: { article?: Article; teams: { id: string; name: string }[]; comps: { id: string; name: string }[] }) {
  return (
    <ActionForm action={saveArticleAction} className="grid gap-5 lg:grid-cols-[1fr_320px]">
      {article && <input type="hidden" name="id" value={article.id} />}
      <div className="space-y-5">
        <Field label="Headline">
          <input name="title" className="input font-serif text-xl" defaultValue={article?.title} required />
        </Field>
        <Field label="Standfirst (summary shown on cards)">
          <textarea name="excerpt" rows={2} className="input" defaultValue={article?.excerpt} />
        </Field>
        <Field label="Story">
          <textarea name="body" rows={16} className="input leading-relaxed" defaultValue={article?.body} placeholder="Separate paragraphs with a blank line." required />
        </Field>
      </div>
      <div className="space-y-5">
        <div className="panel space-y-5 p-5">
          <Field label="Category">
            <select name="category" className="input" defaultValue={article?.category ?? "ANNOUNCEMENT"}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Competition">
            <select name="competitionId" className="input" defaultValue={article?.competitionId ?? ""}>
              <option value="">None</option>
              {comps.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Club">
            <select name="teamId" className="input" defaultValue={article?.teamId ?? ""}>
              <option value="">None</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Members first until (optional)">
            <input name="publicFrom" type="datetime-local" className="input" defaultValue={article?.publicFrom ? toLocalInput(article.publicFrom) : ""} />
          </Field>
          <Field label="Byline">
            <input name="authorName" className="input" defaultValue={article?.authorName ?? "BOSA Newsroom"} />
          </Field>
          <div className="space-y-3 text-sm text-ivory/75">
            <label className="flex items-center gap-3">
              <input type="checkbox" name="published" defaultChecked={article?.published ?? true} className="accent-[#CC2654]" /> Published
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" name="featured" defaultChecked={article?.featured} className="accent-[#CC2654]" /> Featured story
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" name="membersOnly" defaultChecked={article?.membersOnly} className="accent-[#CC2654]" /> Members only
            </label>
          </div>
          <Submit className="btn-primary w-full">{article ? "Save story" : "Publish story"}</Submit>
        </div>
      </div>
    </ActionForm>
  );
}
