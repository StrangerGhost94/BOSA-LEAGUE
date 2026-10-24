ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_code_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_code_expires" timestamp with time zone;--> statement-breakpoint
UPDATE "users" SET "email_verified_at" = "created_at";
