# Testing Domain Matching - Quick Guide

**Servers Running:**
- ✅ Backend: http://localhost:3001
- ✅ Frontend: http://localhost:5173

---

## How to Test Domain Matching

### Step 1: Configure Your Domains

1. Open http://localhost:5173 in your browser
2. If you're not logged in, sign up or log in
3. Go through the onboarding wizard (or re-open it from settings)
4. **Step 5: Select Your Domain Expertise**
   - Choose domains that match your CV (e.g., Design Systems, Frontend Engineering, Product Management, UX Design)
   - You can select multiple domains
   - Click "Next" to continue

### Step 2: Analyze Jobs

1. Navigate to the Jobs page
2. Select companies to search (if not already done)
3. Click "Analyze Jobs" or "Analyze Matched Jobs"
4. Wait for the analysis to complete

### Step 3: Review Domain Matching Results

Look for these new domain indicators in job cards:

#### ✅ **Direct Domain Match**
```
Strong Matches: 🎯 Domain match: Frontend Engineering, Design Systems
```
- Jobs where your domains directly match
- +15 point bonus to score
- High alignment scores (70-100%)

#### 🔄 **Transferable Skills**
```
Strong Matches: 🔄 Transferable: Mobile Engineering, Backend Engineering
```
- Jobs where your domains transfer to related areas
- +10 point bonus to score
- Medium alignment scores (40-69%)

#### ❌ **Domain Mismatches**
```
Gaps: Missing: AI/ML Engineering experience, Missing: Data Science experience
```
- Jobs requiring domains you don't have
- Score capped at 35%
- Low alignment scores (20-35%)

#### 📝 **Domain Reasoning**
```
Reasoning: 🔄 Transferable skills: Backend Engineering. ⚠️ Gap in AI/ML Engineering, 
Security Engineering - consider highlighting transferable skills in your application...
```
- Clear explanation of domain alignment
- Actionable advice for applications

---

## Test Scenarios

### Scenario 1: Perfect Match
**Your Domains**: Frontend Engineering, React, TypeScript  
**Job**: Frontend Engineer - React/TypeScript  
**Expected**:
- Score: 85-100%
- Strong Matches: `🎯 Domain match: Frontend Engineering`
- Recommendation: HIGH

### Scenario 2: Transferable Skills
**Your Domains**: Frontend Engineering, UX Design  
**Job**: Mobile Engineer - React Native  
**Expected**:
- Score: 60-80%
- Strong Matches: `🔄 Transferable: Mobile Engineering`
- Recommendation: MEDIUM-HIGH

### Scenario 3: Domain Mismatch
**Your Domains**: Design Systems, Frontend Engineering  
**Job**: Data Scientist - ML/AI  
**Expected**:
- Score: ≤35% (capped)
- Gaps: `Missing: Data Science experience, Missing: AI/ML Engineering experience`
- Recommendation: LOW

---

## What to Look For

### ✅ Domain Info Appears
- Check that domain match indicators appear in job analysis
- Verify `🎯` for direct matches
- Verify `🔄` for transferable skills
- Verify `Missing:` in gaps for mismatches

### ✅ Scores Are Accurate
- Jobs with domain matches: 70-100%
- Jobs with transferable skills: 40-69%
- Jobs with domain mismatches: 20-35% (capped)

### ✅ Reasoning Is Clear
- Domain context appears at the start of reasoning
- Explains matches, transferable skills, and gaps
- Provides actionable advice

### ✅ Performance Is Good
- Job analysis completes quickly (< 2 seconds per job)
- No duplicate domain detection
- Smooth user experience

---

## Troubleshooting

### Domain Info Not Showing?
1. Make sure you configured domains in Step 5 of onboarding
2. Hard refresh the browser (Cmd+Shift+R or Ctrl+Shift+R)
3. Check browser console for errors
4. Verify backend is running: http://localhost:3001/health

### Scores Seem Wrong?
1. Check which domains you selected
2. Review the job description to see which domains it requires
3. Verify the domain match logic in the reasoning
4. Run the evaluation script: `cd job-research-mcp && node test-domain-matching.js`

### Frontend Not Loading?
1. Check if Vite is running: `lsof -i :5173`
2. Clear browser cache and reload
3. Check console for errors
4. Restart frontend: `cd job-research-ui && npm run dev`

### Backend Not Responding?
1. Check if Express is running: `lsof -i :3001`
2. Check backend logs in terminal
3. Restart backend: `cd job-research-mcp && node dist/http-server-express.js`

---

## Advanced Testing

### Test with Evaluation Script
```bash
cd job-research-mcp

# Configure test domains
sqlite3 data/jobs.db "UPDATE user_profiles SET user_domains = '[\"design-systems\",\"frontend-engineering\"]' WHERE user_id = 2;"

# Run evaluation
node test-domain-matching.js

# Reset domains
sqlite3 data/jobs.db "UPDATE user_profiles SET user_domains = NULL WHERE user_id = 2;"
```

### Test API Endpoints Directly
```bash
# Get available domains
curl http://localhost:3001/api/domains | jq '.domains | length'

# Get user profile (requires auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/profile
```

---

## Expected Behavior Summary

| Domain Match Type | Score Range | Indicator | Bonus Points |
|-------------------|-------------|-----------|--------------|
| Direct Match | 70-100% | 🎯 Domain match | +15 |
| Transferable | 40-69% | 🔄 Transferable | +10 |
| Mismatch (>50%) | 20-35% | Missing: X experience | 0 (capped) |
| No domains configured | Varies | None | 0 |

---

## Feedback

If you notice any issues or unexpected behavior:
1. Check the browser console for errors
2. Review the backend logs
3. Run the evaluation script to verify logic
4. Check the evaluation report: `DOMAIN-MATCHING-EVALUATION-REPORT.md`
5. Review the fixes: `DOMAIN-MATCHING-FIXES-COMPLETE.md`

---

**Happy Testing! 🚀**

The domain matching system is now fully functional and ready for production use.











