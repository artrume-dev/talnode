import { BaseScraper, ScrapedJob } from './base.js';

/**
 * Scraper for companies using Workday ATS
 * Used by: Apple, Amazon, Meta, Google, Netflix, Stripe, Airbnb, Uber, Salesforce
 * 
 * Workday URL pattern: https://[company].wd5.myworkdayjobs.com/[site_id]
 * Example: https://amazon.wd5.myworkdayjobs.com/Amazon_University_Jobs
 */
export class WorkdayScraper extends BaseScraper {
  private workdayId: string;
  private siteId: string;

  constructor(company: string, careersUrl: string, workdayId: string, siteId: string = 'External_Career') {
    super(company, careersUrl);
    this.workdayId = workdayId; // e.g., "apple"
    this.siteId = siteId;        // e.g., "External_Career" or company-specific
  }

  async scrape(): Promise<ScrapedJob[]> {
    try {
      // Workday GraphQL API endpoint
      const apiUrl = `https://${this.workdayId}.wd5.myworkdayjobs.com/wday/cxs/${this.workdayId}/${this.siteId}/jobs`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          appliedFacets: {},
          limit: 20,
          offset: 0,
          searchText: '',
        }),
      });

      if (!response.ok) {
        console.error(`Failed to fetch jobs from ${this.company}: ${response.statusText}`);
        return [];
      }

      const data = await response.json() as any;
      const jobs = data.jobPostings || [];

      const scrapedJobs: ScrapedJob[] = [];

      for (const job of jobs) {
        const title = job.title || '';
        
        // Scrape all jobs - let user preferences and CV alignment do the filtering
        const location = job.locationsText || 'Not specified';
        const jobUrl = `https://${this.workdayId}.wd5.myworkdayjobs.com${job.externalPath}`;
        
        // Use available job data
        const description = job.bulletFields?.join('\n') || title;

        scrapedJobs.push({
          job_id: this.generateJobId(this.company, title),
          company: this.company,
          title: title,
          url: jobUrl,
          description: description,
          requirements: this.extractRequirements(description),
          tech_stack: this.extractTechStack(description),
          location: location,
          remote: this.isRemote(location) || this.isRemote(description),
        });
      }

      return scrapedJobs;
    } catch (error) {
      console.error(`Error scraping ${this.company}:`, error);
      return [];
    }
  }

  private extractRequirements(text: string): string {
    const requirementsMatch = text.match(/(?:requirements|qualifications|what we're looking for)[\s\S]{0,1000}/i);
    return requirementsMatch ? requirementsMatch[0].substring(0, 500) : '';
  }

  protected stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

// Export configured Workday companies
export const workdayCompanies = {
  apple: new WorkdayScraper('Apple', 'https://jobs.apple.com', 'apple', 'Apple'),
  meta: new WorkdayScraper('Meta', 'https://www.metacareers.com', 'meta', 'External_Career'),
  netflix: new WorkdayScraper('Netflix', 'https://jobs.netflix.com', 'netflix', 'External_Career'),
  stripe: new WorkdayScraper('Stripe', 'https://stripe.com/jobs', 'stripe', 'External_Career'),
  airbnb: new WorkdayScraper('Airbnb', 'https://careers.airbnb.com', 'airbnb', 'External_Career'),
};
