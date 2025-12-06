# CV Optimiser Agent - Architecture

## System Overview
The CV optimiser uses a multi-stage pipeline with specialized agents, each responsible for a specific transformation or validation task.

## Agent Architecture

### Sequential Pipeline Approach
```
Input CV → Agent 1 → Agent 2 → Agent 3 → Agent 4 → Agent 5 → Output CV
           ↓         ↓         ↓         ↓         ↓
        Reports   Enhanced  Humanised Validated Formatted
```

### Alternative: Orchestrated Multi-Agent
```
                    Orchestrator Agent
                           |
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
    Agent 1            Agent 2            Agent 3
    (Analysis)       (Enhancement)      (Humanisation)
        ↓                  ↓                  ↓
        └──────────────────┼──────────────────┘
                           ↓
                    Agent 4 (Validation)
                           ↓
                    Agent 5 (Export)
```

## Agent Specifications

### Agent 1: ATS Scanner & Content Analyzer
**Primary Function**: Assess current CV quality and ATS compatibility

**Tools Required**:
- PDF/DOCX parser
- Keyword extraction library
- Pattern matching algorithms

**Inputs**:
- Raw CV file (PDF/DOCX/TXT)
- Job description (optional)

**Processing Tasks**:
1. Extract structured data (sections, bullets, dates, contact info)
2. Analyze formatting (fonts, spacing, section headers)
3. Check ATS compatibility factors:
   - File format appropriateness
   - Special characters/tables/columns
   - Font readability
   - Section standard naming
4. Extract existing keywords and skills
5. Identify quantified vs non-quantified achievements
6. Calculate baseline metrics

**Outputs**:
```json
{
  "ats_score": 65,
  "compatibility_issues": [
    "Contains tables (not ATS-friendly)",
    "Non-standard section header: 'My Journey'"
  ],
  "content_analysis": {
    "total_bullets": 24,
    "quantified_bullets": 8,
    "weak_action_verbs": 12,
    "missing_keywords": ["agile", "stakeholder management"]
  },
  "structure": {
    "sections": ["Experience", "Education", "Skills"],
    "missing_sections": ["Summary", "Certifications"]
  },
  "extracted_data": {
    "experiences": [...],
    "education": [...],
    "skills": [...]
  }
}
```

**LLM**: None required (rule-based processing)

---

### Agent 2: Content Enhancement Engine
**Primary Function**: Transform weak statements into strong, quantified achievements

**LLM**: GPT-4-turbo (fast, good at pattern-based transformations)

**Inputs**:
- Structured CV data from Agent 1
- Job description keywords (if provided)
- Industry context
- Seniority level

**Processing Tasks**:
1. Analyze each experience bullet point
2. Identify weak action verbs and replace with strong alternatives
3. Add quantification where possible (with placeholders for human validation)
4. Transform passive duties into active achievements
5. Incorporate relevant keywords from job description
6. Ensure STAR method (Situation, Task, Action, Result) where appropriate

**Example Transformation**:
```
BEFORE: "Responsible for managing a team and handling customer inquiries"

AFTER: "Led cross-functional team of 8 members, improving customer response time by 35% and increasing satisfaction scores from 3.2 to 4.5/5.0"
```

**Prompt Structure** (see PROMPTS.md for full templates):
```
Role: Expert CV writer specializing in [INDUSTRY]
Task: Transform duty statement into achievement
Context: [Role, company, seniority]
Constraints: 1-2 lines, specific metrics, strong action verb
Output: Single achievement statement
```

**Outputs**:
```json
{
  "enhanced_experiences": [
    {
      "original": "...",
      "enhanced": "...",
      "changes": ["Added quantification", "Replaced weak verb", "Added impact"],
      "validation_needed": ["Verify 35% improvement metric"],
      "confidence_score": 0.85
    }
  ],
  "keyword_integration": {
    "added": ["agile methodology", "stakeholder management"],
    "density": "optimal"
  },
  "overall_improvements": {
    "quantified_bullets": "18/24 (75%)",
    "strong_action_verbs": "22/24 (92%)"
  }
}
```

---

### Agent 3: Humanisation Specialist
**Primary Function**: Remove AI detection patterns and add natural human voice

