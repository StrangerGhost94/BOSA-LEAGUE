/* eslint-disable @next/next/no-img-element */
import "@fontsource/anton/latin-400.css";
import "@fontsource/barlow-condensed/latin-500.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "@fontsource/kaushan-script/latin-400.css";
import type { CSSProperties, ReactNode } from "react";

/**
 * Match-day graphics in the League office's house style (crimson diagonal bands, navy and white,
 * sponsor strip). Drawn at 1080 x 1350 (Instagram portrait) and saved as PNG or PDF.
 */
export const POSTER_W = 1080;
export const POSTER_H = 1350;

const C = {
  crimson: "#CC2654",
  maroon: "#7A1638",
  wine: "#A51D47",
  navy: "#1B2340",
  pink: "#F9D5DC",
  line: "#E9B7C3",
  white: "#FFFFFF",
};
const HEAD = "'Anton', 'Oswald Variable', sans-serif";
const COND = "'Barlow Condensed', 'Oswald Variable', sans-serif";
const SCRIPT = "'Kaushan Script', cursive";

export type PosterTeam = { name: string; crest: string };
export type TableLine = { position: number; team: PosterTeam; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; goalDifference: number; points: number };
export type MatchLine = { id: string; home: PosterTeam | null; away: PosterTeam | null; kickoff: string; homeScore: number | null; awayScore: number | null; homePens: number | null; awayPens: number | null; status: string };
export type ScorerLine = { name: string; team: PosterTeam; goals: number };

export type PosterSpec =
  | { kind: "table"; season: string; rows: TableLine[]; after?: string }
  | { kind: "fixtures"; season: string; title: string; date: string; matches: MatchLine[]; venue: string }
  | { kind: "results"; season: string; title: string; date: string; matches: MatchLine[]; venue: string }
  | { kind: "scorers"; season: string; rows: ScorerLine[] };

/* ---------------- shared pieces ---------------- */

function Background() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `repeating-linear-gradient(118deg, ${C.crimson} 0 150px, ${C.maroon} 150px 235px, ${C.crimson} 235px 330px, ${C.wine} 330px 385px)`,
        }}
      />
      {/* white swoosh at the top and the corner flash, as on the official graphics */}
      <svg width={POSTER_W} height={POSTER_H} style={{ position: "absolute", inset: 0 }} viewBox={`0 0 ${POSTER_W} ${POSTER_H}`} aria-hidden>
        <path d="M250 0 C 330 70, 560 95, 760 30 L 800 0 Z" fill="#fff" opacity="0.92" />
        <path d="M1080 1215 L 1080 1350 L 1000 1350 Z" fill="#fff" opacity="0.95" />
      </svg>
    </>
  );
}

function Header({ title, subtitle, season }: { title: string; subtitle?: ReactNode; season: string }) {
  return (
    <div style={{ position: "relative", height: 340 }}>
      <img src="/crests/bosa-logo.png" alt="" style={{ position: "absolute", left: 44, top: 30, width: 158 }} />
      <div style={{ position: "absolute", right: 48, top: 64, fontFamily: SCRIPT, fontSize: 64, color: C.white, lineHeight: 1 }}>{season}</div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 128, textAlign: "center", color: C.white }}>
        <div style={{ fontFamily: COND, fontSize: 56, lineHeight: 1, letterSpacing: "-0.5px" }}>
          <span style={{ fontWeight: 800 }}>BOSA</span>
          <span style={{ fontWeight: 500 }}> LEAGUE</span>
        </div>
        <div style={{ fontFamily: HEAD, fontSize: title.length > 13 ? 108 : 118, lineHeight: 1.02, marginTop: 8, textShadow: "0 4px 0 rgba(0,0,0,0.12)" }}>{title}</div>
        {subtitle}
      </div>
    </div>
  );
}

