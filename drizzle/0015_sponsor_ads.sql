CREATE TABLE "sponsor_ads" (
	"id" text PRIMARY KEY NOT NULL,
	"sponsor" text NOT NULL,
	"url" text,
	"image" "bytea" NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"placement" text DEFAULT 'ALL' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"starts_on" timestamp with time zone,
	"ends_on" timestamp with time zone,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
