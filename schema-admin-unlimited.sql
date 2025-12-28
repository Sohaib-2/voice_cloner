-- Update admin user to have unlimited credits
UPDATE user_credits
SET total_voice_cloning_chars = 999999999,
    remaining_voice_cloning_chars = 999999999,
    total_tts_chars = 999999999,
    remaining_tts_chars = 999999999,
    current_period_end = current_period_start + (100 * 365 * 24 * 60 * 60 * 1000)
WHERE user_id = (SELECT id FROM users WHERE username = 'Sohaib');

-- Update admin user plan expiry to far future
UPDATE users
SET plan_expires_at = plan_started_at + (100 * 365 * 24 * 60 * 60 * 1000)
WHERE username = 'Sohaib';
