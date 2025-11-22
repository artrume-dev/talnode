# Preference-Based Job Filtering Fix

## Issue
After completing onboarding and selecting preferred locations, job types, and industries, the job list was showing ALL scraped jobs instead of filtering by user preferences.

## Root Cause
The `filteredJobs()` function in `jobStore.ts` was not reading or applying the user's preferences from the onboarding wizard. It only filtered by:
- Manually selected companies
- Status, priority, alignment score
- Search query
- Manual "remote only" toggle

But completely ignored:
- `preferred_locations` from user profile
- `preferred_job_types` from user profile  
- `preferred_industries` from user profile

## Solution Applied

### 1. Read User Preferences from LocalStorage
Added code to read user profile from localStorage (where it's persisted by Zustand):

```typescript
const userProfile = typeof window !== 'undefined' 
  ? JSON.parse(localStorage.getItem('user-storage') || '{}')?.state?.profile 
  : null;
```

### 2. Filter by Preferred Locations
Implemented smart location matching with:
- **Remote handling**: Checks both `job.remote` flag and location text
- **City abbreviations**: Maps "SF" → "San Francisco", "NYC" → "New York", etc.
- **Multi-location jobs**: Handles jobs like "San Francisco, CA; New York, NY"
- **International locations**: Supports UK, India, etc.

**Location mappings added**:
```typescript
'sf': ['san francisco', 'sf']
'nyc': ['new york', 'nyc', 'ny']
'la': ['los angeles', 'la']
'seattle': ['seattle', 'wa']
'austin': ['austin', 'tx']
'uk': ['london', 'uk', 'united kingdom']
'india': ['bangalore', 'india', 'mumbai', 'delhi']
```

### 3. Filter by Preferred Job Types
Implemented job type matching with:
- **Remote**: Checks `job.remote` flag or location text
- **Full-time**: Default assumption if not contract/part-time
- **Part-time**: Looks for "part-time" in title/description
- **Contract**: Looks for "contract" or "contractor"
- **Hybrid**: Checks location or description
- **On-site**: Jobs that are not remote

### 4. Filter by Preferred Industries
Implemented industry keyword matching with expansions:

**Industry keyword mappings**:
```typescript
'ai/ml': ['ai', 'machine learning', 'ml', 'llm', 'nlp']
'product management': ['product', 'pm', 'product manager']
'design systems': ['design system', 'component library', 'ui kit']
'developer tools': ['developer tools', 'dx', 'devtools', 'api']
'infrastructure': ['infrastructure', 'devops', 'platform', 'cloud']
'security': ['security', 'infosec', 'cybersecurity']
'frontend': ['frontend', 'react', 'vue', 'typescript']
'backend': ['backend', 'api', 'node', 'python']
```

Searches across:
- Job title
- Job description
- Tech stack
- Company name

### 5. Added Debug Logging
Added console logging to track filtering:
```typescript
console.log('📊 Jobs Stats:', {
  total: allJobs.length,
  filtered: allFilteredJobs.length,
  paginated: jobs.length,
  selectedCompanies: selectedCompanies.length
});
```

## Files Modified

1. **`job-research-ui/src/store/jobStore.ts`**
   - Updated `filteredJobs()` function (lines ~170-310)
   - Added preference-based filtering before other filters
   - Added smart keyword matching and location mappings

2. **`job-research-ui/src/components/JobsList.tsx`**
   - Added debug logging to show filtering stats
   - Helps verify filtering is working correctly

## Testing Instructions

### Test 1: Verify Preferences Are Saved
```bash
# In browser console after completing onboarding:
JSON.parse(localStorage.getItem('user-storage')).state.profile

# Should show:
{
  preferred_locations: '["Remote","SF","NYC"]',
  preferred_job_types: '["Full-time","Remote"]',
  preferred_industries: '["AI/ML","Product Management"]',
  ...
}
```

### Test 2: Check Filtering is Applied
```bash
# In browser console, check the debug output:
# Should see:
📊 Jobs Stats: {
  total: 154,        // All scraped jobs
  filtered: 87,      // After preference filtering
  paginated: 10,     // Current page (10 per page)
  selectedCompanies: 0
}

# If filtered count is same as total, filtering is NOT working
# If filtered count is less, filtering IS working
```

### Test 3: Verify Job Locations Match
```bash
# Look at jobs displayed - locations should match your preferences
# If you selected "Remote" + "SF", you should ONLY see:
# - Remote jobs (job.remote = true)
# - Jobs in San Francisco, CA
# - NOT jobs in Austin, Bangalore, etc. (unless you selected those)
```

### Test 4: Verify Job Types Match
```bash
# If you selected "Full-time" + "Remote":
# - Should see Full-time jobs
# - Should see Remote jobs
# - Should NOT see Part-time or Contract-only jobs
```

### Test 5: Verify Industries Match
```bash
# If you selected "AI/ML" + "Design Systems":
# - Should see jobs with "AI", "ML", "Machine Learning" in title/description
# - Should see jobs with "Design System" in title/description
# - Should NOT see unrelated jobs (e.g., pure Sales, Marketing)
```

## Expected Behavior

### Before Fix:
```
User completes onboarding:
- Selects: Remote, SF, NYC
- Selects: Full-time, Remote
- Selects: AI/ML, Design Systems

Jobs displayed: 154 (ALL jobs)
❌ Shows jobs in Austin, Bangalore, London
❌ Shows Part-time and Contract jobs
❌ Shows Sales, Marketing, Legal jobs
```

### After Fix:
```
User completes onboarding:
- Selects: Remote, SF, NYC
- Selects: Full-time, Remote
- Selects: AI/ML, Design Systems

Jobs displayed: ~60-80 (FILTERED jobs)
✅ Only shows Remote jobs OR jobs in SF/NYC
✅ Only shows Full-time OR Remote job types
✅ Only shows AI/ML OR Design System related jobs
```

## Edge Cases Handled

### Multi-Location Jobs
```
Job: "San Francisco, CA; New York, NY"
User preference: ["SF"]
Result: ✅ Matches (contains "san francisco")
```

### Remote Flag vs Location Text
```
Job A: { remote: true, location: "San Francisco, CA" }
Job B: { remote: false, location: "Remote" }
User preference: ["Remote"]
Result: ✅ Both match (checks flag AND text)
```

### Job Type Inference
```
Job: "Software Engineer" (no explicit "Full-time")
User preference: ["Full-time"]
Result: ✅ Matches (assumes full-time if not contract/part-time)
```

### Industry Keyword Expansion
```
Job title: "Machine Learning Engineer"
User preference: ["AI/ML"]
Result: ✅ Matches (ML is in AI/ML keyword list)
```

## Known Limitations

### 1. Over-Filtering
If user selects very specific preferences, they might get 0 results:
- Solution: Show a message suggesting to broaden preferences

### 2. Under-Filtering
Some jobs might slip through if they use unusual terminology:
- Example: Job says "Bay Area" but user selected "SF"
- Solution: Could expand location mappings

### 3. Industry Ambiguity
Some industries are hard to detect from job title/description:
- Example: "Product Operations" could be product OR operations
- Solution: Could use more sophisticated NLP or let user see "borderline" matches

### 4. Job Type Detection
Not all jobs explicitly state "Full-time":
- Current behavior: Assumes full-time if not stated otherwise
- Could be improved with better parsing

## Future Enhancements

### 1. Filter Strength Slider
Allow users to adjust how strict filtering is:
- Strict: Must match ALL criteria (AND logic)
- Relaxed: Match ANY criteria (OR logic)
- Balanced: Current behavior

### 2. "Show Why This Job Matched" Badge
Add tooltip showing which preference matched:
```tsx
<Badge>
  ✅ Matches: Remote, AI/ML
</Badge>
```

### 3. "Show All Jobs" Toggle
Let user temporarily disable preference filtering:
```tsx
<Switch>
  <label>Apply my preferences</label>
</Switch>
```

### 4. Save Filter Presets
Let user save multiple filter combinations:
- "Strict Remote Only"
- "SF Bay Area + AI/ML"
- "Any Location + Design Systems"

### 5. Negative Filters
Let user exclude certain things:
- "NOT Contract"
- "NOT Austin"
- "NOT Sales roles"

## Performance Considerations

### Current Approach: Client-Side Filtering
- ✅ Fast for <500 jobs
- ✅ No server changes needed
- ✅ Works offline
- ❌ Loads all jobs into memory
- ❌ Doesn't scale to thousands of jobs

### Alternative: Server-Side Filtering
Would require:
1. Update `/api/tools/get_jobs` to accept preference filters
2. Add SQL WHERE clauses for location/type/industry
3. Return only matching jobs

Benefits:
- Scales to thousands of jobs
- Faster initial load
- Reduces frontend bundle size

Tradeoffs:
- More complex backend logic
- Requires API changes
- Might be overkill for current use case

## Debugging Tips

### If filtering is too strict (0 results):
1. Check localStorage to verify preferences are saved correctly
2. Temporarily comment out one filter at a time to isolate issue
3. Check console for any JavaScript errors
4. Verify job data has expected fields (location, remote, etc.)

### If filtering is too loose (shows unrelated jobs):
1. Check if keyword mappings are too broad
2. Verify preferences are being parsed correctly (JSON.parse)
3. Add more specific keywords to industry mappings
4. Check if jobs have poor data quality (missing descriptions)

### If filtering breaks after onboarding:
1. Check if localStorage is being cleared
2. Verify user profile is being updated correctly
3. Check network tab for profile save API call
4. Ensure useJobStore is re-rendering when preferences change

## Summary

The core issue was that user preferences from onboarding were saved but never used. Now:

1. ✅ Preferences are read from localStorage
2. ✅ Location filtering with smart city matching
3. ✅ Job type filtering with inference
4. ✅ Industry filtering with keyword expansion
5. ✅ Debug logging for verification
6. ✅ Handles edge cases (multi-location, remote flag, etc.)

**Result**: Users now see only jobs that match their selected preferences from onboarding, making the job list much more relevant and manageable.
