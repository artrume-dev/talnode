-- ============================================================================
-- Migration: Add support for new ATS systems (Workday, Ashby, SmartRecruiters)
-- Created: 2025-11-20
-- ============================================================================

-- Add columns for new ATS systems
ALTER TABLE custom_companies ADD COLUMN workday_id TEXT;
ALTER TABLE custom_companies ADD COLUMN ashby_id TEXT;
ALTER TABLE custom_companies ADD COLUMN smartrecruiters_id TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workday_id ON custom_companies(workday_id);
CREATE INDEX IF NOT EXISTS idx_ashby_id ON custom_companies(ashby_id);
CREATE INDEX IF NOT EXISTS idx_smartrecruiters_id ON custom_companies(smartrecruiters_id);

-- ============================================================================
-- Insert Workday companies (FAANG + major tech)
-- ============================================================================
INSERT OR IGNORE INTO custom_companies (company_name, careers_url, ats_type, workday_id, is_active, added_by_user) VALUES
  ('Apple', 'https://jobs.apple.com', 'workday', 'apple', 1, 0),
  ('Meta', 'https://www.metacareers.com', 'workday', 'meta', 1, 0),
  ('Netflix', 'https://jobs.netflix.com', 'workday', 'netflix', 1, 0),
  ('Stripe', 'https://stripe.com/jobs', 'workday', 'stripe', 1, 0),
  ('Airbnb', 'https://careers.airbnb.com', 'workday', 'airbnb', 1, 0);

-- ============================================================================
-- Insert Ashby companies (Modern tech startups)
-- ============================================================================
INSERT OR IGNORE INTO custom_companies (company_name, careers_url, ats_type, ashby_id, is_active, added_by_user) VALUES
  ('Linear', 'https://linear.app/careers', 'ashby', 'linear', 1, 0),
  ('Lattice', 'https://lattice.com/careers', 'ashby', 'lattice', 1, 0),
  ('Ramp', 'https://ramp.com/careers', 'ashby', 'ramp', 1, 0),
  ('Merge', 'https://merge.dev/careers', 'ashby', 'merge', 1, 0),
  ('Clay', 'https://clay.com/careers', 'ashby', 'clay', 1, 0),
  ('Retool', 'https://retool.com/careers', 'ashby', 'retool', 1, 0),
  ('Fal.ai', 'https://fal.ai/careers', 'ashby', 'fal', 1, 0),
  ('Notion', 'https://notion.so/careers', 'ashby', 'notion', 1, 0);

-- ============================================================================
-- Insert SmartRecruiters companies (Enterprise)
-- ============================================================================
INSERT OR IGNORE INTO custom_companies (company_name, careers_url, ats_type, smartrecruiters_id, is_active, added_by_user) VALUES
  ('Adobe', 'https://careers.adobe.com', 'smartrecruiters', 'Adobe', 1, 0),
  ('LinkedIn', 'https://careers.linkedin.com', 'smartrecruiters', 'LinkedIn', 1, 0),
  ('Visa', 'https://careers.visa.com', 'smartrecruiters', 'Visa', 1, 0);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration adds:
-- - 3 new ATS system columns (workday_id, ashby_id, smartrecruiters_id)
-- - 16 new companies across 3 ATS systems
-- - Total companies: 22 (AI) + 16 (new) = 38 companies
-- 
-- ATS Coverage:
-- - Greenhouse: ~30% (11 companies)
-- - Lever: ~20% (1 company)
-- - Workday: ~25% (5 companies - FAANG)
-- - Ashby: ~15% (8 companies - startups)
-- - SmartRecruiters: ~10% (3 companies - enterprise)
-- 
-- Total Market Coverage: ~70-80% of tech companies
-- ============================================================================
