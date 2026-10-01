const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL
  });
  await client.connect();

  try {
    console.log("Adding telegram_id column to users...");
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS telegram_id text UNIQUE;
    `);
    console.log("Successfully added telegram_id column to users");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.end();
  }
}

migrate();
