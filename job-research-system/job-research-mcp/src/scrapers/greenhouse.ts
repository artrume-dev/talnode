import { BaseScraper, ScrapedJob } from './base.js';

/**
 * Scraper for companies using Greenhouse ATS
 * Used by: Anthropic, Vercel, Cursor, and many others
 */
export class GreenhouseScraper extends BaseScraper {
  private greenhouseId: string;

  constructor(company: string, careersUrl: string, greenhouseId: string) {
    super(company, careersUrl);
    this.greenhouseId = greenhouseId;
  }

  async scrape(): Promise<ScrapedJob[]> {
    try {
      // Greenhouse API endpoint
      const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${this.greenhouseId}/jobs?content=true`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(`Failed to fetch jobs from ${this.company}: ${response.statusText}`);
        return [];
      }

      const data = await response.json() as any;
      const jobs = data.jobs || [];

      const scrapedJobs: ScrapedJob[] = [];

      for (const job of jobs) {
        // Scrape all jobs - let user preferences and CV alignment do the filtering
        const description = this.stripHtml(job.content || '');
        
        scrapedJobs.push({
          job_id: this.generateJobId(this.company, job.title),
          company: this.company,
          title: job.title,
          url: job.absolute_url,
          description: description,
          requirements: this.extractRequirements(description),
          tech_stack: this.extractTechStack(description),
          location: job.location?.name || 'Not specified',
          remote: this.isRemote(job.location?.name || '') || this.isRemote(description),
        });
      }

      return scrapedJobs;
    } catch (error) {
      console.error(`Error scraping ${this.company}:`, error);
      return [];
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractRequirements(text: string): string {
    // Try to extract requirements section
    const requirementsMatch = text.match(/requirements?:?(.*?)(?:responsibilities|qualifications|about|$)/is);
    if (requirementsMatch) {
      return requirementsMatch[1].trim().slice(0, 500);
    }
    
    // Fallback: return first 500 chars
    return text.slice(0, 500);
  }
}

// Company-specific configurations
export const greenhouseCompanies = {
  anthropic: new GreenhouseScraper(
    'Anthropic',
    'https://www.anthropic.com/careers',
    'anthropic'
  ),
  vercel: new GreenhouseScraper(
    'Vercel',
    'https://vercel.com/careers',
    'vercel'
  ),
  cursor: new GreenhouseScraper(
    'Cursor',
    'https://www.cursor.com/careers',
    'cursor'
  ),
  perplexity: new GreenhouseScraper(
    'Perplexity',
    'https://www.perplexity.ai/hub/careers',
    'perplexityai'
  ),
  replit: new GreenhouseScraper(
    'Replit',
    'https://replit.com/careers',
    'replit'
  ),
};
