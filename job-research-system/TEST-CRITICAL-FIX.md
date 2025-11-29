# Test Critical Bug Fix - Marketing CV vs AI Job

**Servers Running:**
- ✅ Backend: http://localhost:3001
- ✅ Frontend: http://localhost:5173

---

## 🧪 Quick Test Steps

### 1. Hard Refresh Browser
**IMPORTANT:** Clear cached JavaScript
- **Mac**: Cmd + Shift + R
- **Windows/Linux**: Ctrl + Shift + R

### 2. Login as User with Marketing CV
- User ID: 5
- Active CV: `Product_Manager_Marketing_CV.docx`
- Profile: Product Manager / Marketing background
- Domains Configured: NONE

### 3. Analyze the Anthropic Job
- Navigate to Jobs page
- Find: **"Manager of Solutions Architecture"** at **Anthropic**
- Click "Analyze" or re-analyze if already analyzed

### 4. Verify Results

#### ✅ Expected Results (CORRECT):
```
Alignment Score: 30-40% (LOW)
Recommendation: LOW
Strong Matches: 
  - cross-functional
  - ai (only from "AI-powered" marketing context)
  - platform
  
Gaps:
  - ml
  - llm
  - gpt
  - claude
  - coaching
  
Reasoning: 
  "Limited alignment (34%). Significant gaps in key requirements. 
   Application not recommended - focus on jobs with better match."
```

#### ❌ Old Buggy Results (INCORRECT):
```
Alignment Score: 100% (HIGH)
Recommendation: HIGH
Strong Matches:
  - "Strong domain match: AI/ML" ← FALSE!
  - ai, ml, llm, gpt, claude ← OVER-MATCHED!
```

---

## 🔍 What to Check

### Score Range
- ✅ Should be: **30-40%** (LOW)
- ❌ Should NOT be: **70-100%** (HIGH)

### Domain Match Indicators
- ✅ Should NOT show: "Strong domain match: AI/ML"
- ✅ Should NOT show: "Domain match" badges
- ✅ User has NO domains configured, so no domain matching should occur

### Keyword Matching
- ✅ "ai" can appear (from "AI-powered" in marketing context)
- ❌ Should NOT heavily match: "ml", "llm", "gpt", "claude"
- ✅ These should appear in GAPS, not strong matches

### Recommendation
- ✅ Should be: **LOW**
- ❌ Should NOT be: HIGH or MEDIUM

---

## 🎯 Test Other Scenarios

### Scenario 1: User WITH Domains Configured
1. Go to Settings → Onboarding → Step 5: Domain Expertise
2. Select domains: "Product Management", "Marketing", "Content Strategy"
3. Re-analyze the Anthropic job
4. **Expected**: Score should STILL be LOW (30-40%)
5. **Expected**: Should show "Missing: AI/ML Engineering experience" in gaps

### Scenario 2: Design CV vs Design Job
1. Switch to a Design Systems CV (Samar's CV, user_id=2)
2. Analyze a Design Systems job
3. **Expected**: HIGH score (70-100%)
4. **Expected**: "🎯 Domain match: Design Systems" in strong matches

### Scenario 3: Cross-Domain with Transferable Skills
1. Use Frontend Engineering CV
2. Analyze a Mobile Engineering job
3. **Expected**: MEDIUM score (50-70%)
4. **Expected**: "🔄 Transferable: Mobile Engineering" in strong matches

---

## 🐛 If Bug Still Appears

### Symptoms:
- Score is still 100% for Marketing CV vs AI job
- "Strong domain match: AI/ML" still showing
- Recommendation is HIGH instead of LOW

### Troubleshooting:
1. **Check browser cache**: 
   - Open DevTools (F12)
   - Go to Network tab
   - Check "Disable cache"
   - Hard refresh again

2. **Check backend is updated**:
   ```bash
   curl http://localhost:3001/health
   # Should return: {"status":"ok","service":"job-research-api"}
   ```

3. **Check database was cleared**:
   ```bash
   cd job-research-mcp
   sqlite3 data/jobs.db "SELECT alignment_score FROM jobs WHERE job_id = 'anthropic-manager-of-solutions-architecture' AND user_id = 5;"
   # Should return empty or NULL
   ```

4. **Restart servers**:
   ```bash
   pkill -9 -f "node dist/http-server-express.js"
   pkill -9 -f "vite"
   cd job-research-mcp && node dist/http-server-express.js &
   cd ../job-research-ui && npm run dev &
   ```

---

## 📊 Success Criteria

- [x] Backend server running on port 3001
- [x] Frontend server running on port 5173
- [x] Old domain logic disabled in code
- [x] Database cleared of cached scores
- [ ] Browser cache cleared (user action)
- [ ] Marketing CV vs AI job scores LOW (30-40%)
- [ ] No false "Domain match" indicators
- [ ] Recommendation is LOW
- [ ] User can re-analyze all jobs with correct scores

---

## 📝 Notes

### What Changed
- Disabled old `detectJobDomain()` + `calculateDomainAlignment()` logic
- Removed +25 point bonus for domain matches
- New domain matching system is now the ONLY system running
- Scores are now based on actual CV content and user-configured domains

### Why This Matters
- Prevents users from applying to completely mismatched jobs
- Provides honest, accurate alignment scores
- Respects user-configured domain expertise
- No more fabricated matches

---

**Ready to test! Open http://localhost:5173 and verify the fix works! 🚀**











