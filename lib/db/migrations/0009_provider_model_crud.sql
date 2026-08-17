ALTER TABLE "ai_provider_models" ADD COLUMN IF NOT EXISTS "display_name" text;
ALTER TABLE "ai_provider_models" ADD COLUMN IF NOT EXISTS "upstream_model_id" text;
UPDATE "ai_provider_models"
SET "display_name" = "model_id", "upstream_model_id" = "model_id"
WHERE "display_name" IS NULL OR "upstream_model_id" IS NULL;
ALTER TABLE "ai_provider_models" ALTER COLUMN "display_name" SET NOT NULL;
ALTER TABLE "ai_provider_models" ALTER COLUMN "upstream_model_id" SET NOT NULL;
