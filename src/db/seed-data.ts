export const TEAMS = [
  { slug: "dream-cast", name: "Dream Cast", shortName: "DRC", primary: "#C9A227", secondary: "#141414" },
  { slug: "sc-m19", name: "SC M19", shortName: "M19", primary: "#1F7A3A", secondary: "#C8102E" },
  { slug: "karegular", name: "Karegular", shortName: "KRG", primary: "#B3121F", secondary: "#101010" },
  { slug: "albayan", name: "Albayan", shortName: "ALB", primary: "#23306B", secondary: "#E8E8F0" },
  { slug: "alnasr", name: "Alnasr", shortName: "NSR", primary: "#13294B", secondary: "#D4A437" },
  { slug: "osasuna", name: "Osasuna", shortName: "OSA", primary: "#A6192E", secondary: "#1C1C1C" },
  { slug: "alhilal", name: "Alhilal", shortName: "HIL", primary: "#1B2A5C", secondary: "#E1B12C" },
  { slug: "ittihad", name: "Ittihad", shortName: "ITT", primary: "#0D0D0D", secondary: "#F2F2F2" },
  { slug: "elites", name: "Elites", shortName: "ELI", primary: "#2FB9A0", secondary: "#E0457B" },
  { slug: "la-masia", name: "La Masia", shortName: "LMS", primary: "#1D3B2A", secondary: "#C9A94A" },
  { slug: "ahal-sunnah", name: "Ahal Sunnah", shortName: "AHS", primary: "#1B2340", secondary: "#A5192E" },
  { slug: "los-blancos", name: "Los Blancos", shortName: "LBL", primary: "#13204A", secondary: "#C8A24A" },
  { slug: "golden-jubilee", name: "Golden Jubilee", shortName: "GJB", primary: "#3A9A3F", secondary: "#E6C229" },
  { slug: "hbm", name: "HBM", shortName: "HBM", primary: "#1E8C4E", secondary: "#F4F4F4" },
] as const;

type Slug = (typeof TEAMS)[number]["slug"];

/** Official BOSA League table after Matchday 4 (Season 4). Form is Matchday 1 to 4, oldest first. */
export const OFFICIAL_TABLE: { slug: Slug; p: number; w: number; d: number; l: number; f: number; a: number; form: string }[] = [
  { slug: "ittihad", p: 4, w: 4, d: 0, l: 0, f: 13, a: 4, form: "WWWW" },
  { slug: "albayan", p: 4, w: 3, d: 1, l: 0, f: 11, a: 4, form: "WWWD" },
  { slug: "golden-jubilee", p: 4, w: 2, d: 2, l: 0, f: 10, a: 2, form: "DWWD" },
  { slug: "alnasr", p: 4, w: 2, d: 1, l: 1, f: 14, a: 8, form: "WLDW" },
  { slug: "ahal-sunnah", p: 4, w: 2, d: 1, l: 1, f: 7, a: 3, form: "LWWD" },
  { slug: "dream-cast", p: 4, w: 2, d: 1, l: 1, f: 5, a: 5, form: "WDLW" },
  { slug: "elites", p: 4, w: 2, d: 0, l: 2, f: 11, a: 9, form: "WWLL" },
  { slug: "sc-m19", p: 4, w: 1, d: 2, l: 1, f: 8, a: 8, form: "DWLD" },
  { slug: "hbm", p: 4, w: 1, d: 2, l: 1, f: 6, a: 7, form: "LDDW" },
  { slug: "los-blancos", p: 4, w: 1, d: 0, l: 3, f: 10, a: 12, form: "WLLL" },
  { slug: "osasuna", p: 4, w: 1, d: 0, l: 3, f: 6, a: 8, form: "LLWL" },
  { slug: "la-masia", p: 4, w: 1, d: 0, l: 3, f: 6, a: 11, form: "LLWL" },
  { slug: "karegular", p: 4, w: 1, d: 0, l: 3, f: 7, a: 16, form: "LLWL" },
  { slug: "alhilal", p: 4, w: 0, d: 0, l: 4, f: 5, a: 21, form: "LLLL" },
];

/** Current top scorers: [first name, last name, club, goals] exactly as published. */
export const TOP_SCORERS: [string, string, Slug, number][] = [
  ["Chimutayi", "Nasur", "ittihad", 6],
  ["Sudaisi", "Muwonge", "la-masia", 5],
  ["Tariq", "Uthuman", "hbm", 5],
  ["Lutaaya", "Bongole", "alnasr", 4],
  ["Luzige", "Azizi", "albayan", 4],
  ["Mpanga", "Huzaifah", "ittihad", 4],
  ["Tusiimire", "Shafiq", "sc-m19", 4],
  ["Marouf", "Mwanje", "golden-jubilee", 4],
  ["Ssetimba", "Ashiraf", "elites", 3],
  ["Kasirivu", "Swaburu", "elites", 3],
  ["Wakida", "Asuman", "alnasr", 3],
  ["Iwere", "", "dream-cast", 3],
  ["Asda", "Twaha", "alnasr", 3],
];

