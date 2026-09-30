const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL
  });
  await client.connect();

  try {
    console.log("Adding backup_api_keys_encrypted column to ai_provider_settings...");
    await client.query(`
      ALTER TABLE ai_provider_settings
      ADD COLUMN IF NOT EXISTS backup_api_keys_encrypted text[];
    `);
    console.log("Successfully added backup_api_keys_encrypted");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

migrate();
