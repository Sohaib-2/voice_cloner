/**
 * Migration script to update D1 database schema to support custom plans
 * Run: node migrate-custom-plan.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const ACCOUNT_ID = env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = env.CLOUDFLARE_API_TOKEN;
const DATABASE_ID = env.DATABASE_ID;

if (!ACCOUNT_ID || !API_TOKEN || !DATABASE_ID) {
  console.error('❌ Error: Missing required environment variables');
  console.error('Required: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, DATABASE_ID');
  process.exit(1);
}

const D1_API_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`;

async function executeSQL(sql) {
  const response = await fetch(D1_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(`SQL execution failed: ${JSON.stringify(result.errors)}`);
  }

  return result;
}

async function runMigration() {
  console.log('🚀 Starting custom plan migration...\n');

  try {
    // Step 1: Check current schema
    console.log('📋 Step 1: Checking current users table...');
    const checkResult = await executeSQL('SELECT name FROM sqlite_master WHERE type="table" AND name="users"');
    if (checkResult.result[0].results.length === 0) {
      console.error('❌ Users table does not exist!');
      process.exit(1);
    }
    console.log('✅ Users table found\n');

    // Step 2: Create new table with updated constraint
    console.log('📋 Step 2: Creating new users table with custom plan support...');
    await executeSQL(`
      CREATE TABLE IF NOT EXISTS users_new (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        current_plan TEXT DEFAULT 'starter' CHECK(current_plan IN ('starter', 'basic', 'pro', 'enterprise', 'custom')),
        plan_started_at INTEGER NOT NULL,
        plan_expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin'))
      )
    `);
    console.log('✅ New users table created\n');

    // Step 3: Copy data
    console.log('📋 Step 3: Copying existing user data...');
    const copyResult = await executeSQL(`
      INSERT INTO users_new (id, username, password, status, current_plan, plan_started_at, plan_expires_at, created_at, role)
      SELECT
        id,
        username,
        password,
        status,
        current_plan,
        plan_started_at,
        plan_expires_at,
        created_at,
        COALESCE(role, 'user') as role
      FROM users
    `);
    const rowsCopied = copyResult.result[0].meta.changes || 0;
    console.log(`✅ Copied ${rowsCopied} user(s)\n`);

    // Step 4: Drop old table
    console.log('📋 Step 4: Dropping old users table...');
    await executeSQL('DROP TABLE users');
    console.log('✅ Old table dropped\n');

    // Step 5: Rename new table
    console.log('📋 Step 5: Renaming new table to users...');
    await executeSQL('ALTER TABLE users_new RENAME TO users');
    console.log('✅ Table renamed\n');

    // Step 6: Recreate indexes
    console.log('📋 Step 6: Recreating indexes...');
    await executeSQL('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    await executeSQL('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)');
    console.log('✅ Indexes recreated\n');

    // Verify migration
    console.log('📋 Step 7: Verifying migration...');
    const verifyResult = await executeSQL('SELECT COUNT(*) as count FROM users');
    const finalCount = verifyResult.result[0].results[0].count;
    console.log(`✅ Verification passed: ${finalCount} user(s) in database\n`);

    console.log('🎉 Migration completed successfully!');
    console.log('✅ Your D1 database now supports custom plans');
    console.log('✅ You can now create users with plan: "custom"\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n⚠️  Your database may be in an inconsistent state.');
    console.error('Please check your D1 dashboard and restore from backup if needed.');
    process.exit(1);
  }
}

runMigration();
