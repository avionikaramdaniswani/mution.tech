CREATE TABLE IF NOT EXISTS "ai_provider_models" (
  "provider_id" text NOT NULL,
  "model_id" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "ai_provider_models_provider_id_model_id_pk" PRIMARY KEY("provider_id", "model_id")
);