function SponsorStrip({ top }: { top: number }) {
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top, height: 118 }}>
      <div style={{ position: "absolute", inset: "-8px -10px 8px 10px", border: `4px solid ${C.navy}`, borderRadius: 30 }} />
      <div style={{ position: "absolute", inset: 0, background: C.white, borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 26px" }}>
        <img src="/brand/sponsors.png" alt="Bilal Islamic Institute, Weli Travel, SondeStone Hardware, Plasma Designs Atlantis, Hannan Petroleum, Daherz Family Doctors" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
    </div>
  );
}

const icon = (d: string) => (
  <span style={{ width: 34, height: 34, borderRadius: 999, background: C.white, display: "inline-grid", placeItems: "center" }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill={C.crimson} aria-hidden>
      <path d={d} />
    </svg>
  </span>
);
const SOCIAL = [
  "M14 8h3V4h-3c-2.8 0-4 1.7-4 4.2V10H7v4h3v10h4V14h3l1-4h-4V8.6c0-.4.3-.6.6-.6H14z",
  "M12 7.3A4.7 4.7 0 1 0 12 16.7 4.7 4.7 0 0 0 12 7.3zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM7.5 2h9A5.5 5.5 0 0 1 22 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2z",
  "M17.5 3h3.3l-7.2 8.2L22 21h-6.6l-5.2-6.8L4.3 21H1l7.7-8.8L.7 3h6.8l4.7 6.2L17.5 3zm-1.2 16h1.8L6.5 4.9H4.6L16.3 19z",
  "M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.4-1.6.5-3.2.5-4.8s-.1-3.2-.5-4.8zM9.8 15V9l5.8 3-5.8 3z",
];

function Footer({ top, venue }: { top: number; venue?: string }) {
  return (
    <div style={{ position: "absolute", left: 64, right: 110, top, display: "flex", alignItems: "center", justifyContent: "space-between", color: C.white, fontFamily: COND, fontWeight: 600, fontSize: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {SOCIAL.map((d, i) => (
          <span key={i}>{icon(d)}</span>
        ))}
        <span style={{ marginLeft: 10 }}>@bosaleague</span>
      </div>
      {venue ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 23, lineHeight: 1.1, textAlign: "left" }}>
          <svg width="26" height="34" viewBox="0 0 24 32" fill={C.white} aria-hidden>
            <path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.5 12 32 12 32s12-11.5 12-20.3C24 5.2 18.6 0 12 0zm0 16a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
          </svg>
          <span style={{ whiteSpace: "pre-line" }}>{venue}</span>
        </div>
      ) : (
        <span>#bosaleague</span>
      )}
    </div>
  );
}

function Frame({ season, children }: { season: string; children: ReactNode }) {
  return (
    <div style={{ position: "relative", width: POSTER_W, height: POSTER_H, overflow: "hidden", fontFamily: COND, color: C.navy, background: C.crimson }} aria-label={`BOSA League ${season}`}>
      <Background />
      <div style={{ position: "relative", width: "100%", height: "100%" }}>{children}</div>
    </div>
  );
}

/* ---------------- table-style graphics (standings, scorers) ---------------- */

