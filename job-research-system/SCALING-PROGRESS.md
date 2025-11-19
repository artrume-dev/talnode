# Job Research System - Scaling Progress

## Current Status: Phase 1 - Foundation Complete ✅

**Branch:** `feature-job-research-scaling`
**Started:** 2025-11-19
**Last Updated:** 2025-11-19

---

## ✅ Completed

### 1. Dependencies Installed
**Frontend (`job-research-ui`):**
- ✅ zustand - State management
- ✅ @tanstack/react-query - Server state & caching
- ✅ react-dropzone - File drag-and-drop uploads
- ✅ react-hook-form + zod - Form handling & validation
- ✅ @tiptap/react + @tiptap/starter-kit - Rich text CV editor
- ✅ dompurify - HTML sanitization
- ✅ react-resizable-panels - Modern split panel layout

**Backend (`job-research-mcp`):**
- ✅ multer + @types/multer - File upload handling
- ✅ pdf-parse - Extract text from PDFs
- ✅ mammoth - Parse DOCX files
- ✅ file-type - Validate file types (magic bytes)
- ✅ diff-match-patch - Generate CV diffs
- ✅ express-rate-limit - API rate limiting

### 2. Database Migration System
- ✅ Created migration runner (`src/db/migrate.ts`)
- ✅ Added `npm run migrate` script
- ✅ Migration tracking table (prevents re-runs)
- ✅ Successfully applied first migration

### 3. Database Schema Updates
**New Tables Created:**
1. ✅ `user_profiles` - LinkedIn data, user info
2. ✅ `cv_documents` - Uploaded CV files & parsed content
3. ✅ `cv_variants` - Optimized CV versions per job
4. ✅ `custom_companies` - User-added companies
5. ✅ `job_search_preferences` - Saved search settings

**Extended Tables:**
- ✅ `jobs` - Added search_keywords, salary_range, department, posted_date

**Data Seeded:**
- ✅ 22 default AI companies (Anthropic, OpenAI, Vercel, Cursor, Replit, Perplexity, Hugging Face, Midjourney, Stability AI, Scale AI, Cohere, Character.AI, Adept, Inflection, Runway, ElevenLabs, AssemblyAI, AI21 Labs, Reka, Mistral AI, Together AI, Replicate)

---

## 🚧 In Progress

### Phase 2: State Management & Core Components
**Next Steps:**
1. Create Zustand stores (userStore, jobStore, cvStore, uiStore)
2. Setup React Query for API calls
3. Build CompanySelector component
4. Add company management API endpoints

---

## 📋 Remaining Work

### Phase 2: Frontend Components (Est. 2-3 days)
- [ ] Setup Zustand stores
  - [ ] userStore (profile, active CV)
  - [ ] jobStore (jobs, pagination, filters)
  - [ ] cvStore (variants, edits, diffs)
  - [ ] uiStore (panel state, view modes)
- [ ] Create CompanySelector component
  - [ ] Grid of companies with checkboxes
  - [ ] "Select All" toggle
  - [ ] Search/filter
  - [ ] "Add Custom Company" modal
- [ ] Create SplitPanelLayout
  - [ ] Resizable panels (react-resizable-panels)
  - [ ] Left: Jobs list (50%)
  - [ ] Right: CV preview (50%)
  - [ ] Mobile responsive (stack vertically)

### Phase 3: File Upload & Parsing (Est. 2-3 days)
- [ ] Create file upload backend
  - [ ] Upload handler (multer)
  - [ ] File validation
  - [ ] PDF parser
  - [ ] DOCX parser
  - [ ] AI-powered CV extraction
- [ ] Create CVUploader component
  - [ ] Drag-and-drop
  - [ ] File validation
  - [ ] Upload progress
  - [ ] Parsed content preview
  - [ ] Edit before save
- [ ] Create LinkedInImport component
  - [ ] Manual form (name, title, experience, skills, education)
  - [ ] Save to user_profiles table
  - [ ] Editable cards display

### Phase 4: Job Search & Pagination (Est. 1-2 days)
- [ ] Add company management API
  - [ ] GET /api/companies (list all)
  - [ ] POST /api/companies (add custom)
  - [ ] PUT /api/companies/:id (update)
  - [ ] DELETE /api/companies/:id (remove)
  - [ ] POST /api/companies/bulk-toggle (select/deselect)
- [ ] Update search API
  - [ ] Flexible keywords search
  - [ ] Company filtering
  - [ ] Pagination support
- [ ] Create JobPagination component
  - [ ] Page controls
  - [ ] "Showing X-Y of Z"
  - [ ] Jump to page
- [ ] Create JobsList component
  - [ ] Display 10 jobs per page
  - [ ] Loading states
  - [ ] Empty states

