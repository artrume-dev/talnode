# Sub-Agent Integration Guide

## Overview
This system uses **Claude Code's sub-agent capabilities** to provide specialized AI analysis. The sub-agents are invoked through Claude Code's conversational interface, not as separate services.

## How Sub-Agents Work

### Job Analyzer Sub-Agent (`claude-code-agents/job-analyzer.md`)

**Purpose**: Deep analysis of job opportunities with strategic guidance

**When It's Used**:
- When you ask Claude Code to "analyze this job for me"
- When you request "deep dive on Anthropic Design Systems role"
- When analyzing high-priority jobs (70%+ alignment score)

**How It Works**:
1. You interact with Claude Code in VS Code
2. Claude Code has access to `job-analyzer.md` context
3. The sub-agent prompt guides Claude to:
   - Use MCP tools (`search_ai_jobs`, `get_job_details`, `analyze_job_fit`)
   - Provide structured analysis with scores
   - Generate application strategies
   - Identify red flags and opportunities

**Example Usage**:
```
You: "Analyze the Anthropic Applied AI role and tell me if I should apply"

Claude (using job-analyzer context):
1. Calls MCP: get_job_details(job_id="anthropic-applied-ai-field-research")
2. Calls MCP: analyze_job_fit(job_id, cv_path)
3. Returns structured analysis:
   - Alignment Score: 85%
   - Strong Matches: Design systems, AI workflows, enterprise scale
   - Gaps: Limited ML research experience
   - Recommendation: HIGH PRIORITY - Apply with tailored CV
```

### CV Optimizer Sub-Agent (`claude-code-agents/cv-optimizer.md`)

**Purpose**: Optimize CV for specific jobs

**When It's Used**:
- After job analysis recommends tailoring CV
- When user clicks "Optimize CV" for a job in UI
- When preparing for high-priority applications

**How It Works**:
- Similar to job-analyzer, it's a prompt context
- Guides Claude to compare job requirements vs CV content
- Suggests specific rewording and emphasis changes
- Can generate multiple CV versions for different roles

## Integration with MCP Server

The MCP server (`job-research-mcp`) provides tools that sub-agents use:

### Available MCP Tools:
1. `search_ai_jobs` - Search for new opportunities
2. `get_jobs` - Filter existing jobs
3. `get_job_details` - Get full job description
4. `analyze_job_fit` - Calculate alignment score
5. `mark_job_applied` - Track application status
6. `get_application_stats` - View statistics
7. `upload_cv` - Store CV for analysis
8. `save_cv` - Persist CV changes

### API Endpoints (for UI):
- `POST /api/jobs/analyze-all` - Batch analyze all jobs against CV
- `POST /api/tools/search_ai_jobs` - Search for new jobs
- `POST /api/cv/upload` - Upload CV file
- `POST /api/cv/save` - Save CV document
- `POST /api/profile/save` - Save user preferences

## Current User Journey

### 1. Onboarding (Automated)
```
User completes 5-step wizard
  ↓
Frontend: POST /api/profile/save (preferences)
  ↓
Frontend: POST /api/tools/search_ai_jobs (all companies)
  ↓
Backend: Scrapes Greenhouse/Lever careers pages
  ↓
Backend: Stores jobs in SQLite
  ↓
UI: Displays X job matches
```

### 2. CV Upload (Automated Analysis)
```
User uploads CV in step 4 or later
  ↓
Frontend: POST /api/cv/upload (parse file)
  ↓
Frontend: POST /api/cv/save (store)
  ↓
Frontend: POST /api/jobs/analyze-all (auto-trigger)
  ↓
Backend: For each job, calculates alignment score
  ↓
Backend: Updates jobs.alignment_score column
  ↓
UI: Shows scores in job cards (red/yellow/green)
```

### 3. Manual Analysis (Sub-Agent via Chat)
```
User asks in Claude Code: "Analyze the Anthropic role"
  ↓
Claude uses job-analyzer.md context
  ↓
Claude calls MCP: get_job_details(job_id)
  ↓
Claude calls MCP: analyze_job_fit(job_id, cv_path)
  ↓
Claude returns structured analysis with:
  - Alignment breakdown by category
  - Strategic recommendations
  - Application approach
  - Red flags and opportunities
```

### 4. CV Optimization (Sub-Agent via UI or Chat)
```
User clicks "Optimize CV" button for job
  ↓
UI triggers cv-optimizer context
  ↓
Claude compares job requirements vs current CV
  ↓
Claude suggests specific changes:
  - Reword bullet points
  - Emphasize relevant projects
  - Adjust technical skills section
  ↓
User reviews and saves optimized CV
```

## What's Working vs Not Working

### ✅ Working:
- Onboarding wizard (5 steps)
- Profile preferences saved to database
- Job search triggered after onboarding
- CV upload and parsing
- Alignment score calculation
- Jobs displayed in UI with scores

### ❌ Not Working / Needs Fix:
1. **Job analysis was using wrong ID** (FIXED in this commit)
   - Was passing numeric `id` instead of string `job_id`
   - Now correctly passes `job.job_id` to `analyzeJobFit()`

2. **Onboarding didn't trigger job search** (FIXED in this commit)
   - Added auto-search call after profile save
   - Jobs now loaded immediately after onboarding

3. **Job count not displayed** (Pending)
   - Need to show "✅ Found 150 jobs matching your preferences"
   - Should display after onboarding completes

