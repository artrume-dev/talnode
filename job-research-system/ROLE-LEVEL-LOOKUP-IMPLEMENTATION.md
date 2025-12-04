# Role-Level Lookup Tool Implementation

**Date:** 2025-01-27  
**Status:** ✅ **IMPLEMENTED**  
**Purpose:** Enhance growth potential scoring with structured role-level analysis

## Overview

The Role-Level Lookup tool provides deterministic analysis of career progression by comparing job role levels vs candidate levels. This enables more accurate and consistent growth potential scoring.

## What It Does

### 1. **Role Level Mapping**
Maps job titles and CV content to standardized role levels:
- **Intern** (Level 0)
- **Junior** (Level 1) - 0-2 years
- **Mid** (Level 2) - 2-5 years
- **Senior** (Level 3) - 4-8 years
- **Lead** (Level 4) - 5+ years
- **Staff** (Level 5) - 7+ years
- **Principal** (Level 6) - 8+ years
- **Architect** (Level 7) - 10+ years
- **Director** (Level 8) - 8+ years
- **VP** (Level 9)
- **C-Level** (Level 10)

### 2. **Career Progression Analysis**
Determines progression direction:
- **Step Up** - Job is higher level than candidate (good growth)
- **Lateral** - Same level (maintains level, may offer new challenges)
- **Step Down** - Job is lower level (limited growth)
- **Significant Step Down** - Major regression (red flag)

### 3. **Growth Score Calculation**
Provides structured growth score (0-100) based on progression:
- **Step Up (2+ levels):** 95 points - Excellent growth opportunity
- **Step Up (1 level):** 85 points - Good growth opportunity
- **Lateral:** 60 points - Maintains level
- **Step Down (1 level):** 30 points - Limited growth
- **Significant Step Down:** 10 points - Major regression

### 4. **Recommendations**
Provides actionable recommendations based on progression analysis.

## Implementation Details

### File Location
- **Tool Function:** `job-research-mcp/src/services/tool-helpers.ts`
- **Integration:** `job-research-mcp/src/services/llm-analyzer.ts`

### Function Signature
```typescript
analyzeRoleLevel(
  jobTitle: string,
  jobDescription: string,
  cvContent: string
): {
  jobLevel: { level: RoleLevel; levelName: string; confidence: 'high' | 'medium' | 'low' };
  candidateLevel: { level: RoleLevel; levelName: string; confidence: 'high' | 'medium' | 'low' };
  progression: { direction: string; levelDifference: number; description: string };
  growthScore: { score: number; reasoning: string };
  recommendation: string;
}
```

### Tool Definition
```typescript
{
  name: 'analyze_role_level',
  description: 'Analyze role levels and career progression. Use this to determine growth potential by comparing the job level vs candidate level.',
  parameters: {
    job_title: string,
    job_description: string,
    cv_content: string
  }
}
```

## Usage Flow

### In LLM Analysis
1. LLM receives job title, description, and CV content
2. LLM calls `analyze_role_level(job_title, job_description, cv_content)`
3. Tool extracts levels from both job and CV
4. Tool calculates progression direction and growth score
5. Tool returns structured data:
   - Job level (e.g., "SENIOR")
   - Candidate level (e.g., "MID")
   - Progression (e.g., "step_up")
   - Growth score (e.g., 85)
   - Reasoning and recommendation
6. LLM uses this data to score `growth_potential` category (15% weight)

### Example Output
```json
{
  "jobLevel": {
    "level": 3,
    "levelName": "SENIOR",
    "confidence": "high"
  },
  "candidateLevel": {
    "level": 2,
    "levelName": "MID",
    "confidence": "high"
  },
  "progression": {
    "direction": "step_up",
    "levelDifference": 1,
    "description": "Step up: MID → SENIOR"
  },
  "growthScore": {
    "score": 85,
    "reasoning": "Good growth opportunity - step up to next level. Natural career progression."
  },
  "recommendation": "Good growth opportunity - natural career progression"
}
```

## Benefits

### 1. **Consistency**
- Before: LLM inferred levels inconsistently → varied growth scores
- After: Deterministic level extraction → consistent progression analysis

