-- Migration 005: Add Authentication and Multi-User Support
-- This migration adds:
-- 1. Users table for authentication
-- 2. user_id foreign keys to existing tables
-- 3. New tables for Phase 2 features (job_applications, cv_templates, etc.)

-- ============================================================================
-- 1. CREATE USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified INTEGER DEFAULT 0,
  verification_token TEXT,
  reset_token TEXT,
  reset_token_expires DATETIME,
  subscription_status TEXT DEFAULT 'free',
  payment_status TEXT DEFAULT 'unpaid',
  payment_date DATETIME,
  payment_id TEXT,
  failed_login_attempts INTEGER DEFAULT 0,
  account_locked_until DATETIME,
  last_login DATETIME,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_status);

-- ============================================================================
-- 2. ADD USER_ID TO EXISTING TABLES
-- ============================================================================

-- Add user_id to user_profiles (if not exists)
ALTER TABLE user_profiles ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_profiles_user ON user_profiles(user_id);

-- Add user_id to cv_documents (if not exists)
ALTER TABLE cv_documents ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cv_docs_user ON cv_documents(user_id);

-- Add user_id to jobs (if not exists)
ALTER TABLE jobs ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id);

-- Add user_id to custom_companies (if not exists)
ALTER TABLE custom_companies ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_companies_user ON custom_companies(user_id);

-- Add user_id to cv_variants (if not exists)
ALTER TABLE cv_variants ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_cv_variants_user ON cv_variants(user_id);

