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

3. **`analyze_role_level`** (Added in v2.1)
   - Purpose: Analyze career progression by comparing job level vs candidate level
   - Parameters: `job_title`, `job_description`, `cv_content`
   - Returns: Role levels, progression direction, growth score (0-100), and recommendations

## Prompt Structure

The system uses a **two-part prompt structure** to guide the LLM:

### System Prompt

**Location:** `callOpenAIWithTools()` method, lines 490-530

The system prompt defines:
- **Role:** "You are a job analysis specialist"
- **Available Tools:** All 3 tools with descriptions
- **Tool Usage Rules:** When and how to use each tool
- **Output Requirements:** JSON-only format, structure matching

**Full System Prompt:**
```
You are a job analysis specialist with access to powerful tools for consistent, data-driven scoring.

## Your Role
Analyze job fit using a 5-category weighted framework. Your goal is to provide honest, specific, and actionable insights to help candidates make informed career decisions.

## Available Tools (USE THEM!)

1. **extract_skills(text)** - Deterministically extracts skills from text
   - ALWAYS call this on both job requirements AND CV content before scoring technical_match
   - Returns normalized skill lists with categories
   - Use the extracted skills directly in your analysis

2. **calculate_similarity(text1, text2, comparison_type)** - Calculates semantic similarity using embeddings
   - Use for objective alignment scoring: role_alignment, technical_match, company_fit, growth_potential
   - Returns numerical score (0-100) - USE THIS SCORE DIRECTLY in your calculations
   - Provides interpretation (very high/high/moderate/low/very low)

3. **analyze_role_level(job_title, job_description, cv_content)** - Analyzes career progression
   - ALWAYS call this before scoring growth_potential category
   - Returns structured progression data (step_up, lateral, step_down)
   - Returns baseline growth score (0-100) - use as starting point, then adjust based on other factors
   - Helps identify red flags (overqualified candidates, career regression)

## Tool Usage Rules

- **Technical Match:** MUST call extract_skills first, then use calculate_similarity
- **Role Alignment:** Use calculate_similarity with comparison_type="role_alignment"
- **Company Fit:** Use calculate_similarity with comparison_type="company_fit"
- **Growth Potential:** MUST call analyze_role_level first, then use calculate_similarity, combine both for final score
- **Practical Factors:** No tools needed, use your reasoning

## Output Requirements

- Return ONLY valid JSON (no markdown, no code blocks, no explanations)
- Match the exact structure specified in the user prompt
- Use tool outputs directly in your scoring calculations
- Be honest and specific in reasoning - help candidates make informed decisions
- Flag red flags clearly (seniority mismatch, unrealistic requirements, culture concerns)
```

### User Prompt

**Location:** `buildAnalysisPrompt()` method, lines 274-408

The user prompt contains:
- **Few-Shot Examples:** 2-3 examples showing expected output format
- **Current Job Details:** Company, title, description, requirements, tech stack
- **Candidate CV:** Full CV content
- **Analysis Framework:** 5-category breakdown with weights and tool instructions
- **Output Format:** Exact JSON structure with calculation rules

**Key Tool Instructions in User Prompt:**
```
**IMPORTANT: Use the provided tools for consistent, data-driven scoring:**

1. **ALWAYS call extract_skills** on both job requirements and CV content before scoring technical_match
2. **Use calculate_similarity** for objective alignment scores - use the returned score directly in your calculations
3. **ALWAYS call analyze_role_level** before scoring growth_potential
4. **Combine tool outputs with your reasoning** to provide comprehensive analysis
```

### Why Two Prompts?

- **System Prompt:** Persistent context, tool definitions, usage rules
- **User Prompt:** Specific data (job/CV), examples, detailed framework
- **Redundancy:** Tool instructions in both prompts reinforce correct usage

**Updated Prompt Instructions:**
- Instructs LLM to ALWAYS use `extract_skills` before scoring technical_match
- Instructs LLM to use `calculate_similarity` for objective alignment scores
- Instructs LLM to ALWAYS use `analyze_role_level` before scoring growth_potential
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
1. System prompt sets up role and tool awareness
2. User prompt provides job/CV data and analysis framework
3. LLM receives both prompts + tool definitions
4. LLM calls extract_skills(job_requirements) → gets structured skills
5. LLM calls extract_skills(cv_content) → gets structured skills
6. LLM calls analyze_role_level(job_title, job_desc, cv_content) → gets progression data
7. LLM calls calculate_similarity(job_desc, cv_content, "role_alignment") → gets objective score
8. LLM calls calculate_similarity for other categories (technical_match, company_fit, growth_potential)
9. LLM uses tool outputs directly in scoring calculations
10. LLM combines tool outputs with reasoning to provide comprehensive analysis
11. LLM returns final JSON analysis
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

- ✅ `src/services/llm-analyzer.ts` - Added tool calling support, enhanced system prompt
- ✅ `src/services/tool-helpers.ts` - Tool implementations (extractSkills, calculateEmbeddingSimilarity, analyzeRoleLevel)

## Related Documentation

- **`PROMPT-STRUCTURE.md`** - Detailed prompt structure documentation
- **`ROLE-LEVEL-LOOKUP-IMPLEMENTATION.md`** - Role-level lookup tool details
- **`MULTI-STEP-FUNCTION-CALLING-REPORT.md`** - Multi-step function calling implementation

## Breaking Changes

- **Model name changed:** `o4-mini` → `gpt-4o-mini`
- **Prompt version:** `v1.0` → `v2.0`
- **API calls:** Now use tool calling format (backward compatible via legacy method)

## Notes

- The legacy `callOpenAI()` method is kept for backward compatibility
- Tool calling adds ~1-2 API calls per analysis (for embeddings)
- Embedding API calls are separate from chat completions (different pricing)
- Skill extraction is deterministic and fast (no API calls needed)
- Role-level analysis is deterministic and fast (no API calls needed)
- System prompt provides persistent context across all tool call iterations
- User prompt provides specific data and examples for each analysis
- Both prompts work together to ensure consistent tool usage

