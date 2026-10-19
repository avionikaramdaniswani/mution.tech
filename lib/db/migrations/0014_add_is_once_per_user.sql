ALTER TABLE "credit_packages" ADD COLUMN "is_once_per_user" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "token_packages" ADD COLUMN "is_once_per_user" boolean DEFAULT false NOT NULL;
