import { BaseScraper, ScrapedJob } from './base.js';

/**
 * Scraper for companies using Lever ATS
 * Used by: OpenAI, Hugging Face, and others
 */
export class LeverScraper extends BaseScraper {
  private leverSite: string;

  constructor(company: string, careersUrl: string, leverSite: string) {
    super(company, careersUrl);
    this.leverSite = leverSite;
  }

  async scrape(): Promise<ScrapedJob[]> {
    try {
      // Lever API endpoint
      const apiUrl = `https://api.lever.co/v0/postings/${this.leverSite}?mode=json`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(`Failed to fetch jobs from ${this.company}: ${response.statusText}`);
        return [];
      }

      const jobs = await response.json() as any[];

      const scrapedJobs: ScrapedJob[] = [];

      for (const job of jobs) {
        // Scrape all jobs - let user preferences and CV alignment do the filtering
        const description = this.combineJobText(job);
        
        scrapedJobs.push({
          job_id: this.generateJobId(this.company, job.text),
          company: this.company,
          title: job.text,
          url: job.hostedUrl,
          description: description,
          requirements: this.extractSection(job, 'requirements'),
          tech_stack: this.extractTechStack(description),
          location: this.extractLocation(job),
          remote: this.isRemote(description) || this.isRemote(this.extractLocation(job)),
        });
      }

      return scrapedJobs;
    } catch (error) {
      console.error(`Error scraping ${this.company}:`, error);
      return [];
    }
  }

  private combineJobText(job: any): string {
    const parts = [];
    
    if (job.description) parts.push(this.stripHtml(job.description));
    if (job.descriptionPlain) parts.push(job.descriptionPlain);
    
    const lists = job.lists || [];
    lists.forEach((list: any) => {
      if (list.text) parts.push(list.text);
      if (list.content) parts.push(this.stripHtml(list.content));
    });

    return parts.join(' ').trim();
  }

  private extractSection(job: any, sectionName: string): string {
    const lists = job.lists || [];
    const section = lists.find((list: any) => 
      list.text?.toLowerCase().includes(sectionName)
    );
    
    if (section?.content) {
      return this.stripHtml(section.content).slice(0, 500);
    }
    
    return '';
  }

  private extractLocation(job: any): string {
    if (job.categories?.location) {
      return job.categories.location;
    }
    
    const locations = job.categories?.allLocations || [];
    return locations.join(', ') || 'Not specified';
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

// Company-specific configurations
export const leverCompanies = {
  openai: new LeverScraper(
    'OpenAI',
    'https://openai.com/careers',
    'openai'
  ),
  huggingface: new LeverScraper(
    'Hugging Face',
    'https://huggingface.co/jobs',
    'huggingface'
  ),
};