/** [matchday, date, [home, away, kick-off]] from the published Season 4 schedule. */
export const FIXTURES: [number, string, [Slug, Slug, string][]][] = [
  // Matchday 1: pairings worked out from the week 1 table (kick-off order not published)
  [1, "2026-08-30", [
    ["alnasr", "alhilal", "10:00"],
    ["los-blancos", "osasuna", "11:00"],
    ["elites", "karegular", "12:00"],
    ["ittihad", "la-masia", "13:00"],
    ["albayan", "hbm", "14:00"],
    ["dream-cast", "ahal-sunnah", "15:00"],
    ["sc-m19", "golden-jubilee", "16:00"],
  ]],
  [2, "2026-09-06", [
    ["ittihad", "osasuna", "10:00"],
    ["albayan", "la-masia", "11:00"],
    ["sc-m19", "los-blancos", "12:00"],
    ["dream-cast", "hbm", "13:00"],
    ["karegular", "golden-jubilee", "14:00"],
    ["alnasr", "ahal-sunnah", "15:00"],
    ["alhilal", "elites", "16:00"],
  ]],
  [3, "2026-09-13", [
    ["albayan", "osasuna", "10:00"],
    ["sc-m19", "ittihad", "11:00"],
    ["dream-cast", "la-masia", "12:00"],
    ["karegular", "los-blancos", "13:00"],
    ["alnasr", "hbm", "14:00"],
    ["alhilal", "golden-jubilee", "15:00"],
    ["elites", "ahal-sunnah", "16:00"],
  ]],
  [4, "2026-09-20", [
    ["sc-m19", "albayan", "10:00"],
    ["dream-cast", "osasuna", "11:00"],
    ["karegular", "ittihad", "12:00"],
    ["alnasr", "la-masia", "13:00"],
    ["alhilal", "los-blancos", "14:00"],
    ["elites", "hbm", "15:00"],
    ["ahal-sunnah", "golden-jubilee", "16:00"],
  ]],
  [5, "2026-09-27", [
    ["dream-cast", "sc-m19", "10:00"],
    ["karegular", "albayan", "11:00"],
    ["alnasr", "osasuna", "12:00"],
    ["alhilal", "ittihad", "13:00"],
    ["elites", "la-masia", "14:00"],
    ["ahal-sunnah", "los-blancos", "15:00"],
    ["golden-jubilee", "hbm", "16:00"],
  ]],
  [6, "2026-10-04", [
    ["karegular", "dream-cast", "10:00"],
    ["alnasr", "sc-m19", "11:00"],
    ["alhilal", "albayan", "12:00"],
    ["elites", "osasuna", "13:00"],
    ["ahal-sunnah", "ittihad", "14:00"],
    ["golden-jubilee", "la-masia", "15:00"],
    ["hbm", "los-blancos", "16:00"],
  ]],
  [7, "2026-10-11", [
    ["alnasr", "karegular", "10:00"],
    ["alhilal", "dream-cast", "11:00"],
    ["elites", "sc-m19", "12:00"],
    ["ahal-sunnah", "albayan", "13:00"],
    ["golden-jubilee", "osasuna", "14:00"],
    ["hbm", "ittihad", "15:00"],
    ["los-blancos", "la-masia", "16:00"],
  ]],
  // Published as "8th/10/2026"; placed on Sunday 18 October, the week after Matchday 7
  [8, "2026-10-18", [
    ["alnasr", "los-blancos", "10:00"],
    ["hbm", "la-masia", "11:00"],
    ["ahal-sunnah", "karegular", "12:00"],
    ["alhilal", "osasuna", "13:00"],
    ["golden-jubilee", "sc-m19", "14:00"],
    ["albayan", "elites", "15:00"],
    ["dream-cast", "ittihad", "16:00"],
  ]],
];

/** Scores for Matchdays 1 and 2, worked out from the official week 1 and week 2 tables. */
export const RESULTS: Record<string, [number, number]> = {
  "1:alnasr:alhilal": [8, 1],
  "1:los-blancos:osasuna": [5, 0],
  "1:elites:karegular": [5, 2],
  "1:ittihad:la-masia": [3, 0],
  "1:albayan:hbm": [3, 0],
  "1:dream-cast:ahal-sunnah": [1, 0],
  "1:sc-m19:golden-jubilee": [2, 2],
  "2:ittihad:osasuna": [4, 2],
  "2:albayan:la-masia": [3, 1],
  "2:sc-m19:los-blancos": [3, 2],
  "2:dream-cast:hbm": [1, 1],
  "2:karegular:golden-jubilee": [0, 4],
  "2:alnasr:ahal-sunnah": [0, 3],
  "2:alhilal:elites": [2, 5],
};
