-- Migration 007: Add AI Job Analysis Table
-- Created: 2025-12-03
-- Purpose: Store LLM-based job analysis results with 5-category framework

-- ============================================================================
-- CREATE AI JOB ANALYSIS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_ai_analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  cv_id INTEGER NOT NULL,
  user_id INTEGER DEFAULT 1,

  -- Overall Analysis
  overall_score REAL,           -- Calculated weighted average (0-100)
  overall_stars INTEGER,         -- 1-5 star rating
  recommendation TEXT,           -- 'high', 'medium', 'low', 'pass'

  -- Role Alignment (30% weight)
  role_alignment_score REAL,
  role_alignment_stars INTEGER,
  role_alignment_reasoning TEXT,

  -- Technical Match (25% weight)
  technical_match_score REAL,
  technical_match_stars INTEGER,
  technical_match_reasoning TEXT,

  -- Company Fit (20% weight)
  company_fit_score REAL,
  company_fit_stars INTEGER,
  company_fit_reasoning TEXT,

  -- Growth Potential (15% weight)
  growth_potential_score REAL,
  growth_potential_stars INTEGER,
  growth_potential_reasoning TEXT,

  -- Practical Factors (10% weight)
  practical_factors_score REAL,
  practical_factors_stars INTEGER,
  practical_factors_reasoning TEXT,

  -- Additional Insights
  strong_matches TEXT,           -- JSON array of matched skills/keywords
  gaps TEXT,                     -- JSON array of missing requirements
  red_flags TEXT,                -- JSON array of concerns
  application_strategy TEXT,     -- Strategic advice for application
  talking_points TEXT,           -- JSON array of key points to emphasize

  -- Metadata
  analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  model_used TEXT DEFAULT 'gpt-4o-mini',

  -- Composite unique constraint for caching (prevents duplicate analyses)
  UNIQUE(job_id, cv_id, user_id),

  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (cv_id) REFERENCES cv_documents(id) ON DELETE CASCADE
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_analysis_job ON job_ai_analysis(job_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_cv ON job_ai_analysis(cv_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_user ON job_ai_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_recommendation ON job_ai_analysis(recommendation);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Run this migration with: npm run migrate
