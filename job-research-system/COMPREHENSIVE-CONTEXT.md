# Comprehensive Project Context

**Last Updated:** 2025-11-20  
**Purpose:** Complete reference for all agents working on this project

---

## 🎯 Project Overview

**Name:** CV Job Match System  
**Goal:** AI-powered job search and CV optimization platform  
**Tech Stack:** TypeScript, React, Express, SQLite, Claude AI, OpenAI

---

## 📁 Project Structure

```
job-research-system/
├── job-research-mcp/          # Backend API server
│   ├── src/
│   │   ├── http-server-express.ts  # Main API server (PORT 3001)
│   │   ├── db/
│   │   │   ├── schema.ts           # Database schema & operations
│   │   │   └── migrations/         # SQL migrations
│   │   ├── scrapers/               # ATS job scrapers
│   │   │   ├── base.ts
│   │   │   ├── greenhouse.ts
│   │   │   ├── lever.ts
│   │   │   ├── workday.ts
│   │   │   ├── ashby.ts
│   │   │   └── smartrecruiters.ts
│   │   └── tools/                  # Business logic
│   │       ├── search.ts
│   │       ├── analyze.ts
│   │       ├── cv-upload.ts
│   │       └── tracking.ts
│   └── data/
│       └── jobs.db                 # SQLite database
│
├── job-research-ui/           # Frontend React app
│   ├── src/
│   │   ├── App.tsx                # Main application
│   │   ├── components/
│   │   │   ├── JobCard.tsx
│   │   │   ├── JobsList.tsx
│   │   │   ├── CompanySelector.tsx
│   │   │   ├── CVOptimizer.tsx    # CV optimization modal
│   │   │   ├── CVUploader.tsx
│   │   │   └── CVPreview.tsx
│   │   ├── store/                 # Zustand state management
│   │   │   ├── jobStore.ts
│   │   │   ├── userStore.ts
│   │   │   └── uiStore.ts
│   │   └── services/
│   │       └── ai.ts              # AI integration
│   └── public/
│
├── cv/                        # Sample CVs and documentation
└── claude-code-agents/        # Agent prompt templates
    ├── cv-optimizer.md
    └── job-analyzer.md
```

---

## 🗄️ Database Schema

### Tables

#### `jobs`
Primary job listings storage
```sql
- job_id TEXT PRIMARY KEY
- company TEXT
- title TEXT
- description TEXT
- location TEXT
- job_type TEXT
- posted_date TEXT
- source_url TEXT
- scraped_at DATETIME
- status TEXT (new, reviewed, applied, archived)
- alignment_score REAL
- fit_analysis TEXT
- priority TEXT (low, medium, high, must-apply)
- notes TEXT
```

#### `custom_companies`
Company configurations for scraping
```sql
- id INTEGER PRIMARY KEY
- company_name TEXT UNIQUE
- careers_url TEXT
- ats_type TEXT (greenhouse, lever, workday, ashby, smartrecruiters, custom)
- greenhouse_id TEXT
- lever_id TEXT
- workday_id TEXT
- ashby_id TEXT
- smartrecruiters_id TEXT
- is_active BOOLEAN
- added_by_user BOOLEAN
```

#### `cv_documents`
User CV storage and management
```sql
- id INTEGER PRIMARY KEY
- user_profile_id INTEGER
- file_name TEXT
- file_type TEXT (pdf, docx, md)
- file_size INTEGER
- file_path TEXT
- parsed_content TEXT
- is_active BOOLEAN
- uploaded_at DATETIME
- updated_at DATETIME
```

#### `user_profiles`
User profile information
```sql
- id INTEGER PRIMARY KEY
- linkedin_url TEXT
- full_name TEXT
- headline TEXT
- summary TEXT
- current_position TEXT
- years_of_experience INTEGER
- skills TEXT
- experience TEXT (JSON)
- education TEXT (JSON)
- raw_data TEXT
- created_at DATETIME
- updated_at DATETIME
```

---

## 🔌 API Endpoints

### Base URL: `http://localhost:3001`

#### Company Management

**GET /api/companies**
- Returns: `{ companies: Company[] }`
- Description: List all companies with scraper configurations

