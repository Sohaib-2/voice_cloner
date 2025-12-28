-- Add delete_at column to recordings table for 12-hour auto-deletion
ALTER TABLE recordings ADD COLUMN delete_at INTEGER NOT NULL DEFAULT 0;

-- Update existing records to set delete_at to 12 hours from creation
UPDATE recordings SET delete_at = created_at + (12 * 60 * 60 * 1000);
