import { relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  primaryKey,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core";
import { randomUUID } from "crypto";

const id = () => text("id").primaryKey().$defaultFn(() => randomUUID());
const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const roleEnum = pgEnum("role", [
  "SUPER_ADMIN",
  "LEAGUE_ADMIN",
  "COMPETITION_MANAGER",
  "TEAM_MANAGER",
  "REFEREE",
  "PLAYER",
  "STUDENT_FAN",
  "ALUMNI_FAN",
]);
export const membershipEnum = pgEnum("membership_status", ["NONE", "PENDING", "ACTIVE"]);
export const paymentStatusEnum = pgEnum("payment_status", ["PENDING", "COMPLETED", "FAILED"]);
export const competitionTypeEnum = pgEnum("competition_type", ["LEAGUE", "CHAMPIONS", "SUPER"]);
export const stageEnum = pgEnum("stage", ["LEAGUE", "GROUP", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"]);
export const matchStatusEnum = pgEnum("match_status", [
  "SCHEDULED",
  "LIVE",
  "HALF_TIME",
  "FULL_TIME",
  "POSTPONED",
  "CANCELLED",
]);
export const eventTypeEnum = pgEnum("event_type", [
  "GOAL",
  "PENALTY_GOAL",
  "OWN_GOAL",
  "PENALTY_MISS",
  "YELLOW",
  "SECOND_YELLOW",
  "RED",
  "SUB",
]);
export const positionEnum = pgEnum("position", ["GK", "DEF", "MID", "FWD"]);
export const playerStatusEnum = pgEnum("player_status", [
  "PENDING",
  "ACTIVE",
  "INJURED",
  "SUSPENDED",
  "REJECTED",
  "INACTIVE",
]);
export const affiliationEnum = pgEnum("affiliation", ["STUDENT", "ALUMNI"]);
export const articleCategoryEnum = pgEnum("article_category", [
  "MATCH_REPORT",
  "ANNOUNCEMENT",
  "TRANSFER",
  "COMPETITION",
  "INTERVIEW",
  "EDITORIAL",
]);

export type Role = (typeof roleEnum.enumValues)[number];
export type MatchStatus = (typeof matchStatusEnum.enumValues)[number];
export type EventType = (typeof eventTypeEnum.enumValues)[number];
export type Stage = (typeof stageEnum.enumValues)[number];
export type PlayerStatus = (typeof playerStatusEnum.enumValues)[number];
export type ArticleCategory = (typeof articleCategoryEnum.enumValues)[number];
export type Position = (typeof positionEnum.enumValues)[number];

export const teams = pgTable("teams", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  crest: text("crest").notNull(),
  primaryColor: text("primary_color").notNull(),
  secondaryColor: text("secondary_color").notNull(),
  campus: text("campus").notNull(),
  founded: integer("founded").notNull(),
  motto: text("motto"),
  homeVenue: text("home_venue"),
  coachName: text("coach_name"),
  captainName: text("captain_name"),
  bio: text("bio"),
  // Each club is made up of the old students who joined Bilal Institute in this year
  intakeYear: integer("intake_year"),
  // Clubs that withdraw stay on record (history, players) but are left out of new fixtures
  active: boolean("active").notNull().default(true),
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  createdAt: created(),
});

export const players = pgTable(
  "players",
  {
    id: id(),
    teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    number: integer("number").notNull(),
    // Null when the club has not said where the player plays yet
    position: positionEnum("position"),
    affiliation: affiliationEnum("affiliation").notNull().default("STUDENT"),
    course: text("course"),
    yearOfStudy: text("year_of_study"),
    birthYear: integer("birth_year"),
    status: playerStatusEnum("status").notNull().default("PENDING"),
    statusNote: text("status_note"),
    statusUntil: timestamp("status_until", { withTimezone: true }),
    bio: text("bio"),
    completionYear: integer("completion_year"),
    baseGoals: integer("base_goals").notNull().default(0),
    baseAssists: integer("base_assists").notNull().default(0),
    baseApps: integer("base_apps").notNull().default(0),
    createdAt: created(),
  },
  (t) => [index("players_team_idx").on(t.teamId)],
);

export const users = pgTable("users", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("STUDENT_FAN"),
  university: text("university"),
  completionYear: integer("completion_year"),
  memberNumber: integer("member_number").unique(),
  membership: membershipEnum("membership").notNull().default("NONE"),
  membershipPaidAt: timestamp("membership_paid_at", { withTimezone: true }),
  teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
  playerId: text("player_id")
    .unique()
    .references(() => players.id, { onDelete: "set null" }),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  // Raised on every member sign-in: older sessions on other phones stop working (one phone at a time)
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: created(),
});

/** Every sign-in, used to spot accounts that are being shared. */
export const loginEvents = pgTable(
  "login_events",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    device: text("device").notNull(), // short fingerprint of the browser and phone
    deviceLabel: text("device_label").notNull(), // e.g. "iPhone · Safari"
    ip: text("ip"),
    createdAt: created(),
  },
  (t) => [index("login_events_user_idx").on(t.userId, t.createdAt)],
);

