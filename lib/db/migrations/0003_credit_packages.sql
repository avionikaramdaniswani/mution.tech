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
INSERT INTO "credit_packages" ("name", "price_idr", "credits_amount", "bonus_label", "is_active", "sort_order") VALUES
('Starter', 25000, 28000, '+12% bonus', true, 1),
('Growth', 75000, 90000, '+20% bonus', true, 2),
('Scale', 200000, 260000, '+30% bonus', true, 3);
