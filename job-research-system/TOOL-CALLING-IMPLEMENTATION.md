# Tool Calling Implementation for LLM Job Analyzer

**Date:** 2025-01-XX  
**Status:** ✅ Complete  
**Version:** v2.0

## Overview

Added tool calling support to the LLM Job Analyzer to improve scoring consistency, reliability, and fairness. The implementation includes two key tools:

1. **Skill Extraction Tool** - Deterministic skill parsing from text
2. **Embedding Similarity Tool** - Data-driven alignment scoring using embeddings

## Changes Made

### 1. New File: `tool-helpers.ts`

Created utility functions for tool execution:

- **`extractSkills(text: string)`** - Deterministically extracts skills from text using a comprehensive keyword dictionary
  - Returns structured skill lists with categories
  - Provides confidence levels (high/medium/low)
  - Normalizes skill names for consistency

- **`calculateEmbeddingSimilarity(text1, text2, apiKey)`** - Calculates semantic similarity using OpenAI embeddings
  - Uses `text-embedding-3-large` model
  - Returns cosine similarity (0-1) and normalized score (0-100)
  - Provides interpretation of similarity level

### 2. Updated: `llm-analyzer.ts`

**Key Changes:**
- Updated `PROMPT_VERSION` from `v1.0` to `v2.0`
- Updated `MODEL` from `o4-mini` to `gpt-4o-mini` (full model name for tool calling support)
- Added `callOpenAIWithTools()` method that:
  - Defines two tools: `extract_skills` and `calculate_similarity`
  - Handles tool call execution loop
  - Executes tool functions and sends results back to LLM
  - Supports up to 10 tool call iterations

**Tool Definitions:**

1. **`extract_skills`**
   - Purpose: Extract skills deterministically from text
   - Parameters: `text` (string)
   - Returns: Structured skill list with categories

2. **`calculate_similarity`**
   - Purpose: Calculate semantic similarity for objective scoring
   - Parameters: `text1`, `text2`, `comparison_type` (role_alignment | technical_match | company_fit | growth_potential)
   - Returns: Similarity score (0-100) and interpretation

**Updated Prompt:**
- Instructs LLM to ALWAYS use `extract_skills` before scoring technical_match
- Instructs LLM to use `calculate_similarity` for objective alignment scores
- Emphasizes using tool outputs directly in scoring calculations

## Benefits

### 1. Consistency
- **Before:** LLM inferred skills non-deterministically → varied results across runs
- **After:** Deterministic skill extraction → consistent skill lists every time

### 2. Reliability
- **Before:** Subjective scoring based on LLM interpretation
- **After:** Data-driven scoring using embedding similarity → objective numerical scores

### 3. Fairness
- **Before:** Model could hallucinate numbers or be inconsistent
- **After:** Numerical scores derived from embeddings → reproducible and fair

## Usage Flow

```
1. LLM receives job and CV content
2. LLM calls extract_skills(job_requirements) → gets structured skills
3. LLM calls extract_skills(cv_content) → gets structured skills
4. LLM compares skill lists to determine technical_match score
5. LLM calls calculate_similarity(job_desc, cv_content, "role_alignment") → gets objective score
6. LLM uses similarity scores directly in category scoring
7. LLM combines tool outputs with reasoning to provide comprehensive analysis
```

## Technical Details

### Skill Extraction Algorithm

- Uses comprehensive keyword dictionary (150+ skills across 10+ categories)
- Normalizes text (lowercase, removes special chars)
- Performs word-boundary matching for accuracy
- Categorizes skills automatically
- Returns confidence levels based on number of skills found

### Embedding Similarity Algorithm

- Uses OpenAI `text-embedding-3-large` model
- Generates embeddings for both texts
- Calculates cosine similarity between embeddings
- Normalizes to 0-100 score range
- Provides interpretation (very high/high/moderate/low/very low)

## Model Requirements

- **Model:** `gpt-4o-mini` (supports tool calling)
- **Embeddings Model:** `text-embedding-3-large`
- **API:** OpenAI Chat Completions API with `tools` parameter

## Error Handling

- Tool execution errors are caught and returned to LLM
- Maximum 10 tool call iterations to prevent infinite loops
- Falls back gracefully if tools fail
- Logs tool execution for debugging

## Testing

To test the implementation:

1. Ensure `OPENAI_API_KEY` is set in environment
2. Call `/api/jobs/ai-analyze` endpoint with `job_id` and `cv_id`
3. Check console logs for tool execution:
   - `🔧 Processing N tool call(s)...`
   - `✅ Extracted N skills from text`
   - `✅ Calculated similarity: X% (comparison_type)`

## Future Enhancements

Potential improvements:
- Cache embeddings for repeated comparisons
- Add more sophisticated skill matching (fuzzy matching, synonyms)
- Support for additional comparison types
- Batch embedding generation for efficiency
- Custom skill dictionaries per domain/industry

## Files Modified

- ✅ `src/services/llm-analyzer.ts` - Added tool calling support
- ✅ `src/services/tool-helpers.ts` - New file with tool implementations

## Breaking Changes

- **Model name changed:** `o4-mini` → `gpt-4o-mini`
- **Prompt version:** `v1.0` → `v2.0`
- **API calls:** Now use tool calling format (backward compatible via legacy method)

## Notes

- The legacy `callOpenAI()` method is kept for backward compatibility
- Tool calling adds ~1-2 API calls per analysis (for embeddings)
- Embedding API calls are separate from chat completions (different pricing)
- Skill extraction is deterministic and fast (no API calls needed)

