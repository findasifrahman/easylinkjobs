DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'password_reset_tokens'
  ) THEN
    CREATE TABLE "password_reset_tokens" (
      "id" UUID NOT NULL,
      "user_id" UUID NOT NULL,
      "token_hash" TEXT NOT NULL,
      "expires_at" TIMESTAMPTZ(6) NOT NULL,
      "used_at" TIMESTAMPTZ(6),
      "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
    );
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_key"
  ON "password_reset_tokens"("token_hash");

CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_used_at_idx"
  ON "password_reset_tokens"("user_id", "used_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'password_reset_tokens_user_id_fkey'
  ) THEN
    ALTER TABLE "password_reset_tokens"
      ADD CONSTRAINT "password_reset_tokens_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
