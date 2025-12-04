---
description: Start both frontend and backend services for the job research system
---

Start the job research system by running both the backend Express server and frontend Vite dev server in the background.

The backend will run on http://localhost:3001 and the frontend will run on http://localhost:5173 (or 5174 if 5173 is in use).

Please execute the following commands in the background:

1. Start the backend Express server:
   ```bash
   cd /Users/samarmustafa/Documents/1Samar/50-apps-to-launch/RE-BUILT-WITH/cursor/cv-match/job-research-system/job-research-mcp && npm run start:express
   ```

2. Start the frontend Vite dev server:
   ```bash
   cd /Users/samarmustafa/Documents/1Samar/50-apps-to-launch/RE-BUILT-WITH/cursor/cv-match/job-research-system/job-research-ui && npm run dev
   ```

After starting both services, check their output to confirm they're running successfully and display the URLs to the user.