**POST /api/companies**
- Body: `{ company_name, careers_url, ats_type, greenhouse_id?, lever_id? }`
- Returns: `{ company: Company, message }`
- Description: Add new company for tracking

**PUT /api/companies/:id**
- Body: `{ is_active?, company_name?, careers_url?, ats_type? }`
- Returns: `{ company: Company, message }`
- Description: Update company configuration

**DELETE /api/companies/:id**
- Returns: `{ message }`
- Description: Delete custom company

**POST /api/companies/find-jobs**
- Body: `{ company_ids: number[] }`
- Returns: `{ message, new_jobs_count, total_jobs_count }`
- Description: Trigger job scraping for selected companies

#### CV Management

**POST /api/cv/upload**
- Body: FormData with `cv` file
- Returns: `{ success, file_name, file_path, file_type, file_size, parsed_content }`
- Description: Upload and parse CV file

**POST /api/cv/save**
- Body: `{ file_name, file_path?, file_type, file_size, parsed_content }`
- Returns: `{ cv: CVDocument, message }`
- Description: Save CV to database

**GET /api/cv/list**
- Returns: `{ cvs: CVDocument[] }`
- Description: Get all user CVs

**GET /api/cv/active**
- Returns: `{ cv: CVDocument }`
- Description: Get currently active CV

**GET /api/cv/:id**
- Returns: `CVDocument`
- Description: Get specific CV by ID

**PUT /api/cv/:id/activate**
- Returns: `{ cv: CVDocument, message }`
- Description: Set CV as active

**PUT /api/cv/update**
- Body: `{ cv_id: number, parsed_content: string }`
- Returns: `{ message, cv: CVDocument }`
- Description: Update CV content (used by optimizer)

**DELETE /api/cv/:id**
- Returns: `{ message }`
- Description: Delete CV

#### Job Management

**POST /api/tools/get_jobs**
- Body: `{ company_ids?, status?, priorities?, search? }`
- Returns: `{ jobs: Job[] }`
- Description: Search and filter jobs

**POST /api/tools/get_job_details**
- Body: `{ job_id: string }`
- Returns: `{ job: Job }`
- Description: Get detailed job information

**POST /api/tools/mark_job_applied**
- Body: `{ job_id: string, notes?: string }`
- Returns: `{ success, message }`
- Description: Mark job as applied

**POST /api/tools/mark_job_reviewed**
- Body: `{ job_id: string, priority: string, notes?: string }`
- Returns: `{ success, message }`
- Description: Mark job as reviewed with priority

**POST /api/tools/archive_job**
- Body: `{ job_id: string, reason?: string }`
- Returns: `{ success, message }`
- Description: Archive job

---

## 🎨 Frontend State Management (Zustand)

### `jobStore`
Manages job listings and operations
```typescript
interface JobStore {
  jobs: Job[];
  filters: JobFilters;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  
  loadJobs: () => Promise<void>;
  setFilters: (filters: JobFilters) => void;
  setPage: (page: number) => void;
  markApplied: (jobId: string) => Promise<void>;
  archiveJob: (jobId: string) => Promise<void>;
}
```

### `userStore`
Manages user profile and CV data
```typescript
interface UserStore {
  profile: UserProfile | null;
  activeCVId: number | null;
  cvDocuments: CVDocument[];
  isOnboarded: boolean;
  
  setProfile: (profile: UserProfile) => void;
  setActiveCVId: (id: number) => void;
  setCVDocuments: (docs: CVDocument[]) => void;
  addCVDocument: (doc: CVDocument) => void;
  removeCVDocument: (id: number) => void;
  setActiveCV: (id: number) => void;
  updateCVContent: (cvId: number, content: string) => void;
}
```

### `uiStore`
Manages UI state
```typescript
interface UIStore {
  rightPanel: 'none' | 'job-details' | 'cv-optimizer' | 'cv-preview';
  selectedJobId: string | null;
  
  openJobDetails: (jobId: string) => void;
  openCVOptimizer: (jobId: string) => void;
  openCVPreview: () => void;
  closePanel: () => void;
}
```

---

## 🤖 AI Integration

### Service: `services/ai.ts`

