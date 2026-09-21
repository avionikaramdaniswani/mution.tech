CREATE TABLE "ai_provider_models" (
	"provider_id" text NOT NULL,
	"model_id" text NOT NULL,
	"display_name" text NOT NULL,
	"brand_provider" text NOT NULL,
	"upstream_model_id" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_provider_models_provider_id_model_id_pk" PRIMARY KEY("provider_id","model_id")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_orders" ALTER COLUMN "provider" SET DEFAULT 'duitku';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_id" text;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD COLUMN "duitku_reference" text;--> statement-breakpoint
ALTER TABLE "ai_provider_settings" ADD COLUMN "name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_provider_settings" ADD COLUMN "base_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_provider_settings" ADD COLUMN "api_key_encrypted" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_provider_settings" ADD COLUMN "type" text DEFAULT 'generic' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_provider_settings" ADD COLUMN "priority" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_provider_settings" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_google_id_unique" UNIQUE("google_id");