**LLM**: Claude Sonnet 4.5 (superior nuanced understanding, ethical constraints)

**Inputs**:
- Enhanced content from Agent 2
- Candidate personality/voice profile (if available)
- Industry writing style expectations
- Seniority level formality requirements

**Processing Tasks**:
1. Analyze for AI detection patterns:
   - Overly consistent sentence structures
   - Perfect grammar (no natural variations)
   - Generic corporate language
   - Repetitive transitional phrases
   - Lack of personal voice markers

2. Apply humanisation techniques:
   - Vary sentence openings and lengths
   - Introduce subtle imperfections (natural phrasing)
   - Add industry-specific idioms/colloquialisms
   - Create authentic transitions between sections
   - Inject personality appropriate to role/seniority
   - Balance professionalism with authenticity

3. Voice consistency check across entire document

**Humanisation Strategies** (see HUMANISATION.md for details):
- Mix short (5-7 word) and long (20-25 word) bullets
- Use occasional sentence fragments where natural
- Include 1-2 industry colloquialisms per section
- Vary verb forms (not all present tense)
- Add contextual details that feel lived-in

**Quality Gates**:
- Must maintain all factual accuracy
- Cannot remove quantification from Agent 2
- Must preserve professional tone
- Target AI detection score: <15%

**Outputs**:
```json
{
  "humanised_content": {
    "experiences": [...],
    "summary": "...",
    "skills_narrative": "..."
  },
  "humanisation_report": {
    "ai_detection_score_before": 78,
    "ai_detection_score_after": 12,
    "techniques_applied": [
      "Varied sentence structure",
      "Added industry idioms: 3",
      "Natural transitions: 5 sections",
      "Voice consistency: maintained"
    ],
    "authenticity_score": 0.94
  },
  "preservation_check": {
    "quantified_achievements_maintained": true,
    "keywords_maintained": true,
    "factual_accuracy": true
  }
}
```

---

### Agent 4: Industry Validator & Quality Assurance
**Primary Function**: Verify industry appropriateness and overall quality

**LLM**: Claude Sonnet 4.5 or GPT-4-turbo (depending on industry database)

**Inputs**:
- Humanised content from Agent 3
- Target job description
- Industry standards database

**Processing Tasks**:
1. Validate terminology appropriateness for industry
2. Check title/role accuracy against industry norms
3. Verify skill relevance and currency
4. Assess experience narrative coherence
5. Check for logical progression in career trajectory
6. Validate formatting consistency
7. Spelling and grammar final check
8. Run AI detection test

**Validation Checklist**:
- [ ] Industry terminology accurate and current
- [ ] Job titles align with market standards
- [ ] Skills relevant and appropriately prioritized
- [ ] No contradictions in timeline/narrative
- [ ] Achievements proportional to role level
- [ ] Format consistent throughout
- [ ] No spelling/grammar errors
- [ ] AI detection score acceptable
- [ ] ATS compatibility maintained

**Outputs**:
```json
{
  "validation_status": "PASS",
  "quality_score": 92,
  "issues_found": [
    {
      "type": "minor",
      "location": "Experience section, bullet 3",
      "issue": "Outdated terminology: 'webmaster' → suggest 'front-end developer'",
      "auto_fixed": true
    }
  ],
  "industry_alignment": {
    "terminology_score": 95,
    "skills_relevance": 90,
    "title_appropriateness": 100
  },
  "final_metrics": {
    "ats_score": 89,
    "ai_detection_score": 11,
    "readability_score": 87,
    "keyword_match": 94
  }
}
```

---

### Agent 5: Export & Formatting Specialist
**Primary Function**: Generate final output files in required formats

**LLM**: None required (formatting logic)

**Inputs**:
- Validated content from Agent 4
- Format preferences
- ATS optimization rules

**Processing Tasks**:
1. Apply appropriate formatting for each export type
2. Ensure ATS-friendly PDF generation (no images, correct fonts)
3. Create clean DOCX with preserved formatting
4. Generate plain text version for online applications
5. Optional: LaTeX template for technical roles
6. Create metadata file with change log

**Output Formats**:
1. **ATS-Optimized PDF**
   - Standard fonts (Arial, Calibri, Times New Roman)
   - No images, tables, or columns
   - Simple bullet points
   - Clear section headers
   - Proper metadata

