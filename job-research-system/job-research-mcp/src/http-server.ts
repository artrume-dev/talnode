#!/usr/bin/env node

/**
 * HTTP API Server for Job Research MCP
 *
 * This server provides a REST API interface to the MCP server,
 * allowing the browser UI to communicate with the job research tools.
 */

import http from 'http';
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

const PORT = 3001;
const db = new JobDatabase();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJSON(res: http.ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, corsHeaders);
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const path = url.pathname;

  try {
    // Health check
    if (path === '/health' && req.method === 'GET') {
      sendJSON(res, 200, { status: 'ok', service: 'job-research-api' });
      return;
    }

    // Company Management API
    if (path === '/api/companies' && req.method === 'GET') {
      const companies = db.getAllCompanies();
      sendJSON(res, 200, { companies });
      return;
    }

    if (path === '/api/companies' && req.method === 'POST') {
      const body = await parseBody(req);
      const { company_name, careers_url, ats_type, greenhouse_id, lever_id } = body;

      if (!company_name || !careers_url || !ats_type) {
        sendJSON(res, 400, { error: 'Missing required fields: company_name, careers_url, ats_type' });
        return;
      }

      try {
        const newCompany = db.addCustomCompany({
          company_name,
          careers_url,
          ats_type,
          greenhouse_id,
          lever_id,
        });
        sendJSON(res, 201, { company: newCompany, message: 'Company added successfully' });
      } catch (error: any) {
        if (error.message?.includes('UNIQUE constraint failed')) {
          sendJSON(res, 409, { error: 'Company already exists' });
        } else {
          throw error;
        }
      }
      return;
    }

    if (path.match(/^\/api\/companies\/\d+$/) && req.method === 'PUT') {
      const companyId = parseInt(path.split('/').pop() || '0');
      const body = await parseBody(req);
      const { is_active, company_name, careers_url, ats_type } = body;

      try {
        const updated = db.updateCustomCompany(companyId, {
          is_active,
          company_name,
          careers_url,
          ats_type,
        });
        sendJSON(res, 200, { company: updated, message: 'Company updated successfully' });
      } catch (error: any) {
        if (error.message === 'No fields to update') {
          sendJSON(res, 400, { error: error.message });
        } else {
          throw error;
        }
      }
      return;
    }

    if (path.match(/^\/api\/companies\/\d+$/) && req.method === 'DELETE') {
      const companyId = parseInt(path.split('/').pop() || '0');
      db.deleteCustomCompany(companyId);
      sendJSON(res, 200, { message: 'Company deleted successfully' });
      return;
    }

    // API routes
    if (path.startsWith('/api/tools/')) {
      const toolName = path.replace('/api/tools/', '');
      const args = await parseBody(req);

      let result: any;

      switch (toolName) {
        case 'search_ai_jobs':
          result = await searchNewJobs(db, args.companies);
          break;

        case 'get_jobs':
          result = getJobs(db, args);
          break;

        case 'get_job_details':
          result = getJobDetails(db, args.job_id);
          break;

        case 'analyze_job_fit':
          result = analyzeJobFit(db, args.job_id, args.cv_path);
          break;

        case 'batch_analyze_jobs':
          result = batchAnalyzeJobs(db, args.job_ids, args.cv_path);
          break;

        case 'mark_job_applied':
          result = markApplied(db, args.job_id, args.notes);
          break;

        case 'mark_job_reviewed':
          result = markReviewed(db, args.job_id, args.priority, args.notes);
          break;

        case 'archive_job':
          result = archiveJob(db, args.job_id, args.reason);
          break;

        case 'get_application_stats':
          result = getApplicationStats(db);
          break;

        case 'get_jobs_needing_attention':
          result = getJobsNeedingAttention(db);
          break;

        case 'invoke_agent':
          // This will be handled by the frontend calling Claude Code directly
          // or we can implement a proxy to Claude API here
          result = {
            message: 'Agent invocation should be handled by Claude Code or frontend',
            agent_type: args.agent_type,
            prompt: args.prompt,
          };
          break;

        default:
          sendJSON(res, 404, { error: `Unknown tool: ${toolName}` });
          return;
      }

      sendJSON(res, 200, result);
      return;
    }

    // 404 for unknown routes
    sendJSON(res, 404, { error: 'Not found' });
  } catch (error) {
    console.error('Server error:', error);
    sendJSON(res, 500, {
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Job Research HTTP API Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 API base URL: http://localhost:${PORT}/api/tools/`);
  console.log(`\n✨ Ready to serve the UI!\n`);
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
