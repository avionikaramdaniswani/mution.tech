CREATE TYPE "public"."user_plan" AS ENUM('hobby', 'pro', 'team');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('idle', 'running', 'stopped', 'building', 'deploying', 'failed');--> statement-breakpoint
CREATE TYPE "public"."runtime" AS ENUM('nodejs', 'python', 'php', 'static');--> statement-breakpoint
CREATE TYPE "public"."deployment_status" AS ENUM('queued', 'building', 'deploying', 'running', 'failed', 'stopped', 'rolled_back');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('topup', 'usage', 'plan_credit');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'expired', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"credits" integer DEFAULT 5000 NOT NULL,
	"plan" "user_plan" DEFAULT 'hobby' NOT NULL,
	"github_access_token" text,
	"github_login" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"repo_url" text,
	"runtime" "runtime" NOT NULL,
	"status" "project_status" DEFAULT 'idle' NOT NULL,
	"domain" text,
	"base_directory" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_deployed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "deployments" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"status" "deployment_status" DEFAULT 'queued' NOT NULL,
	"commit_hash" text,
	"commit_message" text,
	"build_log" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deployed_at" timestamp,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "env_vars" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer,
	"action" text NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"invoice_number" text NOT NULL,
	"amount" integer NOT NULL,
	"credits_amount" integer DEFAULT 0 NOT NULL,
	"provider" text DEFAULT 'tripay' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"payment_url" text,
	"tripay_reference" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp,
	CONSTRAINT "payment_orders_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text DEFAULT 'My API Key' NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_plain" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"total_tokens_used" integer DEFAULT 0 NOT NULL,
	"total_requests_count" integer DEFAULT 0 NOT NULL,
	"total_credits_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"credit_limit" integer,
	"allowed_models" text[],
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "api_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"key_id" integer,
	"model" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"user_id" integer,
	"key_id" integer,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"model" text,
	"provider_id" text,
	"status_code" integer NOT NULL,
	"success" boolean DEFAULT false NOT NULL,
	"error_type" text,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"credits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_requests_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
CREATE TABLE "changelogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"version" text NOT NULL,
	"date" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"changes" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_provider_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coolify_deployments" (
	"id" serial PRIMARY KEY NOT NULL,
	"deployment_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"coolify_deployment_uuid" text NOT NULL,
	"coolify_application_uuid" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coolify_deployments_deployment_id_unique" UNIQUE("deployment_id")
);
--> statement-breakpoint
CREATE TABLE "coolify_resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"coolify_project_uuid" text NOT NULL,
	"coolify_environment_name" text DEFAULT 'production' NOT NULL,
	"coolify_environment_uuid" text,
	"coolify_server_uuid" text NOT NULL,
	"coolify_application_uuid" text,
	"coolify_application_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coolify_resources_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "env_vars" ADD CONSTRAINT "env_vars_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_key_id_api_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_requests" ADD CONSTRAINT "api_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_requests" ADD CONSTRAINT "api_requests_key_id_api_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coolify_deployments" ADD CONSTRAINT "coolify_deployments_deployment_id_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."deployments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coolify_deployments" ADD CONSTRAINT "coolify_deployments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coolify_resources" ADD CONSTRAINT "coolify_resources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_usage_created_at_idx" ON "api_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "api_usage_user_id_idx" ON "api_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_usage_model_idx" ON "api_usage" USING btree ("model");--> statement-breakpoint
CREATE INDEX "api_requests_created_at_idx" ON "api_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "api_requests_user_id_idx" ON "api_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_requests_key_id_idx" ON "api_requests" USING btree ("key_id");--> statement-breakpoint
CREATE INDEX "api_requests_status_code_idx" ON "api_requests" USING btree ("status_code");--> statement-breakpoint
CREATE INDEX "api_requests_success_idx" ON "api_requests" USING btree ("success");--> statement-breakpoint
CREATE INDEX "api_requests_error_type_idx" ON "api_requests" USING btree ("error_type");