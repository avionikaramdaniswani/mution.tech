const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = env.split('\n').find(l => l.startsWith('SUPABASE_DATABASE_URL=') || l.startsWith('DATABASE_URL='));
if (!dbUrlMatch) throw new Error("DATABASE_URL not found");
const dbUrl = dbUrlMatch.split('=')[1].trim().replace(/['"]/g, '');

const { Client } = require('pg');
const client = new Client({ connectionString: dbUrl });

client.connect()
  .then(() => client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_id text UNIQUE;'))
  .then(() => {
    console.log('Done successfully!');
    client.end();
  })
  .catch(err => {
    console.error(err);
    client.end();
  });
