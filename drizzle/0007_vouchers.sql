CREATE TABLE "vouchers" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"batch" text NOT NULL,
	"status" text DEFAULT 'UNUSED' NOT NULL,
	"used_by_id" text,
	"used_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vouchers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_used_by_id_users_id_fk" FOREIGN KEY ("used_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vouchers_status_idx" ON "vouchers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vouchers_batch_idx" ON "vouchers" USING btree ("batch");