export const payments = pgTable("payments", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("UGX"),
  merchantRef: text("merchant_ref").notNull().unique(),
  orderTrackingId: text("order_tracking_id").unique(),
  status: paymentStatusEnum("status").notNull().default("PENDING"),
  method: text("method"),
  confirmationCode: text("confirmation_code"),
  provider: text("provider").notNull().default("PESAPAL"),
  createdAt: created(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const competitions = pgTable("competitions", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  type: competitionTypeEnum("type").notNull(),
  tagline: text("tagline"),
  description: text("description"),
  order: integer("order").notNull().default(0),
});

export const seasons = pgTable("seasons", {
  id: id(),
  competitionId: text("competition_id")
    .notNull()
    .references(() => competitions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  year: integer("year").notNull(),
  isCurrent: boolean("is_current").notNull().default(false),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  pointsWin: integer("points_win").notNull().default(3),
  pointsDraw: integer("points_draw").notNull().default(1),
  championId: text("champion_id").references(() => teams.id, { onDelete: "set null" }),
  registrationOpen: boolean("registration_open").notNull().default(false),
  registrationNote: text("registration_note"),
  createdAt: created(),
});

export const seasonTeams = pgTable(
  "season_teams",
  {
    seasonId: text("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    pointsAdjustment: integer("points_adjustment").notNull().default(0),
    // Opening balance: results played before match-by-match tracking began (e.g. imported from the official table)
    basePlayed: integer("base_played").notNull().default(0),
    baseWon: integer("base_won").notNull().default(0),
    baseDrawn: integer("base_drawn").notNull().default(0),
    baseLost: integer("base_lost").notNull().default(0),
    baseGoalsFor: integer("base_goals_for").notNull().default(0),
    baseGoalsAgainst: integer("base_goals_against").notNull().default(0),
    baseForm: text("base_form").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.seasonId, t.teamId] })],
);

export const groups = pgTable("groups", {
  id: id(),
  seasonId: text("season_id")
    .notNull()
    .references(() => seasons.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
});

export const groupTeams = pgTable(
  "group_teams",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.teamId] })],
);

export const venues = pgTable("venues", {
  id: id(),
  name: text("name").notNull(),
  area: text("area").notNull(),
  address: text("address"),
  capacity: integer("capacity"),
});