#### `optimizeCV(job: Job, cvContent: string)`
Generates optimized CV versions for specific job

**Input:**
- `job`: Job object with title, company, description
- `cvContent`: User's current CV content (markdown)

**Output:**
```typescript
{
  versions: [
    {
      type: 'conservative' | 'optimized' | 'stretch',
      alignment: number,  // 1-100
      changes: string[],
      content: string
    }
  ],
  baseline_alignment: number,
  strong_matches: string[],
  gaps: string[]
}
```

**API Providers:**
- OpenAI (GPT-4) - via `VITE_OPENAI_API_KEY`
- Anthropic (Claude) - via `VITE_ANTHROPIC_API_KEY`

---

## 🔧 Job Scrapers

### Architecture

All scrapers extend `BaseScraper`:
```typescript
abstract class BaseScraper {
  abstract scrapeJobs(): Promise<Job[]>;
  protected normalizeJob(data: any): Job;
}
```

### Implemented Scrapers

#### ✅ **Greenhouse** (5 companies)
- Companies: Anthropic, Scale AI, Stability AI, Vercel, AssemblyAI
- Endpoint: `https://boards-api.greenhouse.io/v1/boards/{id}/jobs`
- Status: **Working** (146 jobs scraped)

#### ✅ **SmartRecruiters** (3 companies)
- Companies: Visa, Adobe, LinkedIn
- Endpoint: `https://api.smartrecruiters.com/v1/companies/{id}/postings`
- Status: **Working**

#### ✅ **Lever** (1 company)
- Company: Hugging Face
- Endpoint: `https://api.lever.co/v0/postings/{id}`
- Status: **Working**

#### ⚠️ **Workday** (5 companies)
- Companies: Apple, Meta, Netflix, Stripe, Airbnb
- Endpoint: Varies by tenant
- Status: **Needs valid tenant IDs**

#### ⚠️ **Ashby** (8 companies)
- Companies: Linear, Lattice, Ramp, Merge, Clay, Retool, Fal.ai, Notion
- Endpoint: `https://jobs.ashbyhq.com/{id}`
- Status: **Needs valid company IDs**

### Database-Driven Architecture

Scrapers are created dynamically from database:
```typescript
function createScraper(company: DatabaseCompany): BaseScraper | null {
  switch (company.ats_type) {
    case 'greenhouse':
      return new GreenhouseScraper(
        company.company_name,
        company.careers_url,
        company.greenhouse_id
      );
    // ... other types
  }
}

async function scrapeAllCompanies(db: JobDatabase): Promise<Job[]> {
  const companies = db.getAllCompanies()
    .filter(c => c.is_active && c.ats_type !== 'custom');
  
  const scrapers = companies
    .map(createScraper)
    .filter(s => s !== null);
  
  const results = await Promise.all(
    scrapers.map(s => s.scrapeJobs())
  );
  
  return results.flat();
}
```

---

## 🐛 Recently Fixed Issues

### 1. ❌ **CV Update API Returning 500 Error**
**Problem:** `/api/cv/update` endpoint failing with Internal Server Error

**Root Cause:** 
- Missing error details in response
- No GET endpoint for CV by ID
- updateCVContent not returning updated CV

**Fix Applied:**
```typescript
// Added GET /api/cv/:id endpoint
app.get('/api/cv/:id', (req, res) => {
  const cv = db.db.prepare('SELECT * FROM cv_documents WHERE id = ?')
    .get(parseInt(req.params.id));
  if (!cv) return res.status(404).json({ error: 'CV not found' });
  res.json(cv);
});

// Updated PUT /api/cv/update to return updated CV
app.put('/api/cv/update', (req, res) => {
  db.updateCVContent(cv_id, parsed_content);
  const updated = db.db.prepare('SELECT * FROM cv_documents WHERE id = ?').get(cv_id);
  res.json({ message: 'CV updated successfully', cv: updated });
});
```

### 2. ❌ **CVOptimizer Loading State**
**Problem:** No feedback while CV loads, confusing when no CV available

**Fix Applied:**
- Added `isLoadingCV` state
- Shows spinner during CV fetch
- Displays helpful error message if no CV found
- Only proceeds to optimization once CV loaded

