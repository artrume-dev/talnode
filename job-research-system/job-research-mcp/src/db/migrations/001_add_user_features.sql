-- Migration 001: Add User Profiles, CV Management, and Company Customization
-- Created: 2025-11-19
-- Purpose: Enable user profiles, CV uploads, LinkedIn import, custom companies

-- ============================================================================
-- 1. USER PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  linkedin_url TEXT UNIQUE,
  full_name TEXT NOT NULL,
  headline TEXT,
  summary TEXT,
  current_position TEXT,
  years_of_experience INTEGER,
  skills TEXT, -- JSON array
  experience TEXT, -- JSON array of job experiences
  education TEXT, -- JSON array
  raw_data TEXT, -- Full parsed JSON for future use
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_linkedin ON user_profiles(linkedin_url);

-- ============================================================================
-- 2. CV DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS cv_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_profile_id INTEGER,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'docx', 'txt', 'md'
  file_size INTEGER,
  file_path TEXT NOT NULL, -- Server storage path
  parsed_content TEXT, -- Extracted text content
  is_active BOOLEAN DEFAULT 1, -- Only one CV can be active at a time
  uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_profile_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cv_documents_user_id ON cv_documents(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_cv_documents_active ON cv_documents(is_active);

-- ============================================================================
-- 3. CV VARIANTS TABLE (Optimized versions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS cv_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  base_cv_id INTEGER NOT NULL,
  job_id TEXT, -- Reference to jobs table
  variant_type TEXT NOT NULL, -- 'conservative', 'optimized', 'stretch'
  content TEXT NOT NULL, -- Optimized CV content
  alignment_score INTEGER, -- Expected alignment %
  changes TEXT, -- JSON array of changes made
  strong_matches TEXT, -- JSON array of strong points
  gaps TEXT, -- JSON array of gaps to address
  is_final BOOLEAN DEFAULT 0, -- User finalized this variant
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (base_cv_id) REFERENCES cv_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cv_variants_job_id ON cv_variants(job_id);
CREATE INDEX IF NOT EXISTS idx_cv_variants_base_cv ON cv_variants(base_cv_id);

-- ============================================================================
-- 4. CUSTOM COMPANIES TABLE (User-added companies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS custom_companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  careers_url TEXT NOT NULL,
  ats_type TEXT DEFAULT 'custom', -- 'greenhouse', 'lever', 'workday', 'custom'
  greenhouse_id TEXT, -- For Greenhouse-based companies
  lever_id TEXT, -- For Lever-based companies
  is_active BOOLEAN DEFAULT 1, -- User can enable/disable
  added_by_user BOOLEAN DEFAULT 1, -- Distinguish from default companies
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_custom_companies_active ON custom_companies(is_active);

-- ============================================================================
-- 5. JOB SEARCH PREFERENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_search_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_profile_id INTEGER,
  job_keywords TEXT, -- JSON array ['engineer', 'designer', 'manager']
  excluded_keywords TEXT, -- JSON array ['intern', 'junior']
  location_preferences TEXT, -- JSON array ['Remote', 'San Francisco', 'London']
  remote_only BOOLEAN DEFAULT 0,
  salary_min INTEGER,
  salary_max INTEGER,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_profile_id) REFERENCES user_profiles(id) ON DELETE CASCADE
);

-- ============================================================================
-- 6. EXTEND EXISTING TABLES
-- ============================================================================

-- Add columns to jobs table for flexible search
-- Note: ALTER TABLE ADD COLUMN is idempotent in SQLite (will ignore if exists)

-- Search keywords from user's search
CREATE TABLE IF NOT EXISTS jobs_temp AS SELECT * FROM jobs;
DROP TABLE IF EXISTS jobs;
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT UNIQUE NOT NULL,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  tech_stack TEXT,
  location TEXT,
  remote BOOLEAN,
  found_date TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'new',
  priority TEXT DEFAULT 'medium',
  alignment_score REAL,
  notes TEXT,
  last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
  search_keywords TEXT, -- NEW: Keywords that matched this job
  salary_range TEXT, -- NEW: Parsed salary info
  department TEXT, -- NEW: Job department/category
  posted_date TEXT -- NEW: Job posting date (when company posted, vs found_date when we discovered it)
);

-- Copy data from temp table (match existing columns)
INSERT INTO jobs (id, job_id, company, title, url, description, requirements, tech_stack,
  location, remote, found_date, status, priority, alignment_score, notes, last_updated)
SELECT
  id, job_id, company, title, url, description, requirements, tech_stack,
  location, remote, found_date, status, priority, alignment_score, notes, last_updated
FROM jobs_temp;
DROP TABLE jobs_temp;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_jobs_job_id ON jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_keywords ON jobs(search_keywords);

-- ============================================================================
-- 7. SEED DEFAULT COMPANIES
-- ============================================================================

-- Insert default AI companies that come pre-configured
INSERT OR IGNORE INTO custom_companies (company_name, careers_url, ats_type, greenhouse_id, is_active, added_by_user) VALUES
  ('Anthropic', 'https://boards.greenhouse.io/anthropic', 'greenhouse', 'anthropic', 1, 0),
  ('OpenAI', 'https://openai.com/careers', 'custom', NULL, 1, 0),
  ('Vercel', 'https://vercel.com/careers', 'greenhouse', 'vercel', 1, 0),
  ('Cursor', 'https://cursor.com/careers', 'custom', NULL, 1, 0),
  ('Replit', 'https://replit.com/site/careers', 'custom', NULL, 1, 0),
  ('Perplexity', 'https://www.perplexity.ai/hub/careers', 'custom', NULL, 1, 0),
  ('Hugging Face', 'https://huggingface.co/jobs', 'lever', 'huggingface', 1, 0),
  ('Midjourney', 'https://www.midjourney.com/jobs', 'custom', NULL, 1, 0),
  ('Stability AI', 'https://stability.ai/careers', 'greenhouse', 'stabilityai', 1, 0),
  ('Scale AI', 'https://scale.com/careers', 'greenhouse', 'scaleai', 1, 0),
  ('Cohere', 'https://cohere.com/careers', 'greenhouse', 'cohere', 1, 0),
  ('Character.AI', 'https://character.ai/careers', 'greenhouse', 'characterai', 1, 0),
  ('Adept', 'https://www.adept.ai/careers', 'custom', NULL, 1, 0),
  ('Inflection', 'https://inflection.ai/careers', 'custom', NULL, 1, 0),
  ('Runway', 'https://runwayml.com/careers', 'custom', NULL, 1, 0),
  ('ElevenLabs', 'https://elevenlabs.io/careers', 'greenhouse', 'elevenlabs', 1, 0),
  ('AssemblyAI', 'https://www.assemblyai.com/careers', 'greenhouse', 'assemblyai', 1, 0),
  ('AI21 Labs', 'https://www.ai21.com/careers', 'greenhouse', 'ai21labs', 1, 0),
  ('Reka', 'https://www.reka.ai/careers', 'custom', NULL, 1, 0),
  ('Mistral AI', 'https://mistral.ai/careers', 'custom', NULL, 1, 0),
  ('Together AI', 'https://www.together.ai/careers', 'custom', NULL, 1, 0),
  ('Replicate', 'https://replicate.com/jobs', 'custom', NULL, 1, 0);

-- ============================================================================
-- 8. CREATE DEFAULT USER PROFILE (Optional - for single-user mode)
-- ============================================================================

-- Insert default user profile if none exists
INSERT OR IGNORE INTO user_profiles (id, full_name, headline)
VALUES (1, 'Default User', 'Job Seeker');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Run this migration with: npm run migrate
