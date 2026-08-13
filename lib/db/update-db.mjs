import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.SUPABASE_DATABASE_URL });

async function run() {
  await client.connect();
  try {
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."ram_tier" AS ENUM('256mb', '512mb', '1gb', '2gb', '4gb', '8gb');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('Enum ram_tier created or already exists');

    await client.query(`ALTER TABLE "users" ALTER COLUMN "credits" TYPE real;`);
    console.log('users.credits converted to real');

    await client.query(`ALTER TABLE "credit_transactions" ALTER COLUMN "amount" TYPE real;`);
    console.log('credit_transactions.amount converted to real');

    await client.query(`ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "ram_tier" "ram_tier" DEFAULT '256mb' NOT NULL;`);
    console.log('projects.ram_tier added');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
