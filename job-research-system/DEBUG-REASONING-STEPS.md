# Debug Guide: Reasoning Steps Not Showing

## What Was Fixed

1. **Enhanced Backend Logging**
   - Added `[SSE]` prefix to all streaming logs
   - Added step counter to track progress
   - Added initial connection message
   - Improved error handling

2. **Enhanced Frontend Logging**
   - Added detailed console logs at every step
   - Logs chunk reception, parsing, and state updates
   - Shows when steps are received and added to state

3. **Improved SSE Headers**
   - Added `X-Accel-Buffering: no` to prevent nginx buffering
   - Added `no-transform` to Cache-Control
   - Added initial connection message

## How to Debug

### Step 1: Check Browser Console

Open browser DevTools (F12) and look for these logs:

**When clicking "AI Job Analysis":**
```
🚀 Starting AI analysis with streaming...
🌐 Starting streaming request to: http://localhost:3001/api/jobs/ai-analyze
```

**When response is received:**
```
📡 Response received: { status: 200, contentType: 'text/event-stream', ... }
✅ Starting to read stream...
```

**When steps are received:**
```
📥 Received chunk: data: {"type":"info","message":"Checking for cached analysis..."}...
✅ Parsed reasoning step: { type: 'info', message: '...', ... }
📊 Progress step received: { type: 'info', ... }
📊 Updated reasoning steps: 1
```

### Step 2: Check Backend Console

Look for these logs in the backend terminal:

```
[SSE] Starting streaming response for job_id: X cv_id: Y
[SSE] Sending step #1: info Checking for cached analysis...
[SSE] Sending step #2: info Loading job and CV data...
[SSE] Sending step #3: tool_call Calling extract_skills...
```

### Step 3: Check Network Tab

1. Open DevTools → Network tab
2. Click "AI Job Analysis"
3. Find the request to `/api/jobs/ai-analyze`
4. Click on it and check:
   - **Status**: Should be `200 OK`
   - **Type**: Should be `eventsource` or `fetch`
   - **Response Headers**: Should include `Content-Type: text/event-stream`
   - **Response Preview**: Should show `data: {...}` lines

### Step 4: Common Issues

#### Issue: No steps in console
**Possible causes:**
- Backend not sending steps (check backend logs)
- Stream not being received (check Network tab)
- CORS issue (check console for CORS errors)

#### Issue: Steps in console but not in UI
**Possible causes:**
- React state not updating (check React DevTools)
- Modal not re-rendering (check if `reasoningSteps` prop is being passed)
- CSS hiding the steps (check if section is visible)

#### Issue: Stream ends immediately
**Possible causes:**
- Analysis is cached (check backend logs for "Found cached analysis")
- Error occurred (check for error steps)
- Backend crashed (check backend logs)

## Testing Checklist

- [ ] Backend server is running (`http://localhost:3001/health` works)
- [ ] Frontend is running (`http://localhost:5173`)
- [ ] Browser console shows streaming logs
- [ ] Backend console shows `[SSE]` logs
- [ ] Network tab shows `text/event-stream` response
- [ ] Steps appear in browser console
- [ ] Steps appear in UI modal

## Manual Test

1. Open browser console (F12)
2. Click "AI Job Analysis" on any job
3. Watch console for logs
4. Check if steps appear in modal

If steps appear in console but not in UI, the issue is with React state/rendering.
If steps don't appear in console, the issue is with the stream connection.

## Next Steps

If still not working:
1. Share browser console logs
2. Share backend console logs
3. Share Network tab screenshot
4. Check if there are any errors in either console

