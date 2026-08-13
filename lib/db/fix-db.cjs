const { Client } = require('pg');

async function fixEnv() {
  const client = new Client({ connectionString: process.env.SUPABASE_DATABASE_URL });
  await client.connect();
  const res = await client.query(`
    UPDATE env_vars 
    SET value = regexp_replace(value, '^"|"$', '', 'g') 
    WHERE project_id = (SELECT id FROM projects WHERE name = 'mution-tech')
      AND value LIKE '"%"';
  `);
  console.log('Rows updated:', res.rowCount);
  await client.end();
}
fixEnv().catch(console.error);