export const matches = pgTable(
  "matches",
  {
    id: id(),
    seasonId: text("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    groupId: text("group_id").references(() => groups.id, { onDelete: "set null" }),
    stage: stageEnum("stage").notNull().default("LEAGUE"),
    round: text("round").notNull(),
    matchday: integer("matchday"),
    bracketSlot: integer("bracket_slot"),
    homeTeamId: text("home_team_id").references(() => teams.id, { onDelete: "set null" }),
    awayTeamId: text("away_team_id").references(() => teams.id, { onDelete: "set null" }),
    kickoff: timestamp("kickoff", { withTimezone: true }).notNull(),
    venueId: text("venue_id").references(() => venues.id, { onDelete: "set null" }),
    refereeId: text("referee_id").references(() => users.id, { onDelete: "set null" }),
    status: matchStatusEnum("status").notNull().default("SCHEDULED"),
    minute: integer("minute"),
    // When the clock was last set (kick-off, second half, manual correction); the live minute counts on from here
    clockAt: timestamp("clock_at", { withTimezone: true }),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    homePens: integer("home_pens"),
    awayPens: integer("away_pens"),
    report: text("report"),
    attendance: integer("attendance"),
    potmId: text("potm_id").references(() => players.id, { onDelete: "set null" }),
    statusNote: text("status_note"),
    countsInTable: boolean("counts_in_table").notNull().default(true),
    // Early access: before this time only members (and staff) can see the fixture
    publicFrom: timestamp("public_from", { withTimezone: true }),
    createdAt: created(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("matches_season_idx").on(t.seasonId, t.matchday), index("matches_kickoff_idx").on(t.kickoff)],
);

export const matchEvents = pgTable(
  "match_events",
  {
    id: id(),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    type: eventTypeEnum("type").notNull(),
    minute: integer("minute").notNull(),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    playerId: text("player_id").references(() => players.id, { onDelete: "set null" }),
    assistId: text("assist_id").references(() => players.id, { onDelete: "set null" }),
    playerOffId: text("player_off_id").references(() => players.id, { onDelete: "set null" }),
    note: text("note"),
    createdAt: created(),
  },
  (t) => [index("events_match_idx").on(t.matchId), index("events_player_idx").on(t.playerId)],
);

export const lineups = pgTable(
  "lineups",
  {
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    teamId: text("team_id").notNull(),
    starter: boolean("starter").notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.playerId] })],
);

