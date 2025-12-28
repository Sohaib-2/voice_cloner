-- Add admin role to users table
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin'));

-- Update existing user Sohaib to admin
UPDATE users SET role = 'admin' WHERE username = 'Sohaib';
