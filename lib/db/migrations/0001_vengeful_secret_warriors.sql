ALTER TABLE "api_usage" ADD COLUMN "cached_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "api_requests" ADD COLUMN "cached_tokens" integer DEFAULT 0 NOT NULL;