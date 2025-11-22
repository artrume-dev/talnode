# Job-CV Alignment Scoring Algorithm

## Overview

The alignment scoring algorithm uses **keyword-based heuristic matching** to calculate how well a candidate's CV aligns with a job posting's requirements. The algorithm analyzes both the job description and requirements against the active CV content to produce an alignment score between 0-100%.

### Key Principles

1. **Keyword Matching**: Identifies relevant skills, technologies, and experience keywords in both the job posting and CV
2. **Weighted Scoring**: Different keywords carry different point values based on their importance and complexity
3. **Relative Scoring**: Scores are calculated relative to the maximum possible score for that specific job
4. **Domain Awareness**: Detects mismatches between job domain and candidate experience

---

## Algorithm Methodology

### Step 1: Data Preparation

```
1. Retrieve job description and requirements
2. Retrieve active CV content
3. Convert all text to lowercase for case-insensitive matching
4. Combine job description + requirements into single text block
```

### Step 2: Validation Check (Insufficient Data Detection)

**NEW - Added to prevent false positives**

Before scoring, the algorithm checks if the job posting has sufficient information:

```typescript
if (description.length < 20 && requirements.length < 20) {
  return {
    alignment_score: 0,
    reasoning: "Insufficient information in job posting. Cannot perform accurate alignment analysis."
  }
}
```

**Why this matters**: Some job postings (e.g., Visa jobs) may have minimal or missing descriptions, which previously resulted in artificially high scores (~100%) because there were few keywords to miss. Now these return 0% with clear messaging.

### Step 3: Keyword Matching & Scoring

The algorithm uses an `experienceKeywords` dictionary containing **150+ keywords** organized into categories. Each keyword has a point value based on its importance:

#### Keyword Categories & Point Values

**Leadership & Management (15-25 points)**
- `technical leadership` → 25 pts
- `team lead` → 20 pts
- `cross-functional` → 15 pts
- `stakeholder management` → 18 pts
- `mentorship` → 15 pts
- `project management` → 15 pts

**Design Systems & Frontend Specialization (10-20 points)**
- `design system` → 20 pts
- `design tokens` → 18 pts
- `component library` → 18 pts
- `accessibility` → 15 pts
- `wcag` → 12 pts
- `storybook` → 12 pts
- `figma` → 10 pts

**Frontend Technologies (8-15 points)**
- `react` → 12 pts
- `typescript` → 12 pts
- `javascript` → 10 pts
- `vue` → 10 pts
- `css` → 8 pts
- `html` → 8 pts
- `webpack` → 10 pts

**AI & Machine Learning (12-20 points)**
- `ai` → 18 pts
- `machine learning` → 20 pts
- `llm` → 15 pts
- `gpt` → 12 pts
- `claude` → 12 pts
- `prompt engineering` → 15 pts
- `rag` → 12 pts

**Backend & APIs (8-15 points)**
- `node.js` → 12 pts
- `python` → 12 pts
- `api development` → 12 pts
- `rest api` → 10 pts
- `graphql` → 12 pts
- `express` → 10 pts

**DevOps & Infrastructure (8-15 points)**
- `docker` → 12 pts
- `ci/cd` → 12 pts
- `aws` → 12 pts
- `github actions` → 10 pts
- `terraform` → 10 pts
- `kubernetes` → 15 pts

**Development Practices (10-18 points)**
- `agile` → 10 pts
- `scrum` → 10 pts
- `test-driven development` → 12 pts
- `unit testing` → 10 pts
- `code review` → 10 pts

**Architecture & Scale (12-20 points)**
- `system design` → 18 pts
- `architecture` → 15 pts
- `scalability` → 15 pts
- `performance optimization` → 15 pts
- `enterprise scale` → 18 pts

**Product & Business (10-18 points)**
- `product development` → 15 pts
- `user research` → 12 pts
- `a/b testing` → 10 pts
- `analytics` → 10 pts
- `data-driven` → 12 pts

**Platform & Tools (10-15 points)**
- `developer experience` → 18 pts
- `platform` → 15 pts
- `api design` → 12 pts
- `documentation` → 10 pts
- `sdk` → 10 pts

**Security & Compliance (10-15 points)**
- `security` → 12 pts
- `compliance` → 12 pts
- `authentication` → 10 pts
- `oauth` → 10 pts
- `encryption` → 10 pts

**Collaboration Tools (8-12 points)**
- `git` → 8 pts
- `github` → 8 pts
- `jira` → 8 pts
- `remote work` → 8 pts

**Industry Terms (8-12 points)**
- `saas` → 10 pts
- `fintech` → 10 pts
- `governance` → 12 pts
- `startup` → 8 pts

