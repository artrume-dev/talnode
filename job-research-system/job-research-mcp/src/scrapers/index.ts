import { ScrapedJob } from './base.js';
import { GreenhouseScraper } from './greenhouse.js';
import { LeverScraper } from './lever.js';
import { WorkdayScraper } from './workday.js';
import { AshbyScraper } from './ashby.js';
import { SmartRecruitersScraper } from './smartrecruiters.js';
import { JobDatabase } from '../db/schema.js';

export * from './base.js';
export * from './greenhouse.js';
export * from './lever.js';
export * from './workday.js';
export * from './ashby.js';
export * from './smartrecruiters.js';

/**
 * Create scraper instance based on company data from database
 */
function createScraper(company: any): any {
  const { company_name, careers_url, ats_type, greenhouse_id, lever_id, workday_id, ashby_id, smartrecruiters_id } = company;
  
  switch (ats_type) {
    case 'greenhouse':
      if (greenhouse_id) {
        return new GreenhouseScraper(company_name, careers_url, greenhouse_id);
      }
      break;
    case 'lever':
      if (lever_id) {
        return new LeverScraper(company_name, careers_url, lever_id);
      }
      break;
    case 'workday':
      if (workday_id) {
        return new WorkdayScraper(company_name, careers_url, workday_id);
      }
      break;
    case 'ashby':
      if (ashby_id) {
        return new AshbyScraper(company_name, careers_url, ashby_id);
      }
      break;
    case 'smartrecruiters':
      if (smartrecruiters_id) {
        return new SmartRecruitersScraper(company_name, careers_url, smartrecruiters_id);
      }
      break;
  }
  
  return null;
}

/**
 * Run all scrapers from database and return aggregated results
 */
export async function scrapeAllCompanies(db?: JobDatabase): Promise<ScrapedJob[]> {
  if (!db) {
    console.warn('No database provided to scrapeAllCompanies');
    return [];
  }
  
  const results: ScrapedJob[] = [];
  const companies = db.getAllCompanies();
  
  for (const company of companies) {
    if (!company.is_active || company.ats_type === 'custom') {
      continue;
    }
    
    const scraper = createScraper(company);
    if (!scraper) {
      console.warn(`No scraper configured for ${company.company_name}`);
      continue;
    }
    
    try {
      console.log(`Scraping ${company.company_name}...`);
      const jobs = await scraper.scrape();
      results.push(...jobs);
      console.log(`Found ${jobs.length} relevant jobs from ${company.company_name}`);
    } catch (error) {
      console.error(`Error scraping ${company.company_name}:`, error);
    }
  }
  
  return results;
}

/**
 * Scrape specific companies by name
 */
export async function scrapeCompanies(companyNames: string[], db?: JobDatabase): Promise<ScrapedJob[]> {
  if (!db) {
    console.warn('No database provided to scrapeCompanies');
    return [];
  }
  
  const results: ScrapedJob[] = [];
  const allCompanies = db.getAllCompanies();
  
  for (const name of companyNames) {
    // Find company in database (case-insensitive)
    const company = allCompanies.find((c: any) => 
      c.company_name.toLowerCase() === name.toLowerCase()
    );
    
    if (!company) {
      console.warn(`Company not found in database: ${name}`);
      continue;
    }
    
    if (!company.is_active || company.ats_type === 'custom') {
      console.warn(`Company ${name} has no scraper configured (type: ${company.ats_type})`);
      continue;
    }
    
    const scraper = createScraper(company);
    if (!scraper) {
      console.warn(`No scraper configured for ${name}`);
      continue;
    }
    
    try {
      console.log(`Scraping ${name}...`);
      const jobs = await scraper.scrape();
      results.push(...jobs);
      console.log(`Found ${jobs.length} relevant jobs from ${name}`);
    } catch (error) {
      console.error(`Error scraping ${name}:`, error);
    }
  }
  
  return results;
}

