const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL
  });
  await client.connect();

  try {
    console.log("Adding ban columns to users...");
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS banned_at timestamp,
      ADD COLUMN IF NOT EXISTS banned_until timestamp,
      ADD COLUMN IF NOT EXISTS ban_reason text;
    `);
    console.log("Successfully added ban columns to users");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

migrate();