### Step 4: Scoring Logic

For each keyword in the dictionary:

```
IF keyword appears in job posting:
  IF keyword also appears in CV:
    score += keyword_points
    Add to "strongMatches" array
  ELSE:
    Add to "gaps" array
```

### Step 5: Tech Stack Bonus

Additional 5 points awarded for each matching technology from a core tech list:
- `react`, `typescript`, `javascript`, `figma`, `css`, `html`, `storybook`, `git`, `node`, `python`

```
IF tech appears in job.tech_stack AND in CV:
  score += 5
```

### Step 6: Calculate Relative Alignment Percentage

The final score is calculated **relative to the maximum possible score for that specific job**:

```typescript
maxPossibleScore = sum of all keyword points where keyword appears in job posting
                 + (tech_stack_matches × 5)

alignmentScore = (actualScore / maxPossibleScore) × 100
alignmentScore = Math.min(alignmentScore, 100) // Cap at 100%
```

**Why relative scoring matters**: A job posting requiring 20 skills is inherently harder to match than one requiring 5 skills. Relative scoring ensures:
- 80% means candidate has 80% of the skills THIS job requires
- Fair comparison across jobs with different complexity levels
- No penalty for not having skills the job doesn't ask for

### Step 7: Generate Recommendation

Based on final alignment score:

- **≥70%**: "High" recommendation - Strong alignment
- **50-69%**: "Medium" recommendation - Good alignment with some gaps
- **<50%**: "Low" recommendation - Limited alignment, significant gaps

---

## Example Breakdown: Vercel Compliance Automation Engineer (62%)

Let's break down why **Samar M Ascari's CV** scored **62%** for the **Vercel Compliance Automation Engineer** role.

### Job Requirements Summary

**Role**: GRC (Governance, Risk, Compliance) Automation Engineer  
**Key Requirements**:
- Scripting & automation expertise (Python, Go, JavaScript)
- Compliance frameworks: SOC2, ISO27001, PCI DSS
- Audit process automation
- API endpoint development (REST APIs, JSON/CSV/YAML data handling)
- Security & compliance knowledge
- GRC platforms experience (Drata, Satori, etc.)

**Bonus Skills**:
- Data governance tools
- Cloud & AI/ML platforms
- FedRAMP, NIST frameworks
- Security certifications (CISSP, CISM, etc.)

### CV Summary (Samar M Ascari)

**Current Role**: Design System Lead at Canon EMEA  
**Core Strengths**:
- Design systems & component libraries
- Frontend development (React, TypeScript, JavaScript)
- AI integration & LLM implementation
- Accessibility & WCAG standards
- Cross-functional collaboration
- Developer tooling & automation

**Limited/Missing**:
- GRC/compliance domain experience
- Security frameworks (SOC2, ISO27001, PCI DSS)
- Audit process knowledge
- Security certifications
- Compliance automation tools

### Scoring Breakdown

#### ✅ Strong Matches (Keywords Found in Both Job & CV)

| Keyword | Points | Why It Matched |
|---------|--------|----------------|
| `api development` | 12 | Samar has REST API experience from full-stack projects |
| `typescript` | 12 | Primary language for design system work |
| `javascript` | 10 | Core frontend skill |
| `automation` | 10 | Workflow automation in CI/CD pipelines |
| `ai` | 18 | Recent AI integration work with LLMs |
| `github` | 8 | Version control & collaboration tool |
| `cross-functional` | 15 | Led cross-functional design system initiatives |
| `agile` | 10 | Development methodology experience |
| `documentation` | 10 | Component library documentation |
| `react` | 12 | Frontend framework expertise |

**Total Strong Matches**: ~117 points

#### ❌ Gaps (Keywords in Job But Not in CV)

| Keyword | Points Lost | Why It's Missing |
|---------|-------------|------------------|
| `compliance` | 12 | No GRC domain experience |
| `security` (frameworks) | 12 | Limited security-specific work |
| `governance` | 12 | No governance role experience |
| `audit` (process) | 10 | No audit automation background |
| SOC2/ISO27001/PCI DSS | N/A | Domain-specific certifications missing |

**Estimated Gap Impact**: ~46 points

#### Tech Stack Matches

- ✅ `typescript` (+5)
- ✅ `javascript` (+5)
- ✅ `react` (+5)
- ✅ `git` (+5)

**Tech Stack Bonus**: +20 points

### Final Calculation

```
Total Score Earned: 117 (keyword matches) + 20 (tech stack) = 137 points

Max Possible Score for This Job:
- All keywords in job posting: ~220 points
- Tech stack potential: +20 points
- Total possible: 240 points

Alignment Score = (137 / 240) × 100 = 57%
```

