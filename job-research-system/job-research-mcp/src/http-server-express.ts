#!/usr/bin/env node

/**
 * Express HTTP API Server for Job Research MCP
 *
 * This server provides a REST API interface with file upload support.
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { JobDatabase } from './db/schema.js';
import {
  searchNewJobs,
  getJobs,
  getJobDetails,
  analyzeJobFit,
  batchAnalyzeJobs,
  markApplied,
  markReviewed,
  archiveJob,
  getApplicationStats,
  getJobsNeedingAttention,
} from './tools/index.js';
import { parseCV } from './tools/cv-upload.js';
import authRoutes from './routes/auth.js';
import { authenticateUser } from './auth/middleware.js';
import { createDashboardRoutes } from './routes/dashboard.js';
import { createApplicationsRoutes } from './routes/applications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3001;
const db = new JobDatabase();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const UPLOADS_DIR = join(__dirname, '../uploads');
if (!existsSync(UPLOADS_DIR)) {
  await mkdir(UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['.pdf', '.docx', '.txt', '.md'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} is not supported. Allowed: PDF, DOCX, TXT, MD`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'job-research-api' });
});

// Mount authentication routes
app.use('/api/auth', authRoutes);

// Mount dashboard routes
app.use('/api/dashboard', createDashboardRoutes(db));

// Mount applications routes
app.use('/api', createApplicationsRoutes(db));

// Company Management API
app.get('/api/companies', authenticateUser, (req, res) => {
  try {
    const companies = db.getAllCompanies(req.user!.userId);
    // Return array of company names for the UI
    const companyNames = companies.map((c: any) => c.company_name);
    res.json(companyNames);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/companies', authenticateUser, (req, res) => {
  try {
    const { company_name, careers_url, ats_type, greenhouse_id, lever_id } = req.body;

    if (!company_name || !careers_url || !ats_type) {
      return res.status(400).json({ error: 'Missing required fields: company_name, careers_url, ats_type' });
    }

    const newCompany = db.addCustomCompany({
      user_id: req.user!.userId,
      company_name,
      careers_url,
      ats_type,
      greenhouse_id,
      lever_id,
    });

    res.status(201).json({ company: newCompany, message: 'Company added successfully' });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'Company already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// POST /api/companies/find-jobs - Trigger scraping for selected companies
app.post('/api/companies/find-jobs', authenticateUser, async (req, res) => {
  try {
    const { company_ids } = req.body;

    // Get company names from IDs
    const allCompanies = db.getAllCompanies(req.user!.userId);
    let companyNames: string[] | undefined;

    if (company_ids && Array.isArray(company_ids) && company_ids.length > 0) {
      companyNames = allCompanies
        .filter((c: any) => company_ids.includes(c.id))
        .map((c: any) => c.company_name);
    }

    // Scrape jobs
    const newJobs = await searchNewJobs(db, companyNames);

    res.json({
      message: `Found ${newJobs.length} new jobs`,
      new_jobs_count: newJobs.length,
      total_jobs_count: db.getJobs({ user_id: req.user!.userId }).length
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/companies/:id', authenticateUser, (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    const { is_active, company_name, careers_url, ats_type } = req.body;

    const updated = db.updateCustomCompany(companyId, req.user!.userId, {
      is_active,
      company_name,
      careers_url,
      ats_type,
    });

    res.json({ company: updated, message: 'Company updated successfully' });
  } catch (error: any) {
    if (error.message === 'No fields to update') {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.delete('/api/companies/:id', authenticateUser, (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    db.deleteCustomCompany(companyId, req.user!.userId);
    res.json({ message: 'Company deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// CV Upload and Management API
app.post('/api/cv/upload', authenticateUser, upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { filename, path: filePath, originalname, mimetype, size } = req.file;

    // Parse the CV content
    const parsedContent = await parseCV(filePath, mimetype);

    res.json({
      success: true,
      file_name: originalname,
      file_path: filename,
      file_type: path.extname(originalname).slice(1),
      file_size: size,
      parsed_content: parsedContent,
    });
  } catch (error: any) {
    console.error('CV upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload CV' });
  }
});

app.post('/api/cv/save', authenticateUser, (req, res) => {
  try {
    const { file_name, file_path, file_type, file_size, parsed_content } = req.body;

    if (!file_name || !parsed_content) {
      return res.status(400).json({ error: 'Missing required fields: file_name, parsed_content' });
    }

    const cv = db.saveCVDocument({
      user_id: req.user!.userId,
      file_name,
      file_type: file_type || path.extname(file_name).slice(1),
      file_size: file_size || 0,
      file_path: file_path || '',
      parsed_content,
      is_active: true,
    });

    res.json({ cv, message: 'CV saved successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cv/list', authenticateUser, (req, res) => {
  try {
    const cvs = db.getCVDocuments(req.user!.userId);
    res.json({ cvs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cv/active', authenticateUser, (req, res) => {
  try {
    const cv = db.getActiveCV(req.user!.userId);
    res.json({ cv });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cv/:id', authenticateUser, (req, res) => {
  try {
    const cvId = parseInt(req.params.id);
    const cv = db.getCVDocument(cvId, req.user!.userId);

    if (!cv) {
      return res.status(404).json({ error: 'CV not found' });
    }

    res.json(cv);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/cv/:id/activate', authenticateUser, (req, res) => {
  try {
    const cvId = parseInt(req.params.id);
    const cv = db.setActiveCVDocument(cvId, req.user!.userId);
    res.json({ cv, message: 'CV activated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cv/:id', authenticateUser, (req, res) => {
  try {
    const cvId = parseInt(req.params.id);
    db.deleteCVDocument(cvId, req.user!.userId);
    res.json({ message: 'CV deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/cv/update - Update CV content
app.put('/api/cv/update', authenticateUser, (req, res) => {
  try {
    const { cv_id, parsed_content } = req.body;

    if (!cv_id || !parsed_content) {
      return res.status(400).json({ error: 'cv_id and parsed_content are required' });
    }

    db.updateCVContent(cv_id, parsed_content, req.user!.userId);
    const updated = db.getCVDocument(cv_id, req.user!.userId);
    res.json({ message: 'CV updated successfully', cv: updated });
  } catch (error: any) {
    console.error('CV update error:', error);
    res.status(500).json({ error: error.message || 'Failed to update CV' });
  }
});

// User Profile API
app.post('/api/profile', authenticateUser, (req, res) => {
  try {
    const {
      linkedin_url,
      full_name,
      headline,
      summary,
      current_position,
      years_of_experience,
      skills,
      experience,
      education,
    } = req.body;

    if (!full_name) {
      return res.status(400).json({ error: 'Missing required field: full_name' });
    }

    const profile = db.saveUserProfile({
      user_id: req.user!.userId,
      linkedin_url,
      full_name,
      headline,
      summary,
      current_position,
      years_of_experience,
      skills,
      experience,
      education,
    });

    res.json({ profile, message: 'Profile saved successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Save profile with preferences (used by onboarding)
app.post('/api/profile/save', authenticateUser, (req, res) => {
  try {
    const {
      linkedin_url,
      full_name,
      headline,
      summary,
      current_position,
      years_of_experience,
      skills,
      experience,
      education,
      preferred_industries,
      preferred_locations,
      preferred_job_types,
    } = req.body;

    if (!full_name) {
      return res.status(400).json({ error: 'Missing required field: full_name' });
    }

    const profile = db.saveUserProfile({
      user_id: req.user!.userId,
      linkedin_url,
      full_name,
      headline,
      summary,
      current_position,
      years_of_experience,
      skills,
      experience,
      education,
      preferred_industries,
      preferred_locations,
      preferred_job_types,
    });

    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// LinkedIn profile import (simplified - returns mock data for now)
app.post('/api/profile/linkedin-import', authenticateUser, async (req, res) => {
  try {
    const { linkedin_url } = req.body;

    if (!linkedin_url) {
      return res.status(400).json({ error: 'linkedin_url is required' });
    }

    // TODO: Implement actual LinkedIn scraping
    // For now, return mock data to demonstrate the flow
    console.log('📎 LinkedIn import requested:', linkedin_url);

    // Mock response - in production, this would scrape/parse LinkedIn
    const mockProfile = {
      full_name: '',
      headline: '',
      summary: '',
      current_position: '',
      years_of_experience: 0,
      message: 'LinkedIn import is not yet implemented. Please enter details manually.',
    };

    res.json(mockProfile);
  } catch (error: any) {
    console.error('LinkedIn import error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/profile', authenticateUser, (req, res) => {
  try {
    const profile = db.getUserProfile(req.user!.userId);
    res.json({ profile });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/profile/:id', authenticateUser, (req, res) => {
  try {
    const updates = req.body;

    const profile = db.updateUserProfile(req.user!.userId, updates);
    res.json({ profile, message: 'Profile updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Tool API routes (existing functionality)
app.post('/api/tools/search_ai_jobs', authenticateUser, async (req, res) => {
  try {
    const { companies } = req.body;
    const result = await searchNewJobs(db, companies);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tools/get_jobs', authenticateUser, (req, res) => {
  try {
    const filters = { ...req.body, user_id: req.user!.userId };
    const result = getJobs(db, filters);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tools/get_job_details', (req, res) => {
  try {
    const { job_id } = req.body;
    const result = getJobDetails(db, job_id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tools/analyze_job_fit', (req, res) => {
  try {
    const { job_id, cv_path, cv_id, preferred_industries } = req.body;

    // Parse preferred_industries if it's a JSON string
    let industries: string[] | undefined;
    if (preferred_industries) {
      industries = typeof preferred_industries === 'string'
        ? JSON.parse(preferred_industries)
        : preferred_industries;
    }

    const result = analyzeJobFit(db, job_id, cv_path, cv_id, industries);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tools/batch_analyze_jobs', (req, res) => {
  try {
    const { job_ids, cv_path, cv_id, preferred_industries } = req.body;

    // Parse preferred_industries if it's a JSON string
    let industries: string[] | undefined;
    if (preferred_industries) {
      industries = typeof preferred_industries === 'string'
        ? JSON.parse(preferred_industries)
        : preferred_industries;
    }

    const result = batchAnalyzeJobs(db, job_ids, cv_path, cv_id, industries);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze all jobs against uploaded CV
app.post('/api/jobs/analyze-all', authenticateUser, (req, res) => {
  try {
    const { cv_path, cv_id } = req.body;

    // Get user profile to fetch preferred industries
    let industries: string[] | undefined;
    try {
      const profile = db.getUserProfile(req.user!.userId);
      if (profile && profile.preferred_industries) {
        industries = typeof profile.preferred_industries === 'string'
          ? JSON.parse(profile.preferred_industries)
          : profile.preferred_industries;
      }
    } catch (error) {
      console.warn('Could not fetch user profile preferences:', error);
    }

    // Get all jobs for this user
    const jobs = getJobs(db, { user_id: req.user!.userId });
    // Use job_id (string) not id (number) - analyzeJobFit expects job_id
    const jobIds = jobs.map((job: any) => job.job_id);

    // Batch analyze all jobs with user preferences
    const result = batchAnalyzeJobs(db, jobIds, cv_path, cv_id, industries);

    res.json({
      success: true,
      analyzed_count: result.length,
      failed_count: jobIds.length - result.length,
      results: result
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tools/mark_job_applied', (req, res) => {
  try {
    const { job_id, notes } = req.body;
    const result = markApplied(db, job_id, notes);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tools/mark_job_reviewed', (req, res) => {
  try {
    const { job_id, priority, notes } = req.body;
    const result = markReviewed(db, job_id, priority, notes);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tools/archive_job', (req, res) => {
  try {
    const { job_id, reason } = req.body;
    const result = archiveJob(db, job_id, reason);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tools/get_application_stats', (_req, res) => {
  try {
    const result = getApplicationStats(db);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tools/get_jobs_needing_attention', (_req, res) => {
  try {
    const result = getJobsNeedingAttention(db);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Job Research HTTP API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 API base URL: http://localhost:${PORT}/api`);
  console.log(`📁 Uploads directory: ${UPLOADS_DIR}`);
  console.log(`\n✨ Ready to serve the UI!\n`);
});
