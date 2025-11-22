import { JobDatabase, Job } from '../db/schema.js';
import { scrapeAllCompanies, scrapeCompanies } from '../scrapers/index.js';

export interface SearchFilters {
  companies?: string[];
  status?: Job['status'];
  priority?: Job['priority'];
  minAlignment?: number;
}

/**
 * Search for new jobs from watched companies
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

  for (const job of scrapedJobs) {
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

      const added = db.getJobById(job.job_id);
      if (added) {
        newJobs.push(added);
      }
    }
  }

  return newJobs;
}

/**
 * Get jobs from database with filters
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
    status: filters?.status,
    priority: filters?.priority,
    minAlignment: filters?.minAlignment,
  });

  // Filter by company names if provided
  if (companyNames && companyNames.length > 0) {
    jobs = jobs.filter(job => companyNames!.includes(job.company));
  }

  return jobs;
}

/**
 * Get details for a specific job
 */
export function getJobDetails(db: JobDatabase, jobId: string): Job | null {
  return db.getJobById(jobId) || null;
}
