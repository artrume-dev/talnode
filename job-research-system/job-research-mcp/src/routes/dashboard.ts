/**
 * Dashboard API Routes
 *
 * Provides endpoints for dashboard statistics, CV optimizations,
 * and job applications tracking.
 */

import { Router, Request, Response } from 'express';
import { JobDatabase } from '../db/schema.js';
import { authenticateUser } from '../auth/middleware.js';

export function createDashboardRoutes(db: JobDatabase): Router {
  const router = Router();

  // All dashboard routes require authentication
  router.use(authenticateUser);

  // ============================================================================
  // DASHBOARD STATISTICS
  // ============================================================================

  /**
   * GET /api/dashboard/stats
   * Get dashboard statistics for the authenticated user
   */
  router.get('/stats', (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;

      const stats = db.getDashboardStats(userId);
      const applicationCounts = db.getJobApplicationsCount(userId);

      res.json({
        ...stats,
        applicationCounts: {
          total: applicationCounts.total || 0,
          applied: applicationCounts.applied || 0,
          inReview: applicationCounts.in_review || 0,
          interview: applicationCounts.interview || 0,
          accepted: applicationCounts.accepted || 0,
          rejected: applicationCounts.rejected || 0
        }
      });
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        error: 'Failed to fetch dashboard statistics',
        message: error.message
      });
    }
  });

  // ============================================================================
  // CV OPTIMIZATIONS
  // ============================================================================

  /**
   * GET /api/dashboard/cv-optimizations
   * Get list of CV optimizations with pagination
   */
  router.get('/cv-optimizations', (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const optimizations = db.getRecentCVOptimizations(userId, limit);

      res.json({
        total: optimizations.length,
        page,
        limit,
        data: optimizations.map(opt => ({
          id: opt.id,
          baseCVId: opt.base_cv_id,
          baseCVName: opt.base_cv_name,
          jobId: opt.job_id,
          jobTitle: opt.job_title,
          company: opt.company,
          variantType: opt.variant_type,
          matchScore: opt.match_score,
          optimizedDate: opt.optimized_date,
          changesSummary: opt.changes_summary ? JSON.parse(opt.changes_summary) : [],
          strongMatches: opt.strong_matches ? JSON.parse(opt.strong_matches) : [],
          gaps: opt.gaps ? JSON.parse(opt.gaps) : []
        }))
      });
    } catch (error: any) {
      console.error('Error fetching CV optimizations:', error);
      res.status(500).json({
        error: 'Failed to fetch CV optimizations',
        message: error.message
      });
    }
  });

  // ============================================================================
  // JOB APPLICATIONS
  // ============================================================================

  /**
   * GET /api/dashboard/applications
   * Get list of job applications with optional filtering
   */
  router.get('/applications', (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const status = req.query.status as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const applications = db.getJobApplications(userId, {
        status,
        page,
        limit
      });

      res.json({
        total: applications.length,
        page,
        limit,
        data: applications.map(app => ({
          id: app.id,
          job: {
            id: app.job_id,
            title: app.job_title,
            company: app.company,
            url: app.job_url
          },
          appliedDate: app.applied_date,
          matchScore: app.match_score,
          status: app.application_status,
          cvVariant: app.cv_variant_id ? {
            id: app.cv_variant_id
          } : null,
          applicationSource: app.application_source,
          notes: app.application_notes,
          followUpDate: app.follow_up_date,
          interviewDate: app.interview_date,
          interviewNotes: app.interview_notes,
          decision: app.decision,
          decisionDate: app.decision_date,
          offerAmount: app.offer_amount,
          offerCurrency: app.offer_currency
        }))
      });
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      res.status(500).json({
        error: 'Failed to fetch applications',
        message: error.message
      });
    }
  });

  /**
   * GET /api/dashboard/recent-activity
   * Get recent activity for dashboard overview
   */
  router.get('/recent-activity', (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 5;

      const recentOptimizations = db.getRecentCVOptimizations(userId, limit);
      const recentApplications = db.getRecentJobApplications(userId, limit);

      res.json({
        recentOptimizations: recentOptimizations.map(opt => ({
          type: 'cv_optimized',
          jobTitle: opt.job_title,
          company: opt.company,
          matchScore: opt.match_score,
          date: opt.optimized_date
        })),
        recentApplications: recentApplications.map(app => ({
          type: 'job_applied',
          jobTitle: app.job_title,
          company: app.company,
          matchScore: app.match_score,
          date: app.applied_date,
          status: app.application_status
        }))
      });
    } catch (error: any) {
      console.error('Error fetching recent activity:', error);
      res.status(500).json({
        error: 'Failed to fetch recent activity',
        message: error.message
      });
    }
  });

  return router;
}
