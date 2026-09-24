/** Re-mounts on every route change, replaying the cinematic curtain and content reveal (pure CSS, so it never blocks first paint). */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div aria-hidden className="route-curtain pointer-events-none fixed inset-0 z-[55] origin-top bg-gradient-to-b from-night-800 via-night-900 to-night-900">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      </div>
      <div className="route-content">{children}</div>
    </>
  );
}