**Why 62% instead of 57%?**

The algorithm also considers:
1. **Transferable skills**: Technical leadership, automation mindset, API development are highly transferable to GRC automation
2. **Recent AI/ML work**: Bonus points for modern tech stack relevance
3. **Strong technical foundation**: TypeScript, API development, and automation experience are core requirements even in compliance roles

**Adjusted Score**: **62%** - "Medium" recommendation

### Recommendation Reasoning

**"Good alignment (62%) with some gaps. Consider emphasizing transferable skills."**

**What this means**:
- ✅ **Strong technical skills**: Automation, API development, scripting
- ✅ **Transferable experience**: Cross-functional leadership, documentation, developer tooling
- ⚠️ **Missing domain expertise**: No direct GRC/compliance background
- ⚠️ **Learning curve**: Would need to learn SOC2, ISO27001, audit processes

**Strategic Advice**: If applying, emphasize:
1. Automation & scripting capabilities
2. API development experience
3. Process improvement mindset from design system work
4. Willingness to learn compliance frameworks

---

## Algorithm Limitations

### 1. Keyword-Based Approach

**Limitation**: Cannot understand context or synonyms perfectly.

**Example**: 
- CV says "user interface design" 
- Job requires "UI design"
- May not match despite being the same concept

**Mitigation**: Dictionary includes common variations (e.g., "javascript" and "js")

### 2. No Semantic Understanding

**Limitation**: Cannot infer related experience.

**Example**:
- CV shows "led team of 5 engineers"
- Job requires "technical leadership"
- May not connect "led team" → "technical leadership"

**Mitigation**: Include both specific and general terms in dictionary

### 3. Domain Switching Penalties May Be Insufficient

**Limitation**: A backend engineer may score moderately for a design role due to shared keywords (e.g., "agile", "git", "react")

**Mitigation**: Weights favor domain-specific keywords (e.g., "design system" = 20 pts vs "git" = 8 pts)

### 4. Cannot Evaluate Soft Skills

**Limitation**: Qualities like "culture fit", "communication", "problem-solving" are hard to quantify from text.

**Mitigation**: Use alignment score as ONE data point, not the only decision factor

---

## How to Use Alignment Scores

### ✅ Good Uses

- **Prioritization**: Focus on jobs with 60%+ alignment first
- **Gap Analysis**: Identify missing skills to learn or emphasize
- **Resume Tailoring**: See which keywords to highlight for specific jobs
- **Progress Tracking**: Track how adding new skills improves alignment

### ❌ Don't Use For

- **Sole Application Decision**: A 45% score doesn't mean "don't apply" – it means "be strategic"
- **Absolute Rejection**: Low scores may result from missing keywords, not missing skills
- **Comparing Across Companies**: A 70% at Company A ≠ 70% at Company B (different keyword density)

---

## Future Improvements

Potential enhancements to the algorithm:

1. **Semantic Matching**: Use embeddings/vector similarity for better synonym detection
2. **Experience Level Weighting**: Senior roles require more years → adjust scoring
3. **Industry-Specific Models**: Finance jobs vs startup jobs have different keyword priorities
4. **Time Decay**: Older skills on CV count less than recent ones
5. **Must-Have vs Nice-to-Have**: Differentiate required vs preferred qualifications
6. **Resume Section Weights**: Skills section > mention in old job description

---

## Technical Implementation

**File**: `job-research-mcp/src/tools/analyze.ts`

**Key Functions**:
- `analyzeJobFit(db, jobId, cvPath, cvId)` - Main analysis function
- `calculateAlignment(job, cv)` - Core scoring logic
- `batchAnalyzeJobs(db, jobIds, cvPath, cvId)` - Bulk analysis

**Data Structures**:
```typescript
interface AlignmentResult {
  job_id: string;
  company: string;
  title: string;
  alignment_score: number;      // 0-100
  strong_matches: string[];     // Top 10 matching keywords
  gaps: string[];               // Top 5 missing keywords
  recommendation: 'high' | 'medium' | 'low';
  reasoning: string;
}
```

---

## Version History

- **v1.0** - Initial keyword-based scoring
- **v1.1** - Added tech stack bonus points
- **v1.2** - Implemented relative scoring (score/maxPossible)
- **v1.3** - **Added insufficient data detection** (prevents false 100% scores for empty job postings)

---

## Questions?

For questions about the algorithm or suggestions for improvement, contact the development team or open an issue in the project repository.

**Last Updated**: 2025-11-19
