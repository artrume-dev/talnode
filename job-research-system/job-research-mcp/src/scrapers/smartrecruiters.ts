import { BaseScraper, ScrapedJob } from './base.js';

/**
 * Scraper for companies using SmartRecruiters ATS
 * Used by: Adobe, LinkedIn, Visa, Bosch
 * 
 * SmartRecruiters URL pattern: https://careers.smartrecruiters.com/[company]
 * Example: https://careers.smartrecruiters.com/Adobe
 */
export class SmartRecruitersScraper extends BaseScraper {
  private smartRecruitersId: string;

  constructor(company: string, careersUrl: string, smartRecruitersId: string) {
    super(company, careersUrl);
    this.smartRecruitersId = smartRecruitersId;
  }

  async scrape(): Promise<ScrapedJob[]> {
    try {
      // SmartRecruiters public API endpoint
      const apiUrl = `https://api.smartrecruiters.com/v1/companies/${this.smartRecruitersId}/postings`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch jobs from ${this.company}: ${response.statusText}`);
        return [];
      }

      const data = await response.json() as any;
      const jobs = data.content || [];

      const scrapedJobs: ScrapedJob[] = [];

      for (const job of jobs) {
        const title = job.name || job.title || '';
        
        // Scrape all jobs - let user preferences and CV alignment do the filtering
        if (!title) {
          continue;
        }

        const jobUrl = `https://careers.smartrecruiters.com/${this.smartRecruitersId}/${job.id}`;
        
        // Extract location
        const location = this.extractLocation(job);
        
        // Use available description or title
        const description = job.description || title;

        scrapedJobs.push({
          job_id: this.generateJobId(this.company, title),
          company: this.company,
          title: title,
          url: jobUrl,
          description: this.stripHtml(description),
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

  private extractLocation(job: any): string {
    if (job.location) {
      const parts = [
        job.location.city,
        job.location.region,
        job.location.country
      ].filter(Boolean);
      
      return parts.join(', ') || 'Not specified';
    }
    return 'Not specified';
  }

  private extractRequirements(text: string): string {
    const requirementsMatch = text.match(/(?:requirements|qualifications|what we're looking for)[\s\S]{0,1000}/i);
    return requirementsMatch ? requirementsMatch[0].substring(0, 500) : '';
  }

  protected stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

// Export configured SmartRecruiters companies
export const smartRecruitersCompanies = {
  adobe: new SmartRecruitersScraper('Adobe', 'https://careers.adobe.com', 'Adobe'),
  linkedin: new SmartRecruitersScraper('LinkedIn', 'https://careers.linkedin.com', 'LinkedIn'),
  visa: new SmartRecruitersScraper('Visa', 'https://careers.visa.com', 'Visa'),
};
