import { db, apiRequestsTable, apiUsageDailyTable } from "@workspace/db";
import { sql } from "drizzle-orm";

async function backfill() {
  console.log("Starting backfill for api_usage_daily...");

  try {
    // We can use a raw SQL query to insert aggregated data from api_requests to api_usage_daily
    const query = sql`
      INSERT INTO api_usage_daily (
        user_id,
        key_id,
        model,
        status,
        date,
        total_requests,
        prompt_tokens,
        completion_tokens,
        cached_tokens,
        total_tokens,
        total_credits
      )
      SELECT 
        user_id,
        COALESCE(key_id, -1) as key_id,
        COALESCE(model, '') as model,
        CASE WHEN success = true THEN 'success' ELSE 'error' END as status,
        DATE(created_at) as date,
        COUNT(*) as total_requests,
        SUM(prompt_tokens) as prompt_tokens,
        SUM(completion_tokens) as completion_tokens,
        SUM(cached_tokens) as cached_tokens,
        SUM(total_tokens) as total_tokens,
        SUM(credits) as total_credits
      FROM api_requests
      GROUP BY 
        user_id,
        COALESCE(key_id, -1),
        COALESCE(model, ''),
        CASE WHEN success = true THEN 'success' ELSE 'error' END,
        DATE(created_at)
      ON CONFLICT (user_id, key_id, model, status, date) 
      DO UPDATE SET
        total_requests = EXCLUDED.total_requests,
        prompt_tokens = EXCLUDED.prompt_tokens,
        completion_tokens = EXCLUDED.completion_tokens,
        cached_tokens = EXCLUDED.cached_tokens,
        total_tokens = EXCLUDED.total_tokens,
        total_credits = EXCLUDED.total_credits;
    `;

    await db.execute(query);
    console.log("Backfill completed successfully!");
  } catch (error) {
    console.error("Backfill failed:", error);
  }
}

backfill().then(() => process.exit(0));
