/** Years a person could have completed Bilal Institute, newest first. */
export function completionYears() {
  const now = new Date().getFullYear();
  const out: number[] = [];
  for (let y = now; y >= 1980; y--) out.push(y);
  return out;
}

export function classOf(y?: number | null) {
  return y ? `Class of ${y}` : "";
}