### 2. **Accuracy**
- Before: Subjective assessment of career progression
- After: Structured level comparison → objective progression direction

### 3. **Better Scoring**
- Before: Growth potential relied on LLM reasoning alone
- After: Structured baseline score (0-100) + LLM adjustments → more accurate

### 4. **Red Flag Detection**
- Automatically identifies significant step downs
- Flags overqualified candidates applying to junior roles
- Helps prevent bad career moves

## Pattern Matching

The tool uses comprehensive pattern matching to identify role levels:

### Job Title Patterns
- **Senior:** "Senior Engineer", "Sr. Designer", "Senior Software"
- **Lead:** "Tech Lead", "Engineering Lead", "Team Lead"
- **Principal:** "Principal Engineer", "Principal Designer"
- **Staff:** "Staff Engineer", "Staff Software"
- **Director:** "Director of Engineering", "Head of Product"

### CV Content Analysis
- Extracts current position from CV
- Looks for role titles in recent experience
- Infers level from years of experience if title unclear
- Uses first 2000 characters (usually contains current role)

## Integration with Growth Potential Scoring

The tool is integrated into the `growth_potential` category (15% weight):

1. **LLM calls `analyze_role_level`** → Gets baseline growth score (0-100)
2. **LLM adjusts score** based on:
   - Learning opportunities in job description
   - Leadership potential
   - Impact scope
   - Company growth stage
3. **LLM combines** role level analysis with `calculate_similarity` for comprehensive scoring
4. **Final score** reflects both structured progression data and semantic analysis

## Example Scenarios

### Scenario 1: Step Up
- **Job:** "Senior Product Designer"
- **Candidate:** "Mid-level Designer" (3 years experience)
- **Result:** Step up (MID → SENIOR), Growth Score: 85
- **Impact:** Positive growth potential score

### Scenario 2: Lateral Move
- **Job:** "Senior Software Engineer"
- **Candidate:** "Senior Software Engineer" (5 years experience)
- **Result:** Lateral (SENIOR → SENIOR), Growth Score: 60
- **Impact:** Neutral growth potential (may offer domain change)

### Scenario 3: Step Down
- **Job:** "Junior Frontend Developer"
- **Candidate:** "Senior Engineering Manager" (10 years experience)
- **Result:** Significant step down (DIRECTOR → JUNIOR), Growth Score: 10
- **Impact:** Red flag - major career regression

### Scenario 4: Overqualified
- **Job:** "Mid-level Engineer"
- **Candidate:** "Principal Engineer" (12 years experience)
- **Result:** Significant step down (PRINCIPAL → MID), Growth Score: 10
- **Impact:** Red flag - candidate overqualified

## Testing

To test the implementation:

1. **Ensure tool is available** in LLM function calling
2. **Call `/api/jobs/ai-analyze`** endpoint with job_id and cv_id
3. **Check console logs** for:
   - `✅ Role level analysis: MID → SENIOR (step_up)`
   - Tool call progress updates
4. **Verify growth_potential score** reflects role progression

## Future Enhancements

Potential improvements:
- **Domain-specific level mapping** (e.g., design vs engineering levels)
- **Company-specific level systems** (e.g., Google L3-L7, Facebook E3-E7)
- **Years of experience refinement** (more accurate level inference)
- **Career path tracking** (track progression over time)
- **Salary range mapping** (associate levels with salary ranges)

## Files Modified

- ✅ `src/services/tool-helpers.ts` - Added `analyzeRoleLevel()` function
- ✅ `src/services/llm-analyzer.ts` - Integrated tool into function calling
- ✅ Updated prompt to instruct LLM to use tool for growth_potential

## Breaking Changes

- **None** - This is an additive feature
- Backward compatible with existing analyses
- Tool is optional (LLM decides when to use it)

## Notes

- Tool provides **baseline score** that LLM can adjust
- LLM still considers other factors (learning opportunities, leadership, impact)
- Tool helps ensure **consistency** in role level assessment
- Pattern matching covers common title variations
- Falls back to years of experience if title unclear

