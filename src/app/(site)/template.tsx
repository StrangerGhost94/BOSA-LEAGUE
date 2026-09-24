/** Re-mounts on every route change for a quick, light fade (pure CSS, no blur, so it stays smooth on phones). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-content">{children}</div>;
}
