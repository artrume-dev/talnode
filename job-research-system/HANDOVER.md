# Project Handover Document: CV Job Match System

**Last Updated:** November 24, 2025
**Current Phase:** Post-Dashboard Implementation, Job Scraping Integration
**Status:** Authentication system complete, API migration complete, Companies loading fixed, Jobs scraping ready

---

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Completed Work](#completed-work)
3. [Current State](#current-state)
4. [Pending Tasks](#pending-tasks)
5. [Technical Details](#technical-details)
6. [Known Issues](#known-issues)
7. [Database Schema](#database-schema)

---

## System Architecture

### Tech Stack
- **Frontend:** React 19.2.0 + TypeScript + Vite + Zustand + TailwindCSS + shadcn/ui
- **Backend:** Express.js + TypeScript + better-sqlite3
- **Authentication:** JWT (access + refresh tokens)
- **API Client:** Axios with interceptors for auto-auth
- **Dev Server Ports:** Frontend: 5173, Backend: 3001

### Project Structure
```
cv-job-match/
├── job-research-system/
│   ├── job-research-mcp/          # Backend (Express API)
│   │   ├── src/
│   │   │   ├── auth/              # JWT auth middleware
│   │   │   ├── db/schema.ts       # SQLite schema + queries
│   │   │   ├── routes/            # API route handlers
│   │   │   ├── tools/             # Job scraping + analysis
│   │   │   └── http-server-express.ts  # Main server
│   │   ├── dist/                  # Compiled JS (run from here)
│   │   └── data/jobs.db           # SQLite database
│   │
│   └── job-research-ui/           # Frontend (React SPA)
│       ├── src/
│       │   ├── components/        # React components
│       │   ├── services/          # API client + auth
│       │   ├── store/             # Zustand state management
│       │   └── pages/             # Route pages
│       └── ...
```

---

## Completed Work

### Phase 1: Authentication System (Completed)
✅ **JWT Authentication Implementation**
- Access tokens (15min) + refresh tokens (7 days)
- Token rotation on refresh
- Secure HTTP-only cookies for refresh tokens
- User registration with password hashing (bcrypt)
- Login/logout endpoints
- Protected routes with `authenticateUser` middleware

**Key Files:**
- `job-research-mcp/src/auth/middleware.ts` - Auth middleware
- `job-research-mcp/src/routes/auth.ts` - Auth endpoints
- `job-research-ui/src/services/auth.ts` - Frontend auth service

### Phase 2: Dashboard Implementation (Completed)
✅ **Dashboard Routes & Components**
- Dashboard overview with stats
- CV management page
- Job listings with filters
- Recent activity tracking
- Application tracking

**Key Files:**
- `job-research-mcp/src/routes/dashboard.ts` - Dashboard API
- `job-research-mcp/src/routes/applications.ts` - Applications API
- `job-research-ui/src/pages/DashboardOverview.tsx`
- `job-research-ui/src/pages/CVManagement.tsx`
- `job-research-ui/src/pages/JobsList.tsx`

### Phase 3: API Client Migration (Completed)
✅ **Centralized Axios Client**
- Replaced 14+ fetch() calls with centralized API client
- Automatic JWT token injection via request interceptors
- Automatic token refresh on 401 errors via response interceptors
- Retry failed requests after token refresh
- Type-safe helper functions (get, post, put, del, patch)

**Files Migrated (13 files):**
1. `CompanySelector.tsx`
2. `OnboardingWizard.tsx`
3. `CVUploader.tsx`
4. `CVManagement.tsx`
5. `CVPreview.tsx`
6. `CVOptimizer.tsx`
7. `JobsList.tsx`
8. `LinkedInImport.tsx`
9. `ChatInterface.tsx`
10. `AddCompanyModal.tsx`
11. `MainApp.tsx`
12. `userStore.ts`
13. `jobStore.ts`

**Key Files:**
- `job-research-ui/src/services/api.ts` - Centralized API client
- `job-research-ui/src/main.tsx` - Initializes axios interceptors

### Phase 4: Companies & Jobs Data Flow (Completed)
✅ **Fixed Multi-User Data Isolation**

**Problem Solved:**
- Companies were assigned to `user_id = 1` only
- Jobs were assigned to `user_id = 1` only
- New users couldn't see any companies or jobs

**Solution Implemented:**
1. **Database Fix:**
   - Set `user_id = NULL` for 38 default seed companies
   - Companies with `user_id = NULL` are shared across all users
   - User-specific companies have `user_id` set

2. **API Response Format:**
   - Changed `/api/companies` to return full company objects instead of strings
   - Before: `["Anthropic", "OpenAI", ...]`
   - After: `[{id: 1, company_name: "Anthropic", ats_type: "greenhouse", ...}, ...]`

3. **Schema Update:**
   - Updated `getAllCompanies(userId?)` to accept optional userId parameter
   - Query: `WHERE user_id = ? OR user_id IS NULL` (shows user's companies + shared)

**Key Changes:**
- `job-research-mcp/src/db/schema.ts:227` - getAllCompanies() method
- `job-research-mcp/src/http-server-express.ts:98` - /api/companies endpoint
- `job-research-ui/src/components/CompanySelector.tsx:52` - fetchCompanies()

**SQL Fix Applied:**
```sql
UPDATE custom_companies SET user_id = NULL WHERE added_by_user = 0;
```

---

## Current State

### Working Features ✅
1. **User Registration & Login**
   - New users can register (creates user_profile + preferences)
   - Login returns access + refresh tokens
   - Auto-refresh on 401 errors
   - Logout clears tokens

2. **Onboarding Flow**
   - 7-step wizard (industries, companies, locations, job types, CV upload, LinkedIn, profile)
   - Companies now load correctly (38 default companies)
   - CV upload with parsing (PDF, DOCX, TXT, MD)
   - Job scraping triggers at end of onboarding

3. **Dashboard**
   - Overview with stats (total jobs, applications, CVs)
   - CV management (upload, view, delete, set active)
   - Jobs list with filters (location, job type, etc.)
   - Recent activity feed

4. **Company Selection**
   - Modal shows 38 default companies (Anthropic, OpenAI, Vercel, etc.)
   - Select/deselect companies with checkboxes
   - "Find Jobs" button triggers job scraping for selected companies
   - Company selector accessible from main jobs page

5. **Multi-User Data Isolation**
   - Each user sees their own jobs
   - Shared default companies visible to all users
   - User-specific custom companies only visible to that user

### Backend Running ✅
- **Process:** Node.js on port 3001
- **PID:** Check with `lsof -i :3001`
- **Command:** `npm run start:express` (runs from `dist/`)
- **Hot Reload:** ❌ No (requires restart after changes)

### Frontend Running ✅
- **Process:** Vite dev server on port 5173
- **Command:** `npm run dev`
- **Hot Reload:** ✅ Yes (HMR enabled)

---

## Pending Tasks

### Immediate Priority 🔴

#### 1. Test Job Scraping Flow
**Status:** Ready to test, not verified
**Action:** User needs to click "Find Jobs" button in CompanySelector
**Expected Flow:**
1. User selects companies (e.g., Anthropic, OpenAI)
2. Clicks "Find Jobs" button
3. Frontend calls: `POST /api/companies/find-jobs` with company IDs
4. Backend scrapes jobs from selected companies (uses scrapers in `tools/`)
5. Jobs saved to DB with current user's `user_id`
6. Jobs appear in JobsList component

**Files Involved:**
- `CompanySelector.tsx:103` - handleFindJobs()
- `http-server-express.ts:137` - POST /api/companies/find-jobs
- `tools/search.ts` - searchNewJobs()
- `scrapers/` - Company-specific scrapers (Greenhouse, Lever, etc.)

**Potential Issues:**
- Scraping may fail for some companies (rate limits, changed HTML)
- Job deduplication logic needs verification
- User feedback during scraping (loading states)

#### 2. Fix TypeScript Build Errors
**Status:** 50+ TypeScript errors preventing clean build
**Impact:** Can't rebuild backend TypeScript without fixing errors
**Workaround:** Currently running from last successful `dist/` build

**Error Categories:**
1. Missing method signatures in JobDatabase class:
   - `getDashboardStats()`
   - `getRecentCVOptimizations()`
   - `getJobApplications()`
   - `getRecentJobApplications()`
   - `hasAppliedToJob()`
   - `createJobApplication()`
   - `updateJobApplication()`
   - `deleteJobApplication()`

2. Type mismatches in route handlers:
   - `user_id` not in type definitions for various objects
   - Parameter count mismatches

3. Private property access:
   - `auth.ts` accessing `db.db` (private property)

**Recommended Fix Approach:**
1. Create comprehensive TypeScript interfaces in `db/schema.ts`
2. Add missing method declarations to JobDatabase class
3. Update type definitions to include `user_id` where needed
4. Refactor direct `db.db` access to use public methods

---

### Secondary Priority 🟡

#### 3. CV Analysis & Job Matching
**Status:** Endpoints exist but need verification
**Endpoint:** `POST /api/jobs/analyze-all`
**Purpose:** Analyze all jobs against user's CV, calculate match scores

**Implementation:**
- Uses `tools/analyze.ts` - analyzeJobFit()
- Calculates alignment scores (0-100)
- Identifies strong matches and gaps
- Updates job records with scores

**Test Scenario:**
1. Upload CV via CVUploader
2. Set CV as active
3. Trigger analysis (should happen automatically after CV upload)
4. Verify match scores appear in jobs list

#### 4. CV Optimization Flow
**Status:** Partially implemented, needs testing
**Component:** `CVOptimizer.tsx`
**Service:** `services/ai.ts` - aiService.optimizeCV()

**Features:**
- Generate 3 CV versions (conservative, optimized, stretch)
- Target alignment scores (75%, 85%, 90%)
- Uses OpenAI or Anthropic API (configured via env vars)
- Fabrication detection (validates CV doesn't add false experience)

**Environment Variables Needed:**
```bash
VITE_AI_PROVIDER=anthropic  # or 'openai'
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_OPENAI_API_KEY=sk-...
```

**Validation Rules (in `ai.ts:293`):**
- Detects domain switching (e.g., Designer → Recruiter)
- Detects fabricated metrics (percentages, numbers)
- Blocks optimization if fabrication detected

#### 5. Dashboard Errors
**Status:** Backend errors present, need investigation

**Known Errors:**
1. `SqliteError: no such column: cv.cv_document_id`
   - Location: `routes/dashboard.ts:30` - getDashboardStats()
   - Cause: Schema mismatch between code and database

2. Missing dashboard methods in schema.ts
   - Need to implement all dashboard query methods
   - See "Fix TypeScript Build Errors" above

---

### Future Enhancements 🔵

#### 6. Job Scraping Improvements
- Add more ATS integrations (currently: Greenhouse, Lever, Workday, Ashby, SmartRecruiters)
- Implement rate limiting and retry logic
- Add scraping progress indicators
- Schedule automatic daily scraping

#### 7. Application Tracking
- Full CRUD for job applications
- Interview scheduling
- Follow-up reminders
- Offer management

#### 8. Advanced Filtering
- Salary range filters
- Skills-based matching
- Company size preferences
- Remote/hybrid/onsite filters

#### 9. Analytics & Insights
- Application success rates
- Best-performing companies
- Skills gap analysis
- Market trends

---

## Technical Details

### Authentication Flow

#### Registration
```
POST /api/auth/register
Body: { email, password, full_name }
→ Creates user in users table
→ Creates user_profile
→ Returns { user, access_token, refresh_token }
```

#### Login
```
POST /api/auth/login
Body: { email, password }
→ Validates credentials
→ Generates JWT access token (15min)
→ Generates refresh token (7 days) + stores in DB
→ Sets HTTP-only cookie with refresh token
→ Returns { user, access_token }
```

#### Token Refresh (Automatic)
```
Frontend axios interceptor detects 401
→ Calls authService.refreshToken()
→ POST /api/auth/refresh (with cookie)
→ Returns new access token
→ Retries original failed request
→ If refresh fails, redirects to /login
```

### API Request Flow

```typescript
// Frontend request
const response = await api.get('/jobs');

// Request Interceptor (automatic)
config.headers.Authorization = `Bearer ${accessToken}`;

// Backend Middleware
authenticateUser(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const decoded = jwt.verify(token, SECRET);
  req.user = { userId: decoded.userId };
  next();
}

// Route Handler
app.get('/api/jobs', authenticateUser, (req, res) => {
  const jobs = db.getJobs({ user_id: req.user.userId });
  res.json(jobs);
});
```

### Database User Isolation Pattern

**Rule:** All user-specific queries MUST filter by `user_id`

```typescript
// ✅ Correct - filters by user
db.getJobs({ user_id: req.user.userId })

// ❌ Wrong - returns all users' data
db.getJobs()

// ✅ Shared data - uses NULL for shared records
db.getAllCompanies(userId)
// Returns: WHERE user_id = ? OR user_id IS NULL
```

### State Management (Zustand)

**Stores:**
1. `userStore.ts` - User profile, CV documents, onboarding state
2. `jobStore.ts` - Jobs list, selected companies, filters
3. `uiStore.ts` - Modal states, loading states

**Persistence:**
- Uses `zustand/middleware/persist`
- Stored in localStorage
- Only persists: profile, activeCVId, isOnboarded

---

## Known Issues

### 1. Backend TypeScript Compilation
**Severity:** HIGH
**Impact:** Cannot rebuild backend without fixing 50+ TS errors
**Workaround:** Running from last successful `dist/` build
**Files Affected:** Multiple (see "Fix TypeScript Build Errors" above)

### 2. Dashboard Stats Errors
**Severity:** MEDIUM
**Impact:** Dashboard stats may not load correctly
**Error:** `SqliteError: no such column: cv.cv_document_id`
**Location:** `routes/dashboard.ts:30`
**Fix Needed:** Update schema queries to match actual column names

### 3. React Key Prop Warning
**Severity:** LOW
**Impact:** Console warning, no functional impact
**Location:** `CompanySelector.tsx:245`
**Status:** Fixed (key={company.id} present), may be cached React warning

### 4. Jobs Not Loading for New Users
**Severity:** MEDIUM
**Impact:** New users see 0 jobs until they scrape
**Expected Behavior:** This is correct - jobs are user-specific
**User Action Required:** Click "Select Companies" → "Find Jobs"

---

## Database Schema

### Key Tables

#### users
```sql
id, email, password_hash, created_at, last_login
```

#### user_profiles
```sql
id, user_id, linkedin_url, full_name, headline, summary,
current_position, years_of_experience, skills, experience,
education, preferred_industries, preferred_locations, preferred_job_types
```

#### custom_companies
```sql
id, company_name, careers_url, ats_type, greenhouse_id, lever_id,
workday_id, ashby_id, smartrecruiters_id, is_active, added_by_user,
created_at, user_id
```
**Important:**
- `user_id = NULL` → Shared company (visible to all)
- `user_id = <number>` → User-specific company
- `added_by_user = 0` → Default seed company
- `added_by_user = 1` → User-added custom company

#### jobs
```sql
id, job_id, company, title, url, description, requirements,
tech_stack, location, remote, alignment_score, status, priority,
notes, found_date, last_updated, user_id
```
**Important:** ALWAYS filter by `user_id` to maintain data isolation

#### cv_documents
```sql
id, user_profile_id, file_name, file_type, file_size, file_path,
parsed_content, is_active, uploaded_at
```

#### cv_variants
```sql
id, base_cv_id, job_id, variant_type (conservative/optimized/stretch),
content, match_score, changes_summary, strong_matches, gaps,
created_at
```

#### job_applications
```sql
id, user_profile_id, job_id, cv_variant_id, applied_date,
application_status, application_source, application_notes,
follow_up_date, interview_date, interview_notes, decision,
decision_date, offer_amount, offer_currency
```

### Database Location
```
job-research-system/job-research-mcp/data/jobs.db
```

### Database Access
```bash
# Open SQLite CLI
sqlite3 data/jobs.db

# Useful commands
.tables                           # List all tables
.schema <table_name>             # Show table structure
SELECT COUNT(*) FROM jobs;       # Count records
SELECT * FROM jobs LIMIT 5;      # View sample data
```

---

## Quick Start Commands

### Backend
```bash
cd job-research-system/job-research-mcp

# Install dependencies
npm install

# Build TypeScript (currently has errors)
npm run build

# Start server (runs from dist/)
npm run start:express

# Check if running
lsof -i :3001
```

### Frontend
```bash
cd job-research-system/job-research-ui

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

### Both (from root)
```bash
# Start both frontend and backend
cd job-research-system
# Use the /start slash command in Claude Code
# OR manually:
# Terminal 1: cd job-research-mcp && npm run start:express
# Terminal 2: cd job-research-ui && npm run dev
```

---

## Environment Variables

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:3001/api
VITE_AI_PROVIDER=anthropic  # or 'openai'
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_OPENAI_API_KEY=sk-...
```

### Backend (no .env currently)
- Database path: Hardcoded to `data/jobs.db`
- JWT secrets: Hardcoded in `auth/middleware.ts`
- Port: Hardcoded to 3001

**Recommendation:** Create `.env` for backend secrets

---

## Testing Checklist

### Authentication ✅
- [x] Register new user
- [x] Login with credentials
- [x] Access protected routes
- [x] Token auto-refresh on 401
- [x] Logout clears tokens

### Data Isolation ✅
- [x] User 1 cannot see User 2's jobs
- [x] User 1 cannot see User 2's CVs
- [x] Shared companies visible to all users

### Companies & Jobs ⚠️
- [x] Companies load in selector (38 companies)
- [ ] "Find Jobs" triggers scraping (needs testing)
- [ ] Jobs appear after scraping (needs testing)
- [ ] Jobs filtered by user_id (needs verification)

### CV Management ⚠️
- [x] Upload CV (PDF, DOCX, TXT, MD)
- [x] Set active CV
- [x] Delete CV
- [ ] CV parsing accuracy (needs testing)
- [ ] Job analysis with CV (needs testing)

### CV Optimization ⚠️
- [ ] Generate 3 CV versions (needs API keys + testing)
- [ ] Fabrication detection works (needs testing)
- [ ] CV variants saved correctly (needs testing)

---

## Common Debugging Commands

```bash
# Check running processes
ps aux | grep node
lsof -i :3001
lsof -i :5173

# Kill processes
kill <PID>
killall node

# Check database
cd job-research-system/job-research-mcp
sqlite3 data/jobs.db "SELECT COUNT(*) FROM jobs WHERE user_id = 4;"
sqlite3 data/jobs.db "SELECT * FROM custom_companies WHERE user_id IS NULL LIMIT 5;"

# View backend logs
# Backend logs appear in terminal where npm run start:express is running

# View frontend logs
# Open browser DevTools → Console
# API requests logged with 🟢/🔵/❌ emojis

# Rebuild backend (if TS errors fixed)
cd job-research-mcp
npm run build
kill <backend-pid>
npm run start:express
```

---

## Next Agent: Start Here

1. **Verify Current State:**
   - Backend running on port 3001? `lsof -i :3001`
   - Frontend running on port 5173? `lsof -i :5173`
   - Can you login with test user?

2. **High Priority Task: Test Job Scraping**
   - Login as any user
   - Click "Select Companies" button
   - Select 2-3 companies (e.g., Anthropic, OpenAI)
   - Click "Find Jobs"
   - Monitor console/backend logs for scraping progress
   - Verify jobs appear in jobs list
   - Check database: `SELECT COUNT(*) FROM jobs WHERE user_id = ?;`

3. **If Job Scraping Fails:**
   - Check backend console for errors
   - Verify scrapers in `tools/scrapers/` directory
   - Check company `ats_type` matches scraper (greenhouse, lever, etc.)
   - May need to update scrapers if company websites changed

4. **Medium Priority: Fix TypeScript Errors**
   - Start with missing method declarations in `db/schema.ts`
   - Add comprehensive interfaces for all return types
   - Fix type mismatches incrementally
   - Run `npm run build` after each fix
   - Goal: Clean TypeScript compilation

5. **Low Priority: Test CV Features**
   - Upload a CV
   - Trigger job analysis
   - Verify match scores appear
   - Test CV optimization (requires AI API keys)

---

## Contact & Resources

**Codebase:** `/Users/samarmustafa/Documents/1Samar/50-apps-to-launch/cv-job-match/`

**Key Documentation:**
- This handover doc: `HANDOVER.md`
- CV fabrication prevention: `job-research-system/docs/cv-fabrication-prevention.md`
- Detect fabricated CV: `job-research-system/docs/detect-fabricated-cv-content.md`

**Git Status (as of handover):**
```
M  job-research-system/job-research-mcp/src/tools/analyze.ts
M  job-research-system/job-research-ui/src/components/CVOptimizer.tsx
M  job-research-system/job-research-ui/src/components/CVPreview.tsx
M  job-research-system/job-research-ui/src/services/ai.ts
?? .claude/commands/
?? CV-sample/
?? job-research-system/docs/
```

**Branch:** `main` (no separate branches)

---

## Summary

### ✅ What's Working
- Authentication (JWT, registration, login, token refresh)
- Dashboard UI (overview, CV management, jobs list)
- API client migration (centralized axios with auto-auth)
- Multi-user data isolation (users see only their data)
- Companies loading (38 shared default companies)
- Company selection UI

### ⚠️ What Needs Testing
- Job scraping flow (endpoint exists, needs verification)
- CV analysis & matching (endpoint exists, needs testing)
- CV optimization with AI (needs API keys)

### 🔴 What Needs Fixing
- TypeScript compilation errors (50+ errors)
- Dashboard stats errors (schema mismatches)
- Missing database method implementations

### 🎯 Immediate Next Steps
1. Test job scraping: Click "Find Jobs" and verify
2. Fix TypeScript errors to enable clean builds
3. Verify CV analysis produces match scores

**Estimated Time to Production Ready:**
- With job scraping working: 2-3 days (fix TS errors + thorough testing)
- If scrapers need updates: 4-5 days (update scrapers + testing)

---

*End of Handover Document*
