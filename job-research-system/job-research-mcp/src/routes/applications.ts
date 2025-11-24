/**
 * Job Applications API Routes
 *
 * Provides CRUD endpoints for managing job applications
 */

import { Router, Request, Response } from 'express';
import { JobDatabase } from '../db/schema.js';
import { authenticateUser } from '../auth/middleware.js';

export function createApplicationsRoutes(db: JobDatabase): Router {
  const router = Router();

  // All application routes require authentication
  router.use(authenticateUser);

  // ============================================================================
  // MARK JOB AS APPLIED
  // ============================================================================

  /**
   * POST /api/jobs/:jobId/mark-applied
   * Mark a job as applied with application details
   */
  router.post('/jobs/:jobId/mark-applied', (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const jobId = parseInt(req.params.jobId);

      const {
        appliedDate,
        cvVariantId,
        applicationSource,
        notes
      } = req.body;

      // Validate required fields
      if (!appliedDate) {
        return res.status(400).json({
          error: 'Application date is required'
        });
      }

      // Check if already applied
      if (db.hasAppliedToJob(userId, jobId)) {
        return res.status(400).json({
          error: 'You have already applied to this job'
        });
      }

      // Create application
      const application = db.createJobApplication({
        user_id: userId,
        job_id: jobId,
        cv_variant_id: cvVariantId,
        applied_date: appliedDate,
        application_source: applicationSource,
        application_notes: notes
      });

      res.status(201).json({
        success: true,
        application: {
          id: application.id,
          jobId: application.job_id,
          appliedDate: application.applied_date,
          status: application.application_status
        }
      });
    } catch (error: any) {
      console.error('Error marking job as applied:', error);
      res.status(500).json({
        error: 'Failed to mark job as applied',
        message: error.message
      });
    }
  });

  // ============================================================================
  // APPLICATION CRUD
  // ============================================================================

  /**
   * GET /api/applications
   * Get all applications for the authenticated user
   */
  router.get('/applications', (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const status = req.query.status as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const applications = db.getJobApplications(userId, {
        status,
        page,
        limit
      });

      res.json({
        total: applications.length,
        page,
        limit,
        applications
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
   * GET /api/applications/:id
   * Get a single application by ID
   */
  router.get('/applications/:id', (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const applicationId = parseInt(req.params.id);

      const application = db.getJobApplication(applicationId, userId);

      if (!application) {
        return res.status(404).json({
          error: 'Application not found'
        });
      }

      res.json({ application });
    } catch (error: any) {
      console.error('Error fetching application:', error);
      res.status(500).json({
        error: 'Failed to fetch application',
        message: error.message
      });
    }
  });

  /**
   * PUT /api/applications/:id
   * Update an application
   */
  router.put('/applications/:id', (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const applicationId = parseInt(req.params.id);

      const {
        status,
        applicationSource,
        notes,
        followUpDate,
        interviewDate,
        interviewNotes,
        offerAmount,
        offerCurrency,
        decision,
        decisionDate,
        rejectionReason
      } = req.body;

      // Check if application exists
      const existing = db.getJobApplication(applicationId, userId);
      if (!existing) {
        return res.status(404).json({
          error: 'Application not found'
        });
      }

      // Update application
      const updates: any = {};
      if (status !== undefined) updates.application_status = status;
      if (applicationSource !== undefined) updates.application_source = applicationSource;
      if (notes !== undefined) updates.application_notes = notes;
      if (followUpDate !== undefined) updates.follow_up_date = followUpDate;
      if (interviewDate !== undefined) updates.interview_date = interviewDate;
      if (interviewNotes !== undefined) updates.interview_notes = interviewNotes;
      if (offerAmount !== undefined) updates.offer_amount = offerAmount;
      if (offerCurrency !== undefined) updates.offer_currency = offerCurrency;
      if (decision !== undefined) updates.decision = decision;
      if (decisionDate !== undefined) updates.decision_date = decisionDate;
      if (rejectionReason !== undefined) updates.rejection_reason = rejectionReason;

      const application = db.updateJobApplication(applicationId, userId, updates);

      res.json({
        success: true,
        application
      });
    } catch (error: any) {
      console.error('Error updating application:', error);
      res.status(500).json({
        error: 'Failed to update application',
        message: error.message
      });
    }
  });

  /**
   * DELETE /api/applications/:id
   * Delete an application
   */
  router.delete('/applications/:id', (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const applicationId = parseInt(req.params.id);

      // Check if application exists
      const existing = db.getJobApplication(applicationId, userId);
      if (!existing) {
        return res.status(404).json({
          error: 'Application not found'
        });
      }

      db.deleteJobApplication(applicationId, userId);

      res.json({
        success: true,
        message: 'Application deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting application:', error);
      res.status(500).json({
        error: 'Failed to delete application',
        message: error.message
      });
    }
  });

  return router;
}
