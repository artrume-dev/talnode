# Prompt Structure for Job Analysis

**Date:** 2025-01-27  
**Status:** ✅ **ENHANCED**  
**Location:** `job-research-mcp/src/services/llm-analyzer.ts`

## Overview

The job analysis uses a **two-part prompt structure**:
1. **System Prompt** - Defines role, tools, and usage rules
2. **User Prompt** - Contains job details, CV content, and analysis framework

---

## System Prompt

**Location:** `callOpenAIWithTools()` method, lines 490-530

### Content

The system prompt defines:

1. **Role Definition**
   - "You are a job analysis specialist"
   - Goal: Provide honest, specific, actionable insights

2. **Available Tools** (3 tools)
   - `extract_skills` - Skill extraction
   - `calculate_similarity` - Semantic similarity scoring
   - `analyze_role_level` - Career progression analysis

3. **Tool Usage Rules**
   - When to use each tool
   - Required tool sequences
   - How to combine tool outputs

4. **Output Requirements**
   - JSON-only format
   - Structure matching
   - Honesty and specificity

### Full System Prompt

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

---

## User Prompt

**Location:** `buildAnalysisPrompt()` method, lines 274-408

### Structure

1. **Role Reminder** (redundant but helpful)
   - "You are a job analysis specialist"

2. **Few-Shot Examples**
   - 2-3 examples showing high/medium/low priority analyses
   - Demonstrates expected output format

3. **Current Job Details**
   - Company, title, description, requirements
   - Tech stack, location, remote status

4. **Candidate CV**
   - Full CV content (or first portion)

5. **Analysis Framework**
   - 5-category breakdown with weights
   - Tool usage instructions (redundant with system prompt but reinforces)
   - Scoring guidelines

6. **Output Format**
   - Exact JSON structure required
   - Calculation rules
   - Star rating guidelines
   - Recommendation thresholds

### Key Sections

#### Tool Usage Instructions (in User Prompt)
```
**IMPORTANT: Use the provided tools for consistent, data-driven scoring:**

1. **ALWAYS call extract_skills** on both job requirements and CV content before scoring technical_match
2. **Use calculate_similarity** for objective alignment scores - use the returned score directly in your calculations
3. **Combine tool outputs with your reasoning** to provide comprehensive analysis
```

#### Category-Specific Tool Instructions
- **Role Alignment:** Use `calculate_similarity` with `comparison_type="role_alignment"`
- **Technical Match:** MUST call `extract_skills` first
- **Company Fit:** Use `calculate_similarity` with `comparison_type="company_fit"`
- **Growth Potential:** ALWAYS call `analyze_role_level` first
- **Practical Factors:** No tools needed

---

## Message Structure

```typescript
const messages = [
  {
    role: 'system',
    content: '<SYSTEM PROMPT>'  // Role, tools, rules
  },
  {
    role: 'user',
    content: '<USER PROMPT>'    // Job details, CV, framework
  }
];
```

---

## Why Two Prompts?

### System Prompt Benefits
- **Persistent Context** - Defines role and tools across all iterations
- **Tool Instructions** - Clear guidance on when/how to use tools
- **Output Format** - JSON-only requirement

### User Prompt Benefits
- **Specific Data** - Contains actual job and CV content
- **Few-Shot Examples** - Shows expected output format
- **Detailed Framework** - 5-category breakdown with weights
- **Reinforcement** - Repeats tool usage instructions

### Redundancy is Intentional
- Tool instructions appear in both prompts
- Reinforces correct tool usage
- Helps LLM remember to use tools
- Provides context if system prompt is truncated

---

## Tool Calling Flow

1. **System Prompt** → Sets up role and tool awareness
2. **User Prompt** → Provides job/CV data and analysis framework
3. **LLM Receives** → Both prompts + tool definitions
4. **LLM Decides** → Which tools to call and when
5. **Tools Execute** → Return structured data
6. **LLM Uses** → Tool outputs in scoring calculations
7. **LLM Returns** → Final JSON analysis

---

## Recent Enhancement

**Before (Brief System Prompt):**
```
You are a job analysis specialist. Use the provided tools to ensure consistent, data-driven scoring. ALWAYS use extract_skills before scoring technical_match. Use calculate_similarity for alignment scoring to get objective numerical scores. Return only valid JSON matching the exact structure specified. Be honest and specific in your analysis.
```

**After (Comprehensive System Prompt):**
- ✅ Detailed tool descriptions
- ✅ All 3 tools documented (including new `analyze_role_level`)
- ✅ Clear usage rules for each category
- ✅ Output requirements clearly stated
- ✅ Red flag detection guidance

---

## Best Practices

1. **System Prompt** - Keep tool-focused, role-defining
2. **User Prompt** - Keep data-focused, example-rich
3. **Redundancy** - Tool instructions in both is OK (reinforcement)
4. **Clarity** - Use clear formatting (headers, lists, examples)
5. **Consistency** - Match tool descriptions with actual tool definitions

---

## Files

- **System Prompt:** `llm-analyzer.ts` line 490-530
- **User Prompt:** `llm-analyzer.ts` line 274-408 (`buildAnalysisPrompt()`)
- **Tool Definitions:** `llm-analyzer.ts` line 416-487

---

## Conclusion

✅ **Yes, the prompt has both:**
- ✅ **System prompt** for tool calling and role definition
- ✅ **User prompt** for job analysis framework and data

The system prompt was recently **enhanced** to include:
- All 3 tools (including new `analyze_role_level`)
- Clear usage rules for each category
- Better structure and formatting

Both prompts work together to guide the LLM through consistent, tool-driven job analysis.

