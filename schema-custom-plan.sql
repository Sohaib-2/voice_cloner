-- Migration to add 'custom' plan support
-- This allows the database to accept custom plan users

-- Drop the existing CHECK constraint and recreate with 'custom' included
-- Note: SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Step 1: Create new users table with updated constraint
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
);

-- Step 2: Copy existing data
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
FROM users;

-- Step 3: Drop old table
DROP TABLE users;

-- Step 4: Rename new table
ALTER TABLE users_new RENAME TO users;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
