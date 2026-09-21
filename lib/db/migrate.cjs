const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();

  try {
    console.log("Adding columns to ai_provider_settings...");
    await client.query(`
      ALTER TABLE ai_provider_settings
      ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS base_url text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS api_key_encrypted text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'generic',
      ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now(),
      ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();
    `);
    console.log("Successfully migrated ai_provider_settings");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

migrate();