### Phase 5: CV Editing & Optimization (Est. 2-3 days)
- [ ] Create CVPreview component
  - [ ] Display active CV in right panel
  - [ ] Markdown rendering
  - [ ] Section-based layout
- [ ] Create CVEditor component
  - [ ] Simple textarea (MVP)
  - [ ] Markdown support
  - [ ] Autosave (debounced)
  - [ ] Save/Cancel buttons
- [ ] Create CVDiffViewer component
  - [ ] Side-by-side diff
  - [ ] Inline diff option
  - [ ] Accept/reject changes
  - [ ] Statistics
- [ ] Update CVOptimizer component
  - [ ] Remove modal, use right panel
  - [ ] Integrate with stores
  - [ ] Live variant preview
  - [ ] Edit variants

### Phase 6: App Integration (Est. 1-2 days)
- [ ] Refactor App.tsx
  - [ ] Replace grid with SplitPanelLayout
  - [ ] Add CompanySelector
  - [ ] Add onboarding flow
  - [ ] Integrate Zustand stores
  - [ ] Update routing logic
- [ ] Update JobCard component
  - [ ] Add salary display
  - [ ] Highlight keywords
  - [ ] Click to show in right panel
- [ ] Create CVPanel router
  - [ ] Switch between views (preview, editor, optimizer, diff)
  - [ ] Breadcrumb navigation

---

## 📊 Architecture

### Current Branch Structure
```
main
 └─ feature-cv-optimiser (CV optimizer complete)
     └─ feature-job-research-scaling (← Current)
```

### Database Schema
```
user_profiles (LinkedIn data)
  └─ cv_documents (uploaded CVs)
      └─ cv_variants (optimized versions)

custom_companies (user-added + defaults)

jobs (extended with keywords, salary, department)

job_search_preferences (saved filters)
```

### State Architecture (To Implement)
```typescript
// Zustand stores
userStore: {
  profile: UserProfile | null
  activeCVId: string | null
}

jobStore: {
  jobs: Job[]
  currentPage: number
  totalJobs: number
  filters: JobFilters
  selectedCompanies: string[]
}

cvStore: {
  variants: CVVariant[]
  selectedVariant: string | null
  edits: CVEdit[]
  isDirty: boolean
}

uiStore: {
  splitWidth: number
  activeView: 'preview' | 'editor' | 'optimizer' | 'diff'
}
```

---

## 🎯 Success Criteria

### MVP Ready When:
- [x] Dependencies installed
- [x] Database migrated
- [ ] User can select 20+ companies
- [ ] User can upload CV (PDF/DOCX)
- [ ] Jobs displayed with pagination (10/page)
- [ ] Split panel layout working
- [ ] CV optimization generates 3 variants
- [ ] User can edit and download optimized CV

---

## 🚀 Next Session Tasks

**Priority 1 (Start Next):**
1. Create Zustand stores structure
2. Build CompanySelector component
3. Add company API endpoints

**Priority 2:**
4. Build SplitPanelLayout
5. Integrate into App.tsx

**Priority 3:**
6. Build CVUploader
7. Add file parsing backend

---

## 📝 Notes

### Technical Decisions Made:
- **State Management:** Zustand (lightweight, TypeScript-friendly)
- **Split Panels:** react-resizable-panels (modern, maintained)
- **LinkedIn Import:** Manual form (MVP), can add ZIP upload later
- **CV Editor:** Start with textarea + Markdown, upgrade to Tiptap if needed
- **Development Order:** Full-stack per feature (not backend-first or frontend-first)

### Migration Notes:
- Migration system tracks applied migrations in `schema_migrations` table
- Migrations are idempotent (safe to re-run)
- SQL files live in `src/db/migrations/`
- Run with: `npm run migrate`

### Default Companies:
All 22 companies are marked `added_by_user=0` to distinguish from user-added ones.
Companies with known ATS systems have greenhouse_id or lever_id populated.

---

## 🔄 Rollback Plan

If something breaks:
```bash
# Go back to working CV optimizer
git checkout feature-cv-optimiser

# Or start fresh from main
git checkout main
git checkout -b feature-retry
```

---

## 📚 Documentation

**Created:**
- This file (SCALING-PROGRESS.md)

**To Create:**
- COMPANY-MANAGEMENT.md (how to add companies)
- CV-UPLOAD-GUIDE.md (upload and parsing)
- STATE-MANAGEMENT.md (Zustand store guide)

**Updated (Future):**
- ARCHITECTURE.md (add new tables, components)
- QUICKSTART.md (new onboarding flow)

---

**Last Commit:** `b09f011` - feat: Add database migration system and scaling foundation

**Next Milestone:** Complete Phase 2 (State Management & Core Components)
