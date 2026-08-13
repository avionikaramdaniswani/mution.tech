CREATE TYPE "public"."ram_tier" AS ENUM('256mb', '512mb', '1gb', '2gb', '4gb', '8gb');--> statement-breakpoint
CREATE TYPE "public"."pricing_mode" AS ENUM('default', 'discount_percent', 'fixed_price', 'free');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('pending', 'rewarded');--> statement-breakpoint
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
);
--> statement-breakpoint
CREATE TABLE "credit_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_idr" integer NOT NULL,
	"credits_amount" integer NOT NULL,
	"bonus_label" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" integer NOT NULL,
	"referee_id" integer NOT NULL,
	"status" "referral_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"rewarded_at" timestamp,
	CONSTRAINT "referrals_referee_id_unique" UNIQUE("referee_id")
);
--> statement-breakpoint
CREATE TABLE "otp_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "credits" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "credits" SET DEFAULT 5000;--> statement-breakpoint
ALTER TABLE "credit_transactions" ALTER COLUMN "amount" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referral_code" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "ram_tier" "ram_tier" DEFAULT '256mb' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "build_command" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "start_command" text;--> statement-breakpoint
ALTER TABLE "model_pricing_overrides" ADD CONSTRAINT "model_pricing_overrides_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code");