export const TEAMS = [
  { slug: "dream-cast", name: "Dream Cast", shortName: "DRC", primary: "#C9A227", secondary: "#141414", intake: 2012 },
  { slug: "sc-m19", name: "SC M19", shortName: "M19", primary: "#1F7A3A", secondary: "#C8102E", intake: 2015 },
  { slug: "karegular", name: "Karegular", shortName: "KRG", primary: "#B3121F", secondary: "#101010", intake: 2010 },
  { slug: "albayan", name: "Albayan", shortName: "ALB", primary: "#23306B", secondary: "#E8E8F0", intake: 2004 },
  { slug: "alnasr", name: "Alnasr", shortName: "NSR", primary: "#13294B", secondary: "#D4A437", intake: 2005 },
  { slug: "osasuna", name: "Osasuna", shortName: "OSA", primary: "#A6192E", secondary: "#1C1C1C", intake: 2018 },
  { slug: "alhilal", name: "Alhilal", shortName: "HIL", primary: "#1B2A5C", secondary: "#E1B12C", intake: 2006 },
  { slug: "ittihad", name: "Ittihad", shortName: "ITT", primary: "#0D0D0D", secondary: "#F2F2F2", intake: 2011 },
  { slug: "elites", name: "Elites", shortName: "ELI", primary: "#2FB9A0", secondary: "#E0457B", intake: 2008 },
  { slug: "la-masia", name: "La Masia", shortName: "LMS", primary: "#1D3B2A", secondary: "#C9A94A", intake: 2013 },
  { slug: "ahal-sunnah", name: "Ahal Sunnah", shortName: "AHS", primary: "#1B2340", secondary: "#A5192E", intake: 2009 },
  { slug: "los-blancos", name: "Los Blancos", shortName: "LBL", primary: "#13204A", secondary: "#C8A24A", intake: 2016 },
  { slug: "golden-jubilee", name: "Golden Jubilee", shortName: "GJB", primary: "#3A9A3F", secondary: "#E6C229", intake: 2014 },
  { slug: "hbm", name: "HBM", shortName: "HBM", primary: "#1E8C4E", secondary: "#F4F4F4", intake: 2007 },
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

/**
 * Scores for Matchdays 1-4, worked out from the official week 1-4 tables (every club's totals match).
 * Matchday 1 Los Blancos v Osasuna: the week 1-2 tables showed 5-0 to Los Blancos, but the week 3 and 4
 * tables only add up with Osasuna winning 3-0, so the latest official figure is used.
 */
export const RESULTS: Record<string, [number, number]> = {
  "1:alnasr:alhilal": [8, 1],
  "1:los-blancos:osasuna": [0, 3],
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
  "3:albayan:osasuna": [3, 1],
  "3:sc-m19:ittihad": [1, 2],
  "3:dream-cast:la-masia": [2, 4],
  "3:karegular:los-blancos": [4, 3],
  "3:alnasr:hbm": [3, 3],
  "3:alhilal:golden-jubilee": [0, 3],
  "3:elites:ahal-sunnah": [1, 3],
  "4:sc-m19:albayan": [2, 2],
  "4:dream-cast:osasuna": [1, 0],
  "4:karegular:ittihad": [1, 4],
  "4:alnasr:la-masia": [3, 1],
  "4:alhilal:los-blancos": [2, 5],
  "4:elites:hbm": [0, 2],
  "4:ahal-sunnah:golden-jubilee": [1, 1],
};

/**
 * Past champions supplied by the League office. Exact match dates are not recorded, so these are
 * kept as roll-of-honour entries rather than dated fixtures. Team names must match TEAMS exactly.
 */
export const HISTORY: { comp: "bosa-league" | "champions-league" | "super-cup"; season: string; year: number; champion: string; runnerUp: string | null; note: string | null }[] = [
  { comp: "bosa-league", season: "Season 1", year: 2023, champion: "Karegular", runnerUp: null, note: null },
  { comp: "bosa-league", season: "Season 2", year: 2024, champion: "Alnasr", runnerUp: null, note: null },
  { comp: "bosa-league", season: "Season 3", year: 2025, champion: "Dream Cast", runnerUp: null, note: null },
  { comp: "champions-league", season: "2023 Edition", year: 2023, champion: "Elites", runnerUp: "Karegular", note: "Final: Karegular 0-0 Elites. Elites won 4-2 on penalties." },
  { comp: "champions-league", season: "2024 Edition", year: 2024, champion: "Karegular", runnerUp: "Alnasr", note: "Final: Karegular 1-0 Alnasr" },
  { comp: "champions-league", season: "2025 Edition", year: 2025, champion: "Golden Jubilee", runnerUp: "Alnasr", note: "Final: Golden Jubilee 2-1 Alnasr" },
  { comp: "super-cup", season: "Season 2", year: 2024, champion: "Elites", runnerUp: "Karegular", note: "Karegular 1-2 Elites" },
  { comp: "super-cup", season: "Season 3", year: 2025, champion: "Alnasr", runnerUp: "Karegular", note: "Alnasr 3-1 Karegular" },
  { comp: "super-cup", season: "Season 4", year: 2026, champion: "Golden Jubilee", runnerUp: "Dream Cast", note: "Dream Cast 0-4 Golden Jubilee" },
];

/**
 * Squad sheets supplied by the clubs. Each line: "Name|Position|Shirt".
 * Position: GK, DEF, MID, FWD, or empty when the club did not give one. Shirt: empty when not given.
 */
export const SQUADS: { slug: Slug; coach: string; captain?: string; assistant?: string; players: string[] }[] = [
  {
    slug: "los-blancos",
    coach: "Swaleh Munez",
    players: [
      "Kabali Akram", "Kiguli Ramathan", "Katende Ashiraf", "Bulega Sulaiman", "Ssessanga Muzafar", "Muweesi Abdul", "Kakinda Fahim", "Bin Juma", "Shahab Muhammad",
      "Kateregga Ashiraf", "Kaliika Abdulrahiim", "Nsubuga Abdulrashid", "Kayima Favor", "Idris Affi", "Harrison Hariliki", "Closet", "Hassan Kizza", "Hamza Brater",
    ],
  },
  {
    slug: "dream-cast",
    coach: "Kaddu Juma",
    players: [
      "Shamran Semujju|GK", "Hamza Katende|GK", "Nyombi Shafic|GK", "Bruhan Sembatya|DEF", "Shabiib Sebagala|DEF", "Juma Seguya|DEF", "Kakembo Shafic|DEF",
      "Senyomo Juma|MID", "Hasan Wahib|MID", "Adam Nsubuga|MID", "Lwere Hamidu|MID", "Doka Yusuf|FWD", "Semakula Fauzan|FWD", "Kugonza Bashir|FWD",
      "Magala Farid|MID", "Kasibante Latif|MID", "Kiggundu Huzaifa|MID", "Masimbi Karim|MID", "Kawuki Shafic|FWD", "Hamdan Idris|DEF",
    ],
  },
  {
    slug: "karegular",
    coach: "Kintu Hamza",
    players: [
      "Sinaan|MID|8", "Abaas Salman|FWD|10", "Mubiru|DEF|55", "Swabur|DEF|3", "Swidiiq|DEF|4", "Swalleh|DEF|16", "Mubarak|DEF|14", "Semakula|MID|21", "Mahad|MID|11",
      "Umar Musinguzi|MID|5", "Kalyango Haroona|FWD|9", "Wahab Tumkye|GK|1", "Ismael Sebalamu|FWD|25", "Lumansi Wakoli|MID|6", "Ssozi Muhammad|FWD|7", "Kanyana|MID|20",
      "Ssemanda Bashir|DEF|27", "Nasibu|MID|28", "Muwonge|FWD|12", "Katumba|FWD|15", "Basti Mawanda|MID|16", "Kiwuuwa|DEF|36", "Bahiga|MID|23", "Mansu|MID|17",
      "Najim|MID|26", "Kaddu|DEF|44", "Mukasa|DEF|43", "Mujib|FWD|18", "Matovu Haroona|DEF|29", "Kabuubi|MID|33", "Lugaizi|DEF|31", "Nsamba|FWD|90",
      "Saadi Mawazo|FWD|37", "Semuwemba|MID|88", "Miyingo|DEF|61",
    ],
  },
  {
    slug: "albayan",
    coach: "Kayizzi Jumah",
    players: [
      "Mulindwa Sharif|MID", "Kugonza|DEF", "Seguya Umar|DEF", "Kibirango Umar|FWD", "Mustapha Faris|MID", "Kisitu Hamza|DEF", "Kisegerwa Rashid|DEF",
      "Mulondo Faiswali|FWD", "Balaba Juma|DEF", "Tamale Shaban|DEF", "Segujja Abduswamaddu Mahrezi|MID", "Luzige Azizi|MID", "Kitooke Abdallah|MID", "Hamza|GK",
      "Hamza|MID", "Kayiwa Akram|FWD", "Nsambu Arafat|DEF", "Mugerwa Adam|GK", "Kasule Abdul|DEF", "Mutebi Hafidhu|MID", "Kiremye Sadam|DEF", "Senyange Mustapha|FWD",
      "Wejuli Ramadhan|FWD", "Seremba Umar|DEF", "Muwanika Amin|FWD", "Bakulumpagi Aksam|DEF", "Mukera Hamzah|MID", "Saidina|DEF", "Lukeberwa Mubarak|DEF",
      "Namwanja|DEF",
    ],
  },
  {
    slug: "alhilal",
    coach: "Mujukira Utheimin",
    captain: "Jagwe Zakaria",
    assistant: "Rabiibu Ssali",
    players: [
      "Jagwe Zakaria", "Ssentamu Ibrahim Mushrifu", "Mahmoud Issa Mamu", "Muhammad Badru Byarufu Medico", "Kawenja Usama", "Kiddu Jamilu", "Umar Nsubuga",
      "Ashiraf Mubiru", "Mawanda Faisal", "Ssekabira Ishaaq", "Famao Muhammad", "Walugembe Abu", "Kagimu Ibrahim", "Kityamuweesi Ashiraf Mahabuba",
      "Kikambi AbduSalaam", "Ssempala Abdallah", "Ukasha Luswata", "Ausi Kibowa", "Muwayi Abdallah Waiswa", "Namuyimba Jamiil", "Kiweewa AbdulHakim",
      "Balijula Farouque", "Jamal Jjemba", "Kanyama Abdulnassir Huzaifa", "Rabiibu Ssali", "Ziwa Saddam", "AbduSwabur Muhammad", "Buraida Twaha", "Jagwe Abdrahman",
      "Dauda Kisamba", "Huzaifa Adam", "Katongole Ibrahim Bakyase", "Mpanga Kasim", "Mulumba Abdulwahab", "Nkolawano Rashid", "Kayemba Shuaib", "Ssekikubo Mikhdad",
      "Suphian Kazibwe", "Kasoma Najib",
    ],
  },
];

/** Earlier placeholder entries that are the same person as a squad player: [club, old name, name on the squad sheet]. */
export const PLAYER_RENAMES: [Slug, string, string][] = [["dream-cast", "Iwere", "Lwere Hamidu"]];