### 3. ❌ **Hardcoded CV Content**
**Problem:** AI service using sample CV instead of real uploaded CV

**Fix Applied:**
- Removed `BASE_CV` constant from `ai.ts`
- Changed `optimizeCV(job)` → `optimizeCV(job, cvContent)`
- CVOptimizer loads CV from store or API before optimization
- Validation ensures CV exists before AI call

### 4. ❌ **Pagination Wrong Totals**
**Problem:** Showing "Page 1 of 10" but only 40 jobs (filtered)

**Fix Applied:**
```typescript
// Changed from totalJobs (state) to filtered count
const totalJobs = filteredJobs().length;
const totalPages = Math.ceil(totalJobs / pageSize);
```

### 5. ❌ **Company Filtering Not Working**
**Problem:** Company filter ignored, showing all jobs

**Fix Applied:**
```typescript
// Added ID-to-name conversion
if (filters.company_ids) {
  const companyNames = db.getAllCompanies()
    .filter(c => filters.company_ids.includes(c.id))
    .map(c => c.company_name);
  jobs = jobs.filter(job => companyNames.includes(job.company));
}
```

---

## 📊 Current System Status

### Database Statistics
- **Total Jobs:** 146
- **Active Companies:** 40
- **Working Scrapers:** 9 (Greenhouse: 5, SmartRecruiters: 3, Lever: 1)
- **CVs Uploaded:** Varies by user

### Job Distribution
- Anthropic: 47 jobs
- Scale AI: 45 jobs
- Visa: 40 jobs
- Vercel: 12 jobs
- Stability AI: 2 jobs

### Server Status
- Backend: `http://localhost:3001` ✅
- Frontend: `http://localhost:5178` ✅
- Database: `job-research-mcp/data/jobs.db` ✅

---

## 🚀 Development Workflow

### Starting Servers

```bash
# Terminal 1 - Backend
cd job-research-mcp
npm run dev
# Runs on http://localhost:3001

# Terminal 2 - Frontend
cd job-research-ui
npm run dev
# Runs on http://localhost:5173+ (finds available port)
```

### Running Scrapers

```bash
cd job-research-mcp
node run-scrapers.js
```

### Database Queries

```bash
cd job-research-mcp
sqlite3 data/jobs.db

# View jobs by company
SELECT company, COUNT(*) FROM jobs GROUP BY company;

# View active companies
SELECT company_name, ats_type, is_active FROM custom_companies;

# View uploaded CVs
SELECT id, file_name, is_active, uploaded_at FROM cv_documents;
```

---

## 🎯 Complete CV Optimization Workflow

### User Flow

1. **Upload CV** → `CVUploader` component
2. **Browse Jobs** → `JobsList` shows filtered results
3. **Click "Optimize CV"** → Opens `CVOptimizer` modal
4. **Load CV** → Fetches from store or API (`GET /api/cv/:id`)
5. **Generate Versions** → Calls `aiService.optimizeCV(job, cvContent)`
6. **Review Options** → 3 versions: Conservative, Optimized, Stretch
7. **Select Version** → Choose best fit
8. **Update CV** → Saves to database (`PUT /api/cv/update`)
9. **Download** → Export as markdown

### Component Chain

```
App.tsx
  └─ JobsList.tsx
      └─ JobCard.tsx
          └─ [Optimize CV button]
              └─ CVOptimizer.tsx
                  ├─ Load CV (userStore.cvDocuments or GET /api/cv/:id)
                  ├─ Call AI (aiService.optimizeCV(job, cvContent))
                  ├─ Display 3 versions
                  └─ Save (PUT /api/cv/update, userStore.updateCVContent)
```

### Data Flow

```typescript
// 1. Load CV
const { activeCVId, cvDocuments } = useUserStore();
const localCV = cvDocuments.find(cv => cv.id === activeCVId);
const cvContent = localCV?.parsed_content || 
                  await fetch(`/api/cv/${activeCVId}`).then(r => r.json());

// 2. Optimize with AI
const result = await aiService.optimizeCV(job, cvContent);
// Returns: { versions, baseline_alignment, strong_matches, gaps }

// 3. Save selected version
await fetch('/api/cv/update', {
  method: 'PUT',
  body: JSON.stringify({
    cv_id: activeCVId,
    parsed_content: selectedVersion.content
  })
});

// 4. Update local store
updateCVContent(activeCVId, selectedVersion.content);
```