4. **Sub-agents not obviously triggered** (By Design)
   - Sub-agents are Claude Code prompts, not separate services
   - User must explicitly ask Claude Code to analyze jobs
   - Consider adding UI button: "Ask AI to analyze this job"

5. **Preference-based filtering not wired** (Pending)
   - Jobs are fetched but not filtered by preferences
   - Need to implement frontend filtering by:
     - `profile.preferred_industries` matches `job.title` or `job.tech_stack`
     - `profile.preferred_locations` matches `job.location`
     - `profile.preferred_job_types` matches `job.remote`

## Suggested Next Steps

### High Priority:
1. **Show job count after onboarding**
   ```tsx
   // In OnboardingWizard.tsx after search completes:
   toast.success(`✅ Found ${searchResults.length} jobs matching your preferences!`);
   ```

2. **Add "Analyze with AI" button to job cards**
   ```tsx
   <Button onClick={() => analyzeWithAI(job)}>
     <Sparkles className="h-4 w-4 mr-2" />
     Analyze with AI
   </Button>
   ```

3. **Wire up preference-based filtering**
   ```ts
   // In jobStore.ts filteredJobs():
   const matchesPreferences = (job: Job) => {
     const industries = JSON.parse(profile.preferred_industries || '[]');
     const locations = JSON.parse(profile.preferred_locations || '[]');
     // ... match logic
   };
   ```

### Medium Priority:
4. Create AI chat command shortcuts
5. Add job recommendation dashboard
6. Implement application tracking workflow

### Low Priority:
7. Add glassdoor integration
8. LinkedIn profile import
9. Email notifications for new matches

## Testing the Flow

### Test 1: Complete Onboarding
```bash
# Start servers
cd job-research-mcp && npm run build && node dist/http-server-express.js
cd job-research-ui && npm run dev

# In browser:
1. Visit http://localhost:5174
2. Complete 5-step wizard
3. Check console for "🔍 Searching for jobs..."
4. Should see "✅ Found X new jobs"
5. Jobs should appear in list
```

### Test 2: Upload CV and Analyze
```bash
# In browser:
1. Click Upload CV
2. Drop a PDF/DOCX file
3. Check console for "Analyzing X jobs..."
4. Check network tab: POST /api/jobs/analyze-all
5. Response should show analyzed_count and failed_count
6. Job cards should show alignment scores
```

### Test 3: Ask Claude to Analyze
```bash
# In Claude Code chat:
You: "Analyze the top 3 jobs for me and tell me which to apply to first"

Claude should:
1. Call get_jobs with filters
2. Sort by alignment_score DESC
3. Call analyze_job_fit for top 3
4. Return structured analysis with recommendations
```

## Architecture Notes

```
┌─────────────────┐
│   Claude Code   │ ← Main AI interface
│   (VS Code)     │
└────────┬────────┘
         │
         │ Uses prompts from:
         ├─ job-analyzer.md
         ├─ cv-optimizer.md
         │
         │ Calls MCP tools:
         ↓
┌─────────────────┐
│  MCP Server     │ ← HTTP API + MCP protocol
│  (Express)      │
└────────┬────────┘
         │
         │ Reads/writes:
         ↓
┌─────────────────┐
│  SQLite DB      │ ← Persistent storage
│  (jobs.db)      │
└─────────────────┘

┌─────────────────┐
│  React UI       │ ← Web interface
│  (Vite)         │
└────────┬────────┘
         │
         │ HTTP calls to:
         ↓
    MCP Server
```

## Key Files

### Backend:
- `job-research-mcp/src/http-server-express.ts` - HTTP API server
- `job-research-mcp/src/tools/analyze.ts` - Job analysis logic
- `job-research-mcp/src/tools/search.ts` - Job search logic
- `job-research-mcp/src/db/schema.ts` - Database operations

### Frontend:
- `job-research-ui/src/components/OnboardingWizard.tsx` - 5-step wizard
- `job-research-ui/src/components/CVUploader.tsx` - CV upload with auto-analysis
- `job-research-ui/src/components/JobCard.tsx` - Job display with scores
- `job-research-ui/src/store/userStore.ts` - User state (profile, preferences)
- `job-research-ui/src/store/jobStore.ts` - Job state (jobs, filters)

### Sub-Agents:
- `claude-code-agents/job-analyzer.md` - Job analysis prompt
- `claude-code-agents/cv-optimizer.md` - CV optimization prompt

## Summary

The "sub-agents" are **not separate processes** - they're specialized prompts that guide Claude Code's behavior when analyzing jobs or optimizing CVs. The MCP server provides the tools these sub-agents use. The UI provides the user-facing workflow, but deep analysis happens through conversation with Claude Code, not through the UI alone.

**User Journey**:
1. ✅ Complete onboarding (save preferences)
2. ✅ Auto-search jobs (backend scrapes careers pages)
3. ✅ Jobs displayed in UI
4. ✅ Upload CV (auto-triggers analysis)
5. ✅ Alignment scores calculated and displayed
6. 🔄 Ask Claude Code: "Analyze this job" ← This is where job-analyzer.md is used
7. 🔄 Claude provides strategic analysis ← Uses MCP tools
8. 🔄 Click "Optimize CV" ← Triggers cv-optimizer.md context
9. 🔄 Continue with application workflow
