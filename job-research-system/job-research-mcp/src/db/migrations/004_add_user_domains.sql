-- Migration 004: Add user domain expertise tracking
-- Created: 2025-11-25
-- Purpose: Store user's domain expertise for better job matching and domain mismatch detection

-- Add user_domains column to store user's selected professional domains
ALTER TABLE user_profiles ADD COLUMN user_domains TEXT;

-- Example value: '["design-systems","frontend-engineering","ux-design"]'
-- This will be used to:
-- 1. Detect domain mismatches between user expertise and job requirements
-- 2. Calculate domain alignment scores
-- 3. Identify transferable skills across related domains
-- 4. Provide better job recommendations

-- Note: This is AI-ready - can use keyword matching now, AI models later

