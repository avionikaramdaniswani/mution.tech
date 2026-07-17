#!/usr/bin/env node
import pg from "pg";
const { Client } = pg;
const client = new Client({ connectionString: process.env.SUPABASE_DATABASE_URL });
await client.connect();

// Check referral_code column exists
const { rows: cols } = await client.query(`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'referral_code'
`);
console.log("referral_code column:", cols);

// Show recent users with their credits and referral codes
const { rows: users } = await client.query(`
  SELECT id, email, credits, referral_code, created_at
  FROM users ORDER BY created_at DESC LIMIT 10
`);
console.log("\nRecent users:");
users.forEach(u => console.log(` id=${u.id} email=${u.email} credits=${u.credits} referral_code=${u.referral_code} created=${u.created_at}`));

// Show referrals table
const { rows: refs } = await client.query(`SELECT * FROM referrals ORDER BY created_at DESC LIMIT 10`);
console.log("\nReferrals:", refs);

// Show recent credit_transactions
const { rows: txns } = await client.query(`
  SELECT ct.*, u.email FROM credit_transactions ct
  JOIN users u ON u.id = ct.user_id
  ORDER BY ct.created_at DESC LIMIT 10
`);
console.log("\nRecent credit_transactions:");
txns.forEach(t => console.log(` user=${t.email} type=${t.type} amount=${t.amount} note=${t.note}`));

await client.end();
