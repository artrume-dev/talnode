-- Migration: Add user preferences to user_profiles table
-- This enables personalized job filtering based on user's industry, location, and job type preferences

ALTER TABLE user_profiles ADD COLUMN preferred_industries TEXT;
ALTER TABLE user_profiles ADD COLUMN preferred_locations TEXT;
ALTER TABLE user_profiles ADD COLUMN preferred_job_types TEXT;

-- Note: These columns store JSON arrays as TEXT
-- Example preferred_industries: '["AI/ML","Product Management","Design Systems"]'
-- Example preferred_locations: '["San Francisco","Remote","New York"]'
-- Example preferred_job_types: '["Full-time","Contract","Remote"]'
