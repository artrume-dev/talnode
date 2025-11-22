import { BaseScraper, ScrapedJob } from './base.js';

/**
 * Scraper for companies using Ashby ATS
 * Used by: Linear, Lattice, Ramp, Merge, Clay, Retool, Fal.ai, Notion
 * 
 * Ashby URL pattern: https://jobs.ashbyhq.com/[company]
 * Example: https://jobs.ashbyhq.com/linear
 */
export class AshbyScraper extends BaseScraper {
  private ashbyId: string;

  constructor(company: string, careersUrl: string, ashbyId: string) {
    super(company, careersUrl);
    this.ashbyId = ashbyId;
  }

  async scrape(): Promise<ScrapedJob[]> {
    try {
      // Ashby API endpoint
      const apiUrl = `https://jobs.ashbyhq.com/${this.ashbyId}`;
      
      const html = await this.fetchHtml(apiUrl);
      const $ = this.loadCheerio(html);

      const scrapedJobs: ScrapedJob[] = [];

      // Ashby uses a specific structure for job listings
      $('[data-job-id]').each((_index, element) => {
        const $job = $(element);
        
        const title = $job.find('[data-testid="job-title"]').text().trim() ||
                     $job.find('.job-title').text().trim() ||
                     $job.find('h3').first().text().trim();
        
        if (!title) {
          return;
        }
        // Scrape all jobs - let user preferences and CV alignment do the filtering

        const jobId = $job.attr('data-job-id') || '';
        const jobUrl = `https://jobs.ashbyhq.com/${this.ashbyId}/${jobId}`;
        
        const location = $job.find('[data-testid="job-location"]').text().trim() ||
                        $job.find('.job-location').text().trim() ||
                        'Not specified';

        const description = $job.find('.job-description').text().trim() || title;

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
      });

      // If no jobs found with data attributes, try alternative structure
      if (scrapedJobs.length === 0) {
        $('a[href*="/"]').each((_index, element) => {
          const $link = $(element);
          const title = $link.text().trim();
          
          if (!title) {
            return;
          }
          // Scrape all jobs - let user preferences and CV alignment do the filtering

          const href = $link.attr('href') || '';
          const jobUrl = href.startsWith('http') ? href : `https://jobs.ashbyhq.com${href}`;

          scrapedJobs.push({
            job_id: this.generateJobId(this.company, title),
            company: this.company,
            title: title,
            url: jobUrl,
            description: title,
            requirements: '',
            tech_stack: this.extractTechStack(title),
            location: 'Not specified',
            remote: this.isRemote(title),
          });
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
}

// Export configured Ashby companies
export const ashbyCompanies = {
  linear: new AshbyScraper('Linear', 'https://linear.app/careers', 'linear'),
  lattice: new AshbyScraper('Lattice', 'https://lattice.com/careers', 'lattice'),
  ramp: new AshbyScraper('Ramp', 'https://ramp.com/careers', 'ramp'),
  merge: new AshbyScraper('Merge', 'https://merge.dev/careers', 'merge'),
  clay: new AshbyScraper('Clay', 'https://clay.com/careers', 'clay'),
  retool: new AshbyScraper('Retool', 'https://retool.com/careers', 'retool'),
  fal: new AshbyScraper('Fal.ai', 'https://fal.ai/careers', 'fal'),
  notion: new AshbyScraper('Notion', 'https://notion.so/careers', 'notion'),
};
