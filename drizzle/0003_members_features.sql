CREATE TABLE "albums" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"matchday" integer,
	"season_id" text,
	"taken_on" timestamp with time zone,
	"cover_id" text,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"album_id" text NOT NULL,
	"kind" text DEFAULT 'PHOTO' NOT NULL,
	"caption" text,
	"video_url" text,
	"mime" text,
	"width" integer,
	"height" integer,
	"full" "bytea",
	"thumb" "bytea",
	"teaser" "bytea",
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "perks" (
	"id" text PRIMARY KEY NOT NULL,
	"sponsor" text NOT NULL,
	"offer" text NOT NULL,
	"details" text,
	"active" boolean DEFAULT true NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"match_id" text,
	"month" text,
	"user_id" text NOT NULL,
	"player_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "public_from" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "public_from" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "member_number" integer;--> statement-breakpoint
ALTER TABLE "albums" ADD CONSTRAINT "albums_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_album_idx" ON "media" USING btree ("album_id");--> statement-breakpoint
CREATE UNIQUE INDEX "votes_match_user" ON "votes" USING btree ("match_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "votes_month_user" ON "votes" USING btree ("month","user_id");--> statement-breakpoint
CREATE INDEX "votes_player_idx" ON "votes" USING btree ("player_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_member_number_unique" UNIQUE("member_number");