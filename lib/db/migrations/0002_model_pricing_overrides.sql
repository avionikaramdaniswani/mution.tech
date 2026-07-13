CREATE TYPE "public"."pricing_mode" AS ENUM('default', 'discount_percent', 'fixed_price', 'free');--> statement-breakpoint
CREATE TABLE "model_pricing_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_id" text NOT NULL,
	"mode" "pricing_mode" DEFAULT 'default' NOT NULL,
	"discount_percent" integer,
	"input_price_override" numeric(20, 10),
	"output_price_override" numeric(20, 10),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	CONSTRAINT "model_pricing_overrides_model_id_unique" UNIQUE("model_id")
);--> statement-breakpoint
ALTER TABLE "model_pricing_overrides" ADD CONSTRAINT "model_pricing_overrides_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