function Grid({ cols, head, rows, top, rowH }: { cols: { w: number; align?: "left" | "center" }[]; head: string[]; rows: ReactNode[][]; top: number; rowH: number }) {
  const cell = (i: number, extra: CSSProperties = {}): CSSProperties => ({
    width: cols[i].w,
    textAlign: cols[i].align ?? "center",
    padding: cols[i].align === "left" ? "0 18px 0 44px" : 0,
    borderLeft: i > 0 ? `2px solid ${C.line}` : undefined,
    display: "flex",
    alignItems: "center",
    justifyContent: cols[i].align === "left" ? "flex-start" : "center",
    height: "100%",
    whiteSpace: "nowrap",
    overflow: "hidden",
    ...extra,
  });
  return (
    <div style={{ position: "absolute", left: (POSTER_W - cols.reduce((a, c) => a + c.w, 0)) / 2, top, borderRadius: 14, overflow: "hidden", boxShadow: "0 10px 30px rgba(40,0,15,0.25)" }}>
      <div style={{ display: "flex", height: 60, background: C.navy, color: C.white, fontWeight: 700, fontSize: 30 }}>
        {head.map((h, i) => (
          <div key={i} style={cell(i, { borderLeft: i > 0 ? "2px solid rgba(255,255,255,0.08)" : undefined })}>
            {h}
          </div>
        ))}
      </div>
      {rows.map((r, ri) => (
        <div key={ri} style={{ display: "flex", height: rowH, background: ri % 2 ? C.pink : C.white, fontWeight: 600, fontSize: 30, borderTop: `2px solid ${C.line}` }}>
          {r.map((v, i) => (
            <div key={i} style={cell(i, i === 0 ? { background: ri % 2 ? "#E24B71" : C.crimson, color: C.white, borderLeft: undefined } : {})}>
              {v}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function TablePoster({ spec }: { spec: Extract<PosterSpec, { kind: "table" }> }) {
  const rows = spec.rows.slice(0, 16);
  const rowH = rows.length > 14 ? 44 : 50;
  const top = 344;
  const tableH = 60 + rows.length * (rowH + 2);
  return (
    <Frame season={spec.season}>
      <Header title="TABLE STANDING" season={spec.season} />
      <Grid
        top={top}
        rowH={rowH}
        cols={[{ w: 96 }, { w: 300, align: "left" }, { w: 66 }, { w: 66 }, { w: 66 }, { w: 66 }, { w: 70 }, { w: 70 }, { w: 76 }, { w: 90 }]}
        head={["POS", "TEAMS", "P", "W", "D", "L", "F", "A", "GD", "PTS"]}
        rows={rows.map((r) => [
          `${r.position}.`,
          r.team.name,
          r.played,
          r.won,
          r.drawn,
          r.lost,
          r.goalsFor,
          r.goalsAgainst,
          r.goalDifference,
          <b key="p" style={{ fontWeight: 800 }}>
            {r.points}
          </b>,
        ])}
      />
      {spec.after && <div style={{ position: "absolute", left: 0, right: 0, top: top + tableH + 10, textAlign: "center", color: C.white, fontWeight: 600, fontSize: 24, opacity: 0.9 }}>{spec.after}</div>}
      <SponsorStrip top={1158} />
      <Footer top={1294} />
    </Frame>
  );
}

function ScorersPoster({ spec }: { spec: Extract<PosterSpec, { kind: "scorers" }> }) {
  const rows = spec.rows.slice(0, 12);
  return (
    <Frame season={spec.season}>
      <Header title="TOP SCORERS" season={spec.season} />
      <Grid
        top={344}
        rowH={52}
        cols={[{ w: 96 }, { w: 390, align: "left" }, { w: 330, align: "left" }, { w: 124 }]}
        head={["POS", "PLAYER", "TEAM", "GOALS"]}
        rows={rows.map((r, i) => {
          const pos = i > 0 && rows[i - 1].goals === r.goals ? "" : `${i + 1}.`;
          return [
            pos || "=",
            r.name,
            <span key="t" style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src={r.team.crest} alt="" style={{ width: 36, height: 36, borderRadius: 999, background: "#fff", objectFit: "contain" }} />
              {r.team.name}
            </span>,
            <b key="g" style={{ fontWeight: 800 }}>
              {r.goals}
            </b>,
          ];
        })}
      />
      <SponsorStrip top={1158} />
      <Footer top={1294} />
    </Frame>
  );
}

/* ---------------- matchday graphics (fixtures, results) ---------------- */

function CrestDisc({ team }: { team: PosterTeam | null }) {
  return (
    <div style={{ width: 88, height: 88, borderRadius: 999, background: C.white, display: "grid", placeItems: "center", boxShadow: "0 6px 16px rgba(40,0,15,0.25)", flexShrink: 0, zIndex: 2 }}>
      {team ? <img src={team.crest} alt="" style={{ width: 70, height: 70, objectFit: "contain" }} /> : <span style={{ fontWeight: 800, fontSize: 26, color: C.navy }}>TBC</span>}
    </div>
  );
}

function MatchRow({ m, results, rowH }: { m: MatchLine; results: boolean; rowH: number }) {
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Kampala", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(m.kickoff)).replace(" ", "").toUpperCase();
  const pill: CSSProperties = { flex: 1, height: 62, background: "#F4F2F4", display: "flex", alignItems: "center", fontWeight: 700, fontSize: 36, color: C.navy, whiteSpace: "nowrap", overflow: "hidden" };
  const played = results && m.homeScore != null && m.awayScore != null;
  const pens = played && m.homePens != null && m.awayPens != null ? `${m.homePens}-${m.awayPens} pens` : null;
  return (
    <div style={{ display: "flex", alignItems: "center", height: rowH, padding: "0 40px" }}>
      <CrestDisc team={m.home} />
      <div style={{ ...pill, marginLeft: -26, paddingLeft: 44, borderRadius: "0 14px 14px 0" }}>{m.home?.name ?? "TBC"}</div>
      <div style={{ width: results ? 136 : 80, height: 80, margin: "0 -14px", borderRadius: results ? 20 : 999, background: results ? C.navy : C.white, display: "grid", placeItems: "center", zIndex: 2, boxShadow: "0 4px 12px rgba(40,0,15,0.2)", flexShrink: 0 }}>
        {results ? (
          <div style={{ textAlign: "center", color: C.white, lineHeight: 1 }}>
            <div style={{ fontFamily: HEAD, fontSize: 42 }}>{played ? `${m.homeScore} - ${m.awayScore}` : "P - P"}</div>
            {pens && <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>{pens}</div>}
          </div>
        ) : (
          <span style={{ fontFamily: HEAD, fontSize: 38, color: C.navy }}>Vs</span>
        )}
      </div>
      <div style={{ ...pill, marginRight: -26, paddingLeft: 30, borderRadius: "14px 0 0 14px" }}>{m.away?.name ?? "TBC"}</div>
      <CrestDisc team={m.away} />
      <div style={{ width: 150, marginLeft: 14, height: 48, borderRadius: 999, border: `3px solid ${C.white}`, display: "grid", placeItems: "center", color: C.white, fontWeight: 600, fontSize: 26, flexShrink: 0 }}>
        {results ? (played ? "FULL TIME" : m.status === "POSTPONED" ? "POSTPONED" : "—") : time}
      </div>
    </div>
  );
}

function MatchdayPoster({ spec }: { spec: Extract<PosterSpec, { kind: "fixtures" | "results" }> }) {
  const results = spec.kind === "results";
  const list = spec.matches.slice(0, 8);
  const rowH = list.length > 7 ? 80 : 90;
  return (
    <Frame season={spec.season}>
      <Header
        season={spec.season}
        title={spec.title.toUpperCase()}
        subtitle={
          <>
            <div style={{ display: "inline-block", marginTop: 6, background: C.navy, color: C.white, fontFamily: HEAD, fontSize: 64, lineHeight: 1, padding: "8px 40px 12px", transform: "rotate(-2deg)", letterSpacing: "2px" }}>{results ? "RESULTS" : "FIXTURE"}</div>
            <div style={{ fontWeight: 700, fontSize: 44, marginTop: 10 }}>{spec.date}</div>
          </>
        }
      />
      <div style={{ position: "absolute", left: 0, right: 0, top: 500 }}>
        {list.map((m) => (
          <MatchRow key={m.id} m={m} results={results} rowH={rowH} />
        ))}
      </div>
      <SponsorStrip top={1150} />
      <Footer top={1285} venue={spec.venue} />
    </Frame>
  );
}

export function Poster({ spec }: { spec: PosterSpec }) {
  if (spec.kind === "table") return <TablePoster spec={spec} />;
  if (spec.kind === "scorers") return <ScorersPoster spec={spec} />;
  return <MatchdayPoster spec={spec} />;
}
