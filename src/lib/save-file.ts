/**
 * Saves a file from the app without navigating away. That matters most in the installed app (PWA):
 * opening a file's address there replaces the app with a viewer that has no way back.
 *
 * iPhone / iPad: the share sheet (Save Image, Save to Files, WhatsApp...). Closing it returns to BOSA.
 * Everywhere else: a normal download that stays on the current page.
 */
export type SaveResult = "shared" | "downloaded" | "cancelled";

function isApple() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export async function saveBlob(blob: Blob, fileName: string, opts: { share?: boolean; title?: string } = {}): Promise<SaveResult> {
  const file = new File([blob], fileName, { type: blob.type || "application/octet-stream" });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  const canShareFile = !!nav.share && !!nav.canShare?.({ files: [file] });
  if (canShareFile && (opts.share || isApple())) {
    try {
      await nav.share({ files: [file], title: opts.title ?? fileName });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
      // Share failed for another reason: fall through to a download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}

/** Fetches a file the server builds (CSV exports) with the signed-in session, then saves it in place. */
export async function downloadFromUrl(url: string, fallbackName = "bosa-export.csv"): Promise<SaveResult> {
  const res = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (!res.ok) throw new Error(res.status === 403 ? "You do not have permission to download this." : "The download failed. Please try again.");
  const cd = res.headers.get("content-disposition") ?? "";
  const name = /filename="?([^";]+)"?/i.exec(cd)?.[1] ?? fallbackName;
  return saveBlob(await res.blob(), name);
}
