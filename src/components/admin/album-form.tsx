import { ActionForm, Field, Submit } from "@/components/form";
import { saveAlbumAction } from "@/app/actions/media";
import { dayKey } from "@/lib/format";

export function AlbumForm({ album }: { album?: { id: string; title: string; description: string | null; matchday: number | null; takenOn: Date | null; published: boolean } }) {
  return (
    <ActionForm action={saveAlbumAction} className="space-y-5" resetOnSuccess={!album}>
      {album && <input type="hidden" name="id" value={album.id} />}
      <Field label="Title">
        <input name="title" className="input" defaultValue={album?.title} placeholder="e.g. Matchday 5 at Henry's Pitch" required />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Matchday (optional)">
          <input name="matchday" type="number" min={1} className="input" defaultValue={album?.matchday ?? ""} />
        </Field>
        <Field label="Date">
          <input name="takenOn" type="date" className="input" defaultValue={album?.takenOn ? dayKey(album.takenOn) : ""} />
        </Field>
      </div>
      <Field label="Description (optional)">
        <textarea name="description" rows={3} className="input" defaultValue={album?.description ?? ""} />
      </Field>
      <label className="flex items-center gap-3 text-sm text-ivory/70">
        <input type="checkbox" name="published" defaultChecked={album?.published ?? true} className="accent-[#CC2654]" /> Visible to members
      </label>
      <Submit>{album ? "Save album" : "Create album"}</Submit>
    </ActionForm>
  );
}
