# Quick Start Guide - Job Research System

## 🚀 Get Running in 3 Steps

### Step 1: Database Migration (One-Time Setup)
```bash
cd job-research-system/job-research-mcp
npm run migrate
```

**Expected Output:**
```
✅ Successfully applied 001_add_user_features.sql
   Applied: 1
   Skipped: 0
   Total: 1
```

This creates:
- 5 new tables (user_profiles, cv_documents, cv_variants, custom_companies, job_search_preferences)
- Seeds 22 default AI companies
- Extends jobs table with new fields

---

### Step 2: Start Backend Server
```bash
cd job-research-system/job-research-mcp
npm run dev:express
```

**Expected Output:**
```
🚀 Job Research HTTP API Server running on http://localhost:3001
📊 Health check: http://localhost:3001/health
🔧 API base URL: http://localhost:3001/api
📁 Uploads directory: /path/to/uploads

✨ Ready to serve the UI!
```

**Test It:**
```bash
curl http://localhost:3001/health
# Should return: {"status":"ok","service":"job-research-api"}
```

---

### Step 3: Activate New UI & Start Frontend
```bash
cd job-research-system/job-research-ui

# Activate the new App
mv src/App.tsx src/App-old.tsx
mv src/App-new.tsx src/App.tsx

# Start dev server
npm run dev
```

**Opens at:** http://localhost:5173

---

## ✅ First-Time User Flow

### 1. LinkedIn Profile (Auto-Opens)
- Modal opens automatically on first visit
- Fill in: Name, Headline, Skills, Experience
- Click "Save Profile"

### 2. Upload CV
- Click "Upload CV" button in header
- Drag & drop PDF or DOCX file
- Review parsed content
- Click "Save CV"

### 3. Select Companies
- Click "Select Companies" button in header
- Select from 20+ AI companies
- Click "Select All" or individual companies
- Click "Done"

### 4. Browse Jobs
- Left panel shows jobs from selected companies
- Pagination: 10 jobs per page
- Right panel shows your uploaded CV

---

## 📂 Project Structure

```
job-research-system/
├── job-research-mcp/          # Backend
│   ├── data/jobs.db           # SQLite database
│   ├── uploads/               # Uploaded CV files
│   ├── src/
│   │   ├── http-server-express.ts  # Main server ⭐
│   │   ├── db/schema.ts       # Database + methods
│   │   └── tools/cv-upload.ts # File parsing
│   └── dist/                  # Compiled JS
│
└── job-research-ui/           # Frontend
    ├── src/
    │   ├── App.tsx            # Main app (NEW VERSION) ⭐
    │   ├── store/             # Zustand stores (4 files)
    │   └── components/        # React components (10+ files)
    └── dist/                  # Build output
```

---

## 🔑 Key Features

### State Management
- **userStore** - Profile, CV documents, onboarding status
- **jobStore** - Jobs, pagination, filters, selected companies
- **cvStore** - CV variants, edit history, diffs
- **uiStore** - Modals, panels, theme

### Components
- **CompanySelector** - Grid of companies with search
- **CVUploader** - Drag-drop file upload
- **LinkedInImport** - Profile form
- **JobsList** - Paginated jobs with empty states
- **CVPreview** - CV display in right panel
- **SplitPanelLayout** - Resizable two-column layout

### API Endpoints
- **Companies:** GET/POST/PUT/DELETE `/api/companies`
- **CV:** POST `/api/cv/upload`, `/api/cv/save`
- **Profile:** POST/GET/PUT `/api/profile`
- **Jobs:** POST `/api/tools/get_jobs`

---

## 🐛 Troubleshooting

### "Failed to load jobs"
- ✅ Check backend server is running (port 3001)
- ✅ Check health endpoint: `curl http://localhost:3001/health`

### "No companies found"
- ✅ Run migration: `npm run migrate`
- ✅ Check database exists: `ls data/jobs.db`

### "CV upload failed"
- ✅ Check uploads directory exists
- ✅ File size under 5MB
- ✅ File type is PDF, DOCX, TXT, or MD

### "Port 3001 already in use"
- ✅ Kill old process: `lsof -ti:3001 | xargs kill`
- ✅ Or change port in `http-server-express.ts`

---

## 🎯 Test All Features

```bash
# 1. Health check
curl http://localhost:3001/health

# 2. Get companies
curl http://localhost:3001/api/companies

# 3. Create profile
curl -X POST http://localhost:3001/api/profile \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test User","headline":"Software Engineer"}'

# 4. Get jobs
curl -X POST http://localhost:3001/api/tools/get_jobs \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 📝 What Changed

### Old App (App-old.tsx)
- Grid layout
- Hardcoded companies
- No CV upload
- No user profile
- Simple job list

### New App (App.tsx)
- Split panel layout (resizable)
- 20+ selectable companies
- CV upload & parsing
- LinkedIn profile import
- Paginated jobs (10 per page)
- CV preview panel
- 4 Zustand stores for state

---

## ⚡ Quick Commands

```bash
# Backend
cd job-research-mcp
npm run migrate          # Run migrations
npm run build            # Compile TypeScript
npm run dev:express      # Start server (auto-rebuild)
npm run start:express    # Start server (production)

# Frontend
cd job-research-ui
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Database
sqlite3 data/jobs.db "SELECT * FROM custom_companies;"
sqlite3 data/jobs.db "SELECT * FROM cv_documents;"
sqlite3 data/jobs.db "SELECT * FROM user_profiles;"
```

---

## 🎉 You're Ready!

1. ✅ Migration ran successfully
2. ✅ Backend server running (port 3001)
3. ✅ Frontend running (port 5173)
4. ✅ New UI activated

**Next Steps:**
1. Create your LinkedIn profile
2. Upload your CV
3. Select companies
4. Browse jobs!

For detailed documentation, see:
- **IMPLEMENTATION-COMPLETE.md** - Full implementation details
- **PHASE2-COMPLETE.md** - Phase 2 completion summary
- **ARCHITECTURE.md** - System architecture (if exists)

---

**Happy Job Hunting! 🚀**