2. **Editable DOCX**
   - Preserved formatting
   - Tracked changes available
   - Comments on suggested validations

3. **Plain Text (TXT)**
   - For direct copy-paste into online forms
   - No formatting, clean structure

4. **LaTeX (optional)**
   - For technical/academic roles
   - Professional templates

**Metadata Generated**:
```json
{
  "processing_timestamp": "2024-12-06T10:30:00Z",
  "version": "2.1",
  "agents_used": ["Scanner", "Enhancer", "Humaniser", "Validator", "Exporter"],
  "processing_time_seconds": 127,
  "changes_made": {
    "bullets_enhanced": 18,
    "keywords_added": 7,
    "quantifications_added": 10,
    "humanisation_passes": 2
  },
  "validation_items_flagged": 3,
  "files_generated": [
    "CV_Optimised_ATS.pdf",
    "CV_Optimised_Editable.docx",
    "CV_PlainText.txt"
  ]
}
```

## Data Flow Diagram

```
┌─────────────────┐
│   Input CV      │
│  + Job Desc     │
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Agent 1: Scanner                   │
│  Extract, Parse, Analyze            │
│  Output: Structured data + scores   │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Agent 2: Content Enhancer          │
│  GPT-4-turbo                        │
│  Transform duties → achievements    │
│  Output: Enhanced content           │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Agent 3: Humaniser                 │
│  Claude Sonnet 4.5                  │
│  Remove AI patterns, add voice      │
│  Output: Natural-sounding content   │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Agent 4: Validator                 │
│  Claude Sonnet 4.5 or GPT-4         │
│  Check quality, industry fit        │
│  Output: Validated content          │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Agent 5: Export Formatter          │
│  Generate PDF, DOCX, TXT            │
│  Output: Final files + metadata     │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────┐
│  Optimized CV   │
│  Multiple Formats│
│  Quality Report │
└─────────────────┘
```

## State Management

Each agent passes both content and metadata:

```python
{
  "content": {
    "summary": "...",
    "experiences": [...],
    "education": [...],
    "skills": [...]
  },
  "metadata": {
    "stage": "agent_3_complete",
    "scores": {
      "ats": 89,
      "ai_detection": 11
    },
    "changes_log": [...],
    "validation_flags": [...]
  },
  "context": {
    "target_role": "Senior Product Manager",
    "industry": "SaaS",
    "seniority": "senior"
  }
}
```

## Error Handling & Fallbacks

**Agent Failures**:
- Agent 1 (Scanner): Return error + raw text extraction
- Agent 2 (Enhancer): Keep original content, log enhancement failure
- Agent 3 (Humaniser): Use Agent 2 output if humanisation fails
- Agent 4 (Validator): Flag issues but don't block export
- Agent 5 (Exporter): Generate at least one format successfully

**Quality Gates**:
- After Agent 2: Min 60% achievement transformation success
- After Agent 3: Max 25% AI detection score
- After Agent 4: Min 75% overall quality score
- Human review required if: validation fails or confidence < 70%

## Orchestration Options

### Option A: Sequential (Claude Code Sub-agents)
- Linear pipeline
- Easy to debug
- Each agent completes before next starts
- Good for initial implementation

### Option B: Parallel Processing (MCP Servers)
- Agents 2, 3, 4 can process different sections simultaneously
- Faster overall processing
- More complex orchestration
- Better for scale

### Option C: Hybrid
- Sequential for content transformation (1→2→3)
- Parallel for validation & formatting (4 & 5)
- Balanced approach

## Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Processing Time | < 3 min | < 5 min |
| ATS Score | > 85% | > 70% |
| AI Detection | < 15% | < 25% |
| Achievement Rate | > 80% | > 60% |
| Keyword Match | > 90% | > 75% |
| Error Rate | < 5% | < 10% |

## Next Steps
1. Implement Agent 1 (Scanner) - foundation
2. Build Agent 2 (Enhancer) with GPT-4-turbo
3. Develop Agent 3 (Humaniser) with Claude
4. Create validation framework (Agent 4)
5. Build export system (Agent 5)
6. Integration testing and optimization
