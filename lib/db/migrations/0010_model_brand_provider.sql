ALTER TABLE "ai_provider_models" ADD COLUMN IF NOT EXISTS "brand_provider" text;
UPDATE "ai_provider_models"
SET "brand_provider" = CASE
  WHEN lower("model_id" || ' ' || "display_name") LIKE '%claude%' THEN 'Anthropic'
  WHEN lower("model_id" || ' ' || "display_name") LIKE '%gpt%' THEN 'OpenAI'
  WHEN lower("model_id" || ' ' || "display_name") LIKE '%deepseek%' THEN 'DeepSeek'
  WHEN lower("model_id" || ' ' || "display_name") LIKE '%kimi%' OR lower("model_id" || ' ' || "display_name") LIKE '%moonshot%' THEN 'Moonshot AI'
  WHEN lower("model_id" || ' ' || "display_name") LIKE '%minimax%' THEN 'MiniMax'
  WHEN lower("model_id" || ' ' || "display_name") LIKE '%glm%' THEN 'Zhipu AI'
  ELSE 'Other'
END
WHERE "brand_provider" IS NULL;
ALTER TABLE "ai_provider_models" ALTER COLUMN "brand_provider" SET NOT NULL;
