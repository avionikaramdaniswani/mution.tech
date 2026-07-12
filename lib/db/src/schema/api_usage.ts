import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { apiKeysTable } from "./api_keys";

/**
 * Catatan pemakaian AI-proxy per-request (terstruktur, untuk analitik admin).
 *
 * Ditulis setiap kali sebuah request `/v1` selesai dan kredit dipotong. Berbeda
 * dari `credit_transactions` yang menyimpan model/token sebagai teks di `note`,
 * tabel ini menyimpan kolom terpisah supaya agregasi (per model, per user, tren
 * harian) akurat dan cepat.
 *
 * `promptTokens`/`completionTokens` bisa 0 bila provider hanya melaporkan total
 * token (mis. beberapa stream OpenAI-compat) — `totalTokens` selalu terisi.
 */
export const apiUsageTable = pgTable(
  "api_usage",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    keyId: integer("key_id").references(() => apiKeysTable.id, { onDelete: "set null" }),
    model: text("model").notNull(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    /**
     * Bagian dari `promptTokens` yang dilaporkan provider sebagai cache hit
     * (mis. `prompt_tokens_details.cached_tokens` OpenAI-compat, atau
     * `cache_read_input_tokens` Anthropic). Murni informasi transparansi ke
     * user — TIDAK memengaruhi kalkulasi kredit/pricing (lihat calculateCredits
     * di v1-proxy.ts, yang tetap pakai promptTokens/completionTokens flat).
     */
    cachedTokens: integer("cached_tokens").notNull().default(0),
    credits: integer("credits").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("api_usage_created_at_idx").on(t.createdAt),
    index("api_usage_user_id_idx").on(t.userId),
    index("api_usage_model_idx").on(t.model),
  ],
);

export type ApiUsage = typeof apiUsageTable.$inferSelect;
