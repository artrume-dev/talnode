-- Add strong_matches and gaps columns to jobs table for detailed alignment analysis
ALTER TABLE jobs ADD COLUMN strong_matches TEXT;
ALTER TABLE jobs ADD COLUMN gaps TEXT;
