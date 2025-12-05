-- Migration 008: Add Training Data Table for Model Fine-Tuning
-- Created: 2025-12-03
-- Purpose: Collect training data for future model fine-tuning and self-learning

-- ============================================================================
-- CREATE TRAINING DATA TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_training_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Reference to analysis
  analysis_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  cv_id INTEGER NOT NULL,
  user_id INTEGER DEFAULT 1,

  -- Input Data (for fine-tuning)
  job_title TEXT NOT NULL,
  job_company TEXT NOT NULL,
  job_description TEXT NOT NULL,
  job_requirements TEXT,
  job_tech_stack TEXT,
  cv_content TEXT NOT NULL,

  -- Model Output (what LLM generated)
  model_output TEXT NOT NULL,      -- Full JSON response from LLM
  model_version TEXT DEFAULT 'gpt-4o-mini',
  prompt_version TEXT DEFAULT 'v1.0',

  -- User Feedback (for RLHF)
  user_rating INTEGER,              -- 1-5 stars (how useful was this analysis?)
  user_feedback TEXT,               -- Optional text feedback
  was_helpful BOOLEAN,              -- Quick thumbs up/down

  -- Quality Metrics
  json_parse_success BOOLEAN DEFAULT 1,
  response_time_ms INTEGER,
  token_count_input INTEGER,
  token_count_output INTEGER,

  -- Ground Truth (optional - for supervised learning)
  actual_outcome TEXT,              -- 'applied', 'rejected', 'interviewed', 'offered'
  outcome_notes TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (analysis_id) REFERENCES job_ai_analysis(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (cv_id) REFERENCES cv_documents(id) ON DELETE CASCADE,

  -- Allow multiple training samples from same analysis (as user provides feedback)
  UNIQUE(analysis_id)
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_training_job ON ai_training_data(job_id);
CREATE INDEX IF NOT EXISTS idx_training_cv ON ai_training_data(cv_id);
CREATE INDEX IF NOT EXISTS idx_training_user ON ai_training_data(user_id);
CREATE INDEX IF NOT EXISTS idx_training_rating ON ai_training_data(user_rating);
CREATE INDEX IF NOT EXISTS idx_training_helpful ON ai_training_data(was_helpful);
CREATE INDEX IF NOT EXISTS idx_training_outcome ON ai_training_data(actual_outcome);
CREATE INDEX IF NOT EXISTS idx_training_model_version ON ai_training_data(model_version);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This table enables:
-- 1. Few-shot learning (use high-rated examples in prompts)
-- 2. Supervised fine-tuning (job + CV + expected output)
-- 3. RLHF (user ratings to improve model)
-- 4. Performance tracking (response times, token usage)
-- 5. Outcome-based learning (correlate predictions with actual results)