---

## 📝 Key Implementation Notes

### 1. CV Content Source
- **✅ DO:** Load from `userStore.cvDocuments` first (fast, local)
- **✅ DO:** Fallback to API if not in store
- **❌ DON'T:** Use hardcoded sample CVs
- **❌ DON'T:** Assume CV exists without checking

### 2. API Error Handling
- **✅ DO:** Return detailed error messages
- **✅ DO:** Include proper HTTP status codes
- **✅ DO:** Log errors for debugging
- **❌ DON'T:** Return generic "Internal Server Error"

### 3. State Management
- **✅ DO:** Use Zustand stores for persistence
- **✅ DO:** Update both API and store simultaneously
- **✅ DO:** Handle loading states visually
- **❌ DON'T:** Rely only on API without local state

### 4. AI Integration
- **✅ DO:** Validate inputs before API call
- **✅ DO:** Handle both OpenAI and Anthropic providers
- **✅ DO:** Parse AI responses safely
- **❌ DON'T:** Assume AI response format

---

## 🔮 Future Enhancements

### Priority 1: Fix Non-Working Scrapers
- [ ] Research correct Workday tenant IDs
- [ ] Verify Ashby company identifiers
- [ ] Add 13 more companies to scraping

### Priority 2: CV Templates & Export
- [ ] Create template system (Modern, Traditional, Creative, Tech)
- [ ] Implement PDF generation
- [ ] Add DOCX export
- [ ] Build template preview component

### Priority 3: CV Variants Tracking
- [ ] Create `cv_variants` database table
- [ ] Track optimization history per job
- [ ] Side-by-side variant comparison
- [ ] Link variants to applications

### Priority 4: Advanced Features
- [ ] Automated daily scraping
- [ ] Email notifications for new jobs
- [ ] Application tracking dashboard
- [ ] Cover letter generation
- [ ] Interview preparation mode

---

## 🧪 Testing Checklist

### Backend API
- [x] GET /api/companies returns all companies
- [x] POST /api/companies/find-jobs triggers scraping
- [x] GET /api/cv/active returns active CV
- [x] GET /api/cv/:id returns specific CV
- [x] PUT /api/cv/update saves changes
- [x] POST /api/cv/upload processes files

### Frontend UI
- [x] Job list displays with pagination
- [x] Company filter works correctly
- [x] "Find Jobs" button triggers scraping
- [x] CV Optimizer opens from job card
- [x] CV loading shows spinner
- [x] AI optimization generates 3 versions
- [x] "Update CV" saves to database
- [x] Download exports markdown file

### State Management
- [x] userStore persists across page refresh
- [x] CVs load from store when available
- [x] Active CV ID updates correctly
- [x] Job filters maintain state

---

## 📚 Related Documentation

- **SESSION-SUMMARY.md** - Latest session activities and changes
- **CV-OPTIMIZER-GUIDE.md** - Original CV optimizer implementation guide
- **ARCHITECTURE.md** - System architecture overview
- **QUICK-START.md** - Getting started guide

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check if port 3001 is in use
lsof -i :3001
# Kill existing process
pkill -f http-server-express
# Restart
cd job-research-mcp && npm run dev
```

### Frontend build errors
```bash
# Clear node modules and rebuild
cd job-research-ui
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Database locked
```bash
# Stop all processes accessing DB
pkill -f http-server-express
# Remove lock files
cd job-research-mcp/data
rm -f jobs.db-shm jobs.db-wal
```

### CV not loading
```bash
# Check CV exists in database
sqlite3 job-research-mcp/data/jobs.db "SELECT id, file_name, is_active FROM cv_documents;"

# Verify API endpoint
curl http://localhost:3001/api/cv/active

# Check userStore state in browser DevTools
localStorage.getItem('user-storage')
```

---

**Last Updated:** 2025-11-20  
**Maintained By:** AI Agents  
**Version:** 2.0
