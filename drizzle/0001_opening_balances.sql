ALTER TABLE "matches" ADD COLUMN "counts_in_table" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "base_goals" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "base_assists" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "base_apps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "season_teams" ADD COLUMN "base_played" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "season_teams" ADD COLUMN "base_won" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "season_teams" ADD COLUMN "base_drawn" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "season_teams" ADD COLUMN "base_lost" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "season_teams" ADD COLUMN "base_goals_for" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "season_teams" ADD COLUMN "base_goals_against" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "season_teams" ADD COLUMN "base_form" text DEFAULT '' NOT NULL;