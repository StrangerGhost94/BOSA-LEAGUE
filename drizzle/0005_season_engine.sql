ALTER TABLE "teams" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "withdrawn_at" timestamp with time zone;