-- ============================================================================
-- 3. CREATE JOB APPLICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  cv_variant_id INTEGER,
  applied_date DATE NOT NULL,
  application_status TEXT DEFAULT 'applied',
  application_source TEXT,
  application_notes TEXT,
  follow_up_date DATE,
  interview_date DATETIME,
  interview_notes TEXT,
  offer_amount DECIMAL(10,2),
  offer_currency TEXT DEFAULT 'USD',
  decision TEXT,
  decision_date DATE,
  rejection_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (cv_variant_id) REFERENCES cv_variants(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_applications_user ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON job_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_applications_date ON job_applications(applied_date DESC);

-- ============================================================================
-- 4. CREATE CV TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cv_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  preview_url TEXT,
  is_premium INTEGER DEFAULT 0,
  price DECIMAL(10,2) DEFAULT 0,
  structure_json TEXT,
  styling_json TEXT,
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  author TEXT DEFAULT 'TalentNode',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON cv_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_premium ON cv_templates(is_premium);

-- ============================================================================
-- 5. CREATE USER TEMPLATE PURCHASES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_template_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  template_id INTEGER NOT NULL,
  purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  price_paid DECIMAL(10,2),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES cv_templates(id) ON DELETE CASCADE,
  UNIQUE(user_id, template_id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON user_template_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_template ON user_template_purchases(template_id);

-- ============================================================================
-- 6. CREATE USER ACTIVITY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  activity_type TEXT NOT NULL,
  activity_data TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON user_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_date ON user_activity(created_at DESC);

-- ============================================================================
-- 7. CREATE DEFAULT USER FOR EXISTING DATA (MIGRATION HELPER)
-- ============================================================================

-- Insert a default user if no users exist
INSERT INTO users (email, password_hash, subscription_status, is_active, created_at)
SELECT
  'admin@talentnode.local',
  '$2a$12$LQ', -- Placeholder, should be updated
  'lifetime',
  1,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM users LIMIT 1);

-- Update existing records to belong to user ID 1
UPDATE user_profiles SET user_id = 1 WHERE user_id IS NULL;
UPDATE cv_documents SET user_id = 1 WHERE user_id IS NULL;
UPDATE jobs SET user_id = 1 WHERE user_id IS NULL;
UPDATE cv_variants SET user_id = 1 WHERE user_id IS NULL;
UPDATE custom_companies SET user_id = 1 WHERE user_id IS NULL;

-- ============================================================================
-- 8. SEED INITIAL CV TEMPLATES
-- ============================================================================

INSERT OR IGNORE INTO cv_templates (name, category, description, is_premium, price, structure_json, styling_json) VALUES
(
  'Modern Professional',
  'modern',
  'Clean, modern design with bold headers and two-column layout',
  0,
  0,
  '{"sections":[{"id":"header","type":"header","order":1,"required":true},{"id":"summary","type":"summary","order":2,"required":true},{"id":"experience","type":"experience","order":3,"required":true},{"id":"education","type":"education","order":4,"required":true},{"id":"skills","type":"skills","order":5,"required":true}],"layout":"two-column","headerPosition":"top"}',
  '{"fonts":{"heading":"Inter","body":"Inter","size":{"heading":24,"body":11}},"colors":{"primary":"#2563EB","secondary":"#64748B","text":"#1E293B","background":"#FFFFFF"},"spacing":{"sectionGap":24,"lineHeight":1.6,"margins":{"top":40,"right":40,"bottom":40,"left":40}}}'
),
(
  'Classic ATS-Friendly',
  'ats',
  'Simple, single-column design optimized for ATS parsing',
  0,
  0,
  '{"sections":[{"id":"header","type":"header","order":1,"required":true},{"id":"summary","type":"summary","order":2,"required":true},{"id":"experience","type":"experience","order":3,"required":true},{"id":"education","type":"education","order":4,"required":true},{"id":"skills","type":"skills","order":5,"required":true}],"layout":"single-column","headerPosition":"top"}',
  '{"fonts":{"heading":"Arial","body":"Arial","size":{"heading":18,"body":11}},"colors":{"primary":"#000000","secondary":"#404040","text":"#000000","background":"#FFFFFF"},"spacing":{"sectionGap":20,"lineHeight":1.5,"margins":{"top":40,"right":40,"bottom":40,"left":40}}}'
),
(
  'Minimalist Executive',
  'minimalist',
  'Elegant minimalist design with subtle accents',
  1,
  9.99,
  '{"sections":[{"id":"header","type":"header","order":1,"required":true},{"id":"summary","type":"summary","order":2,"required":true},{"id":"experience","type":"experience","order":3,"required":true},{"id":"skills","type":"skills","order":4,"required":true},{"id":"education","type":"education","order":5,"required":true}],"layout":"single-column","headerPosition":"left"}',
  '{"fonts":{"heading":"Helvetica","body":"Helvetica","size":{"heading":20,"body":10}},"colors":{"primary":"#1A1A1A","secondary":"#666666","text":"#2D2D2D","background":"#FAFAFA"},"spacing":{"sectionGap":32,"lineHeight":1.8,"margins":{"top":50,"right":50,"bottom":50,"left":50}}}'
),
(
  'Creative Portfolio',
  'creative',
  'Eye-catching design for creative professionals',
  1,
  12.99,
  '{"sections":[{"id":"header","type":"header","order":1,"required":true},{"id":"summary","type":"summary","order":2,"required":true},{"id":"experience","type":"experience","order":3,"required":true},{"id":"skills","type":"skills","order":4,"required":true},{"id":"education","type":"education","order":5,"required":true}],"layout":"two-column","headerPosition":"top"}',
  '{"fonts":{"heading":"Montserrat","body":"Open Sans","size":{"heading":28,"body":11}},"colors":{"primary":"#8B5CF6","secondary":"#EC4899","text":"#1F2937","background":"#FFFFFF"},"spacing":{"sectionGap":28,"lineHeight":1.7,"margins":{"top":40,"right":40,"bottom":40,"left":40}}}'
),
(
  'Tech Professional',
  'modern',
  'Developer-focused design with technical sections',
  1,
  9.99,
  '{"sections":[{"id":"header","type":"header","order":1,"required":true},{"id":"summary","type":"summary","order":2,"required":true},{"id":"skills","type":"skills","order":3,"required":true},{"id":"experience","type":"experience","order":4,"required":true},{"id":"education","type":"education","order":5,"required":true}],"layout":"two-column","headerPosition":"top"}',
  '{"fonts":{"heading":"JetBrains Mono","body":"Roboto","size":{"heading":22,"body":10}},"colors":{"primary":"#10B981","secondary":"#6366F1","text":"#111827","background":"#FFFFFF"},"spacing":{"sectionGap":24,"lineHeight":1.6,"margins":{"top":40,"right":40,"bottom":40,"left":40}}}'
);
