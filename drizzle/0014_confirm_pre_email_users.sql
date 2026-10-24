-- Sign-ups made before email sending was switched on (2026-10-24 13:05 UTC) never received a code,
-- so treat them as confirmed instead of asking them to confirm an email we never sent.
UPDATE "users" SET "email_verified_at" = "created_at" WHERE "email_verified_at" IS NULL AND "created_at" < '2026-10-24 13:05:00+00';