export const articles = pgTable("articles", {
  id: id(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  body: text("body").notNull(),
  category: articleCategoryEnum("category").notNull(),
  featured: boolean("featured").notNull().default(false),
  published: boolean("published").notNull().default(true),
  membersOnly: boolean("members_only").notNull().default(false),
  // Early access: members read it straight away, everyone else from this time
  publicFrom: timestamp("public_from", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  readMinutes: integer("read_minutes").notNull().default(3),
  authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
  authorName: text("author_name"),
  competitionId: text("competition_id").references(() => competitions.id, { onDelete: "set null" }),
  teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
  createdAt: created(),
});

export const rules = pgTable("rules", {
  id: id(),
  competitionId: text("competition_id").references(() => competitions.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  order: integer("order").notNull().default(0),
});

export const honours = pgTable("honours", {
  id: id(),
  competitionId: text("competition_id")
    .notNull()
    .references(() => competitions.id, { onDelete: "cascade" }),
  seasonName: text("season_name").notNull(),
  year: integer("year").notNull(),
  champion: text("champion").notNull(),
  runnerUp: text("runner_up"),
  topScorer: text("top_scorer"),
  note: text("note"),
});

export const teamApplications = pgTable("team_applications", {
  id: id(),
  teamName: text("team_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  campus: text("campus").notNull(),
  affiliation: affiliationEnum("affiliation").notNull(),
  squadSize: integer("squad_size"),
  message: text("message"),
  status: text("status").notNull().default("PENDING"),
  createdAt: created(),
});

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: id(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    details: text("details"),
    createdAt: created(),
  },
  (t) => [index("activity_created_idx").on(t.createdAt)],
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/** One-time membership vouchers sold by the League office. Each code activates one membership, once. */
export const vouchers = pgTable(
  "vouchers",
  {
    id: id(),
    code: text("code").notNull().unique(),
    batch: text("batch").notNull(),
    status: text("status").notNull().default("UNUSED"), // UNUSED, USED, VOID
    usedById: text("used_by_id").references(() => users.id, { onDelete: "set null" }),
    usedAt: timestamp("used_at", { withTimezone: true }),
    note: text("note"),
    createdAt: created(),
  },
  (t) => [index("vouchers_status_idx").on(t.status), index("vouchers_batch_idx").on(t.batch)],
);

/* ============================== PUSH NOTIFICATIONS ============================== */

/** One row per phone or browser that allowed notifications. A person can have several. */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    platform: text("platform"), // ios, android, desktop
    browser: text("browser"),
    userAgent: text("user_agent"),
    createdAt: created(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    // Set when the person turns notifications off, signs out, or the push service says the device is gone
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("push_subs_user_idx").on(t.userId)],
);

/** What each person wants to hear about. No row means everything is on. */
export const notificationPreferences = pgTable("notification_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  matchReminders: boolean("match_reminders").notNull().default(true),
  matchResults: boolean("match_results").notNull().default(true),
  goals: boolean("goals").notNull().default(true),
  leagueAnnouncements: boolean("league_announcements").notNull().default(true),
  teamUpdates: boolean("team_updates").notNull().default(true),
  generalNotifications: boolean("general_notifications").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Every notification attempt. A row with a dedupe key and no device is the "claim" that makes
 * automatic notifications (reminders, goals, results) go out once per person, however often the job runs.
 */
export const notificationLogs = pgTable(
  "notification_logs",
  {
    id: id(),
    notificationId: text("notification_id").notNull(), // shared by every row of one send
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: text("subscription_id").references(() => pushSubscriptions.id, { onDelete: "set null" }),
    notificationType: text("notification_type").notNull(),
    status: text("status").notNull().default("queued"), // queued, sent, failed, expired, revoked
    dedupeKey: text("dedupe_key").unique(),
    createdAt: created(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
  },
  (t) => [index("notification_logs_notification_idx").on(t.notificationId), index("notification_logs_created_idx").on(t.createdAt)],
);

export const perks = pgTable("perks", {
  id: id(),
  sponsor: text("sponsor").notNull(),
  offer: text("offer").notNull(),
  details: text("details"),
  active: boolean("active").notNull().default(true),
  order: integer("order").notNull().default(0),
  createdAt: created(),
});

export const votes = pgTable(
  "votes",
  {
    id: id(),
    kind: text("kind").notNull(), // MATCH | MONTH
    matchId: text("match_id").references(() => matches.id, { onDelete: "cascade" }),
    month: text("month"), // YYYY-MM for player of the month
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    playerId: text("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("votes_match_user").on(t.matchId, t.userId),
    uniqueIndex("votes_month_user").on(t.month, t.userId),
    index("votes_player_idx").on(t.playerId),
  ],
);

export const albums = pgTable("albums", {
  id: id(),
  title: text("title").notNull(),
  description: text("description"),
  matchday: integer("matchday"),
  seasonId: text("season_id").references(() => seasons.id, { onDelete: "set null" }),
  takenOn: timestamp("taken_on", { withTimezone: true }),
  coverId: text("cover_id"),
  published: boolean("published").notNull().default(true),
  createdAt: created(),
});

export const media = pgTable(
  "media",
  {
    id: id(),
    albumId: text("album_id")
      .notNull()
      .references(() => albums.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("PHOTO"), // PHOTO | VIDEO
    caption: text("caption"),
    videoUrl: text("video_url"),
    mime: text("mime"),
    width: integer("width"),
    height: integer("height"),
    full: bytea("full"),
    thumb: bytea("thumb"),
    teaser: bytea("teaser"),
    order: integer("order").notNull().default(0),
    createdAt: created(),
  },
  (t) => [index("media_album_idx").on(t.albumId)],
);

/* ---------------- Relations ---------------- */

export const teamsRelations = relations(teams, ({ many }) => ({
  players: many(players),
  staff: many(users),
  homeMatches: many(matches, { relationName: "home" }),
  awayMatches: many(matches, { relationName: "away" }),
  entries: many(seasonTeams),
  groups: many(groupTeams),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  team: one(teams, { fields: [players.teamId], references: [teams.id] }),
  events: many(matchEvents, { relationName: "eventPlayer" }),
  lineups: many(lineups),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  team: one(teams, { fields: [users.teamId], references: [teams.id] }),
  player: one(players, { fields: [users.playerId], references: [players.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
}));

export const competitionsRelations = relations(competitions, ({ many }) => ({
  seasons: many(seasons),
  rules: many(rules),
  honours: many(honours),
}));

export const seasonsRelations = relations(seasons, ({ one, many }) => ({
  competition: one(competitions, { fields: [seasons.competitionId], references: [competitions.id] }),
  champion: one(teams, { fields: [seasons.championId], references: [teams.id] }),
  teams: many(seasonTeams),
  groups: many(groups),
  matches: many(matches),
}));

export const seasonTeamsRelations = relations(seasonTeams, ({ one }) => ({
  season: one(seasons, { fields: [seasonTeams.seasonId], references: [seasons.id] }),
  team: one(teams, { fields: [seasonTeams.teamId], references: [teams.id] }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  season: one(seasons, { fields: [groups.seasonId], references: [seasons.id] }),
  teams: many(groupTeams),
  matches: many(matches),
}));

export const groupTeamsRelations = relations(groupTeams, ({ one }) => ({
  group: one(groups, { fields: [groupTeams.groupId], references: [groups.id] }),
  team: one(teams, { fields: [groupTeams.teamId], references: [teams.id] }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  season: one(seasons, { fields: [matches.seasonId], references: [seasons.id] }),
  group: one(groups, { fields: [matches.groupId], references: [groups.id] }),
  homeTeam: one(teams, { fields: [matches.homeTeamId], references: [teams.id], relationName: "home" }),
  awayTeam: one(teams, { fields: [matches.awayTeamId], references: [teams.id], relationName: "away" }),
  venue: one(venues, { fields: [matches.venueId], references: [venues.id] }),
  referee: one(users, { fields: [matches.refereeId], references: [users.id] }),
  potm: one(players, { fields: [matches.potmId], references: [players.id] }),
  events: many(matchEvents),
  lineups: many(lineups),
}));

export const matchEventsRelations = relations(matchEvents, ({ one }) => ({
  match: one(matches, { fields: [matchEvents.matchId], references: [matches.id] }),
  team: one(teams, { fields: [matchEvents.teamId], references: [teams.id] }),
  player: one(players, { fields: [matchEvents.playerId], references: [players.id], relationName: "eventPlayer" }),
  assist: one(players, { fields: [matchEvents.assistId], references: [players.id], relationName: "eventAssist" }),
  playerOff: one(players, { fields: [matchEvents.playerOffId], references: [players.id], relationName: "eventOff" }),
}));

export const lineupsRelations = relations(lineups, ({ one }) => ({
  match: one(matches, { fields: [lineups.matchId], references: [matches.id] }),
  player: one(players, { fields: [lineups.playerId], references: [players.id] }),
}));

export const venuesRelations = relations(venues, ({ many }) => ({ matches: many(matches) }));

export const articlesRelations = relations(articles, ({ one }) => ({
  competition: one(competitions, { fields: [articles.competitionId], references: [competitions.id] }),
  team: one(teams, { fields: [articles.teamId], references: [teams.id] }),
  author: one(users, { fields: [articles.authorId], references: [users.id] }),
}));

export const rulesRelations = relations(rules, ({ one }) => ({
  competition: one(competitions, { fields: [rules.competitionId], references: [competitions.id] }),
}));

export const honoursRelations = relations(honours, ({ one }) => ({
  competition: one(competitions, { fields: [honours.competitionId], references: [competitions.id] }),
}));

export const activityRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
}));

export const loginEventsRelations = relations(loginEvents, ({ one }) => ({ user: one(users, { fields: [loginEvents.userId], references: [users.id] }) }));

export const vouchersRelations = relations(vouchers, ({ one }) => ({ usedBy: one(users, { fields: [vouchers.usedById], references: [users.id] }) }));

export const albumsRelations = relations(albums, ({ many, one }) => ({
  media: many(media),
  season: one(seasons, { fields: [albums.seasonId], references: [seasons.id] }),
}));
export const mediaRelations = relations(media, ({ one }) => ({ album: one(albums, { fields: [media.albumId], references: [albums.id] }) }));
export const votesRelations = relations(votes, ({ one }) => ({
  player: one(players, { fields: [votes.playerId], references: [players.id] }),
  match: one(matches, { fields: [votes.matchId], references: [matches.id] }),
}));

export type Team = typeof teams.$inferSelect;
export type Player = typeof players.$inferSelect;
export type User = typeof users.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type MatchEvent = typeof matchEvents.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type Season = typeof seasons.$inferSelect;
export type Competition = typeof competitions.$inferSelect;
