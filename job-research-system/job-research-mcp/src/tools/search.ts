import { JobDatabase, Job } from '../db/schema.js';
import { scrapeAllCompanies, scrapeCompanies } from '../scrapers/index.js';

export interface SearchFilters {
  user_id?: number;
  companies?: string[];
  status?: Job['status'];
  priority?: Job['priority'];
  minAlignment?: number;
  includeExpired?: boolean;
}

/**
 * Search for new jobs from watched companies
 * Also tracks job expiry by marking seen jobs and incrementing expiry counter for missing jobs
 */
export async function searchNewJobs(
  db: JobDatabase,
  companies?: string[]
): Promise<Job[]> {
  // Scrape jobs based on company filter
  const scrapedJobs = companies && companies.length > 0
    ? await scrapeCompanies(companies, db)
    : await scrapeAllCompanies(db);

  const newJobs: Job[] = [];
  const seenJobIds = new Set<string>();

  // Process scraped jobs
  for (const job of scrapedJobs) {
    seenJobIds.add(job.job_id);

    // Check if job already exists
    const existing = db.getJobById(job.job_id);

    if (!existing) {
      // Add new job to database
      const id = db.addJob({
        job_id: job.job_id,
        company: job.company,
        title: job.title,
        url: job.url,
        description: job.description,
        requirements: job.requirements,
        tech_stack: job.tech_stack,
        location: job.location,
        remote: job.remote,
        alignment_score: null,
        strong_matches: null,
        gaps: null,
        status: 'new',
        priority: 'medium',
        notes: null,
      });

      // Mark new job as seen
      db.markJobAsSeen(job.job_id);

      const added = db.getJobById(job.job_id);
      if (added) {
        newJobs.push(added);
      }
    } else {
      // Job still exists, mark it as seen (resets expiry check count)
      db.markJobAsSeen(job.job_id);
    }
  }

  // Track jobs that were NOT found in this scrape
  const allExistingJobs = db.getAllJobsForExpiryCheck();
  for (const existingJob of allExistingJobs) {
    if (!seenJobIds.has(existingJob.job_id)) {
      // Job was not found in scrape, increment its expiry check count
      db.incrementExpiryCheckCount(existingJob.job_id);
    }
  }

  // Detect and mark expired jobs (missed 3+ times)
  const expiredJobIds = db.detectExpiredJobs(3);
  if (expiredJobIds.length > 0) {
    console.log(`Marked ${expiredJobIds.length} jobs as expired`);
  }

  return newJobs;
}

/**
 * Get jobs from database with filters
 * By default, filters out expired jobs unless includeExpired is true
 */
export function getJobs(db: JobDatabase, filters?: SearchFilters): Job[] {
  // If company_ids are provided, convert them to company names
  let companyNames: string[] | undefined;
  if (filters && 'company_ids' in filters && Array.isArray((filters as any).company_ids)) {
    const companyIds = (filters as any).company_ids;
    const allCompanies = db.getAllCompanies();
    companyNames = allCompanies
      .filter((c: any) => companyIds.includes(c.id))
      .map((c: any) => c.company_name);
  } else if (filters?.companies) {
    companyNames = filters.companies;
  }

  // Get all jobs first
  let jobs = db.getJobs({
    user_id: filters?.user_id,
    status: filters?.status,
    priority: filters?.priority,
    minAlignment: filters?.minAlignment,
  });

  // Filter by company names if provided
  if (companyNames && companyNames.length > 0) {
    jobs = jobs.filter(job => companyNames!.includes(job.company));
  }

  // Filter out expired jobs by default
  if (!filters?.includeExpired) {
    jobs = jobs.filter(job => !job.is_expired);
  }

  return jobs;
}

/**
 * Get details for a specific job
 */
export function getJobDetails(db: JobDatabase, jobId: string): Job | null {
  return db.getJobById(jobId) || null;
}
