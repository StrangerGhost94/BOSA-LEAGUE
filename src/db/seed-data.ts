export const TEAMS = [
  { slug: "dream-cast", name: "Dream Cast", shortName: "DRC", primary: "#C9A227", secondary: "#141414", campus: "Makerere University", founded: 2019, motto: "Dream it. Cast it.", strength: 70 },
  { slug: "sc-m19", name: "SC M19", shortName: "M19", primary: "#1F7A3A", secondary: "#C8102E", campus: "Kyambogo University", founded: 2019, motto: "Class of nineteen, forever green.", strength: 74 },
  { slug: "karegular", name: "Karegular", shortName: "KRG", primary: "#B3121F", secondary: "#101010", campus: "Makerere University Business School", founded: 2021, motto: "Regular is a standard.", strength: 66 },
  { slug: "albayan", name: "Albayan", shortName: "ALB", primary: "#23306B", secondary: "#E8E8F0", campus: "Islamic University in Uganda, Kampala", founded: 2018, motto: "Clarity in every pass.", strength: 76 },
  { slug: "alnasr", name: "Alnasr", shortName: "NSR", primary: "#13294B", secondary: "#D4A437", campus: "Kampala International University", founded: 2005, motto: "Victory is earned.", strength: 80 },
  { slug: "osasuna", name: "Osasuna", shortName: "OSA", primary: "#A6192E", secondary: "#1C1C1C", campus: "Ndejje University, Kampala Campus", founded: 2020, motto: "Strength and honour.", strength: 69 },
  { slug: "alhilal", name: "Alhilal", shortName: "HIL", primary: "#1B2A5C", secondary: "#E1B12C", campus: "Islamic University in Uganda, Kampala", founded: 2016, motto: "Rise like the crescent.", strength: 84 },
  { slug: "ittihad", name: "Ittihad", shortName: "ITT", primary: "#0D0D0D", secondary: "#F2F2F2", campus: "Kampala University", founded: 2018, motto: "Together, united.", strength: 72 },
  { slug: "elites", name: "Elites", shortName: "ELI", primary: "#2FB9A0", secondary: "#E0457B", campus: "Victoria University", founded: 2022, motto: "Above the ordinary.", strength: 63 },
  { slug: "la-masia", name: "La Masia", shortName: "LMS", primary: "#1D3B2A", secondary: "#C9A94A", campus: "Uganda Christian University, Kampala", founded: 2017, motto: "United stands.", strength: 82 },
  { slug: "ahal-sunnah", name: "Ahal Sunnah", shortName: "AHS", primary: "#1B2340", secondary: "#A5192E", campus: "Islamic University in Uganda, Kampala", founded: 2015, motto: "Discipline. Brotherhood. Excellence.", strength: 78 },
  { slug: "los-blancos", name: "Los Blancos", shortName: "LBL", primary: "#13204A", secondary: "#C8A24A", campus: "Cavendish University", founded: 2016, motto: "Wear white, play gold.", strength: 81 },
  { slug: "golden-jubilee", name: "Golden Jubilee", shortName: "GJB", primary: "#3A9A3F", secondary: "#E6C229", campus: "Nkumba University, Kampala", founded: 2014, motto: "Fifty years of heart.", strength: 67 },
  { slug: "hbm", name: "HBM", shortName: "HBM", primary: "#1E8C4E", secondary: "#F4F4F4", campus: "Kampala International University", founded: 2020, motto: "Hard work beats magic.", strength: 71 },
] as const;

/** Matchday 5 exactly as published on the official poster (27 Sept 2026, Henry's Pitch). */
export const MATCHDAY5 = [
  ["dream-cast", "sc-m19", "10:00"],
  ["karegular", "albayan", "11:00"],
  ["alnasr", "osasuna", "12:00"],
  ["alhilal", "ittihad", "13:00"],
  ["elites", "la-masia", "14:00"],
  ["ahal-sunnah", "los-blancos", "15:00"],
  ["golden-jubilee", "hbm", "16:00"],
] as const;

export const FIRST_NAMES = [
  "Abdul", "Hamza", "Ismail", "Yusuf", "Ibrahim", "Shafik", "Faizal", "Swaibu", "Musa", "Ali", "Umar", "Haruna",
  "Twaha", "Rashid", "Sulaiman", "Hakim", "Bashir", "Kassim", "Muhammad", "Arafat", "Siraje", "Nasser", "Ramadhan",
  "Shakul", "Zakaria", "Brian", "Joseph", "Isaac", "Ronald", "Denis", "Allan", "Ivan", "Emmanuel", "Derrick",
  "Samuel", "Moses", "Patrick", "Joel", "Collins", "Edgar", "Timothy", "Hussein", "Idris", "Jamal", "Karim",
  "Mahad", "Nuhu", "Rayan", "Salim", "Tariq", "Uthman", "Yahya", "Zubair", "Aziz", "Bilal", "Hassan",
];

export const LAST_NAMES = [
  "Ssemakula", "Mugisha", "Kato", "Lubega", "Ssebaggala", "Nsubuga", "Mukasa", "Kiggundu", "Wasswa", "Katende",
  "Ssali", "Mayanja", "Kasozi", "Nakibinge", "Ssekitoleko", "Muwonge", "Ssenyonga", "Kawooya", "Magezi",
  "Byaruhanga", "Tumusiime", "Okello", "Onyango", "Waiswa", "Mutebi", "Kalungi", "Bukenya", "Sserunjogi",
  "Matovu", "Kyeyune", "Lwanga", "Kigozi", "Ntale", "Ssempijja", "Kizito", "Walusimbi", "Nsereko", "Kayondo",
  "Musoke", "Batte", "Kakooza", "Nsamba", "Sentongo", "Mubiru", "Kibirige", "Ssentamu", "Kamya", "Lukwago",
];

export const COURSES = [
  "BSc Computer Science", "Bachelor of Commerce", "BSc Civil Engineering", "Bachelor of Laws", "BA Education",
  "BSc Accounting", "Bachelor of Business Administration", "BSc Information Technology", "Bachelor of Medicine",
  "BA Economics", "BSc Statistics", "Bachelor of Architecture", "BA Mass Communication", "BSc Quantity Surveying",
];
