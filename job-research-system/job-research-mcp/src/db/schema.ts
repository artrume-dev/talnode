import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Job {
  id: number;
  job_id: string;
  company: string;
  title: string;
  url: string;
  description: string;
  requirements: string;
  tech_stack: string;
  location: string;
  remote: boolean;
  alignment_score: number | null;
  strong_matches: string | null;
  gaps: string | null;
  status: 'new' | 'reviewed' | 'applied' | 'rejected' | 'interview' | 'archived';
  priority: 'high' | 'medium' | 'low';
  notes: string | null;
  found_date: string;
  last_updated: string;
}

export interface CompanyWatch {
  id: number;
  company: string;
  careers_url: string;
  last_checked: string;
  active: boolean;
}

export class JobDatabase {
  public db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || join(__dirname, '../../data/jobs.db');
    this.db = new Database(path);
    this.initialize();
  }

  private initialize() {
    // Create jobs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT UNIQUE NOT NULL,
        company TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        requirements TEXT,
        tech_stack TEXT,
        location TEXT,
        remote INTEGER DEFAULT 0,
        alignment_score REAL,
        strong_matches TEXT,
        gaps TEXT,
        status TEXT DEFAULT 'new',
        priority TEXT DEFAULT 'medium',
        notes TEXT,
        found_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create company watch list table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS company_watch (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company TEXT UNIQUE NOT NULL,
        careers_url TEXT NOT NULL,
        last_checked TEXT,
        active BOOLEAN DEFAULT 1
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
      CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority);
      CREATE INDEX IF NOT EXISTS idx_jobs_found_date ON jobs(found_date);
    `);

    // Seed initial company watch list
    this.seedCompanies();
  }

  private seedCompanies() {
    const companies = [
      { company: 'Anthropic', careers_url: 'https://www.anthropic.com/careers' },
      { company: 'OpenAI', careers_url: 'https://openai.com/careers' },
      { company: 'Vercel', careers_url: 'https://vercel.com/careers' },
      { company: 'Cursor', careers_url: 'https://www.cursor.com/careers' },
      { company: 'Perplexity', careers_url: 'https://www.perplexity.ai/hub/careers' },
      { company: 'Hugging Face', careers_url: 'https://huggingface.co/jobs' },
      { company: 'Replit', careers_url: 'https://replit.com/careers' },
      { company: 'GitHub', careers_url: 'https://github.com/careers' },
      { company: 'Microsoft', careers_url: 'https://careers.microsoft.com' },
      { company: 'Google DeepMind', careers_url: 'https://www.deepmind.com/careers' },
    ];

    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO company_watch (company, careers_url)
      VALUES (?, ?)
    `);

    companies.forEach(({ company, careers_url }) => {
      insert.run(company, careers_url);
    });
  }

  // Job CRUD operations
  addJob(job: Omit<Job, 'id' | 'found_date' | 'last_updated'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO jobs (
        job_id, company, title, url, description, requirements, 
        tech_stack, location, remote, alignment_score, status, priority, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      job.job_id,
      job.company,
      job.title,
      job.url,
      job.description,
      job.requirements,
      job.tech_stack,
      job.location,
      job.remote ? 1 : 0,
      job.alignment_score,
      job.status,
      job.priority,
      job.notes
    );

    return result.lastInsertRowid as number;
  }

  getJobs(filters?: {
    status?: string;
    company?: string;
    priority?: string;
    minAlignment?: number;
  }): Job[] {
    let query = 'SELECT * FROM jobs WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.company) {
      query += ' AND company = ?';
      params.push(filters.company);
    }
    if (filters?.priority) {
      query += ' AND priority = ?';
      params.push(filters.priority);
    }
    if (filters?.minAlignment) {
      query += ' AND alignment_score >= ?';
      params.push(filters.minAlignment);
    }

    query += ' ORDER BY found_date DESC';

    return this.db.prepare(query).all(...params) as Job[];
  }

  getJobById(jobId: string): Job | undefined {
    return this.db
      .prepare('SELECT * FROM jobs WHERE job_id = ?')
      .get(jobId) as Job | undefined;
  }

  updateJobStatus(jobId: string, status: Job['status'], notes?: string): void {
    const stmt = this.db.prepare(`
      UPDATE jobs 
      SET status = ?, notes = COALESCE(?, notes), last_updated = CURRENT_TIMESTAMP
      WHERE job_id = ?
    `);
    stmt.run(status, notes, jobId);
  }

  updateAlignmentScore(jobId: string, score: number, strongMatches?: string[], gaps?: string[]): void {
    const strongMatchesJson = strongMatches ? JSON.stringify(strongMatches) : null;
    const gapsJson = gaps ? JSON.stringify(gaps) : null;
    
    this.db
      .prepare(`UPDATE jobs 
        SET alignment_score = ?, 
            strong_matches = ?, 
            gaps = ?, 
            last_updated = CURRENT_TIMESTAMP 
        WHERE job_id = ?`)
      .run(score, strongMatchesJson, gapsJson, jobId);
  }

  // Company watch list operations
  getWatchedCompanies(activeOnly: boolean = true): CompanyWatch[] {
    const query = activeOnly
      ? 'SELECT * FROM company_watch WHERE active = 1'
      : 'SELECT * FROM company_watch';
    return this.db.prepare(query).all() as CompanyWatch[];
  }

  updateLastChecked(company: string): void {
    this.db
      .prepare('UPDATE company_watch SET last_checked = CURRENT_TIMESTAMP WHERE company = ?')
      .run(company);
  }

  addCompanyWatch(company: string, careersUrl: string): void {
    this.db
      .prepare('INSERT OR REPLACE INTO company_watch (company, careers_url) VALUES (?, ?)')
      .run(company, careersUrl);
  }

  // Custom companies operations
  getAllCompanies(): any[] {
    return this.db.prepare(`
      SELECT * FROM custom_companies
      ORDER BY added_by_user ASC, company_name ASC
    `).all();
  }

  addCustomCompany(data: {
    company_name: string;
    careers_url: string;
    ats_type: string;
    greenhouse_id?: string;
    lever_id?: string;
    workday_id?: string;
    ashby_id?: string;
    smartrecruiters_id?: string;
  }): any {
    const result = this.db.prepare(`
      INSERT INTO custom_companies (
        company_name, careers_url, ats_type, 
        greenhouse_id, lever_id, workday_id, ashby_id, smartrecruiters_id,
        is_active, added_by_user
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)
    `).run(
      data.company_name,
      data.careers_url,
      data.ats_type,
      data.greenhouse_id || null,
      data.lever_id || null,
      data.workday_id || null,
      data.ashby_id || null,
      data.smartrecruiters_id || null
    );

    return this.db.prepare('SELECT * FROM custom_companies WHERE id = ?').get(result.lastInsertRowid);
  }

  getCompanyById(id: number): any {
    return this.db.prepare('SELECT * FROM custom_companies WHERE id = ?').get(id);
  }

  updateCustomCompany(id: number, updates: {
    is_active?: boolean;
    company_name?: string;
    careers_url?: string;
    ats_type?: string;
  }): any {
    const fields: string[] = [];
    const values: any[] = [];

    if (typeof updates.is_active === 'boolean') {
      fields.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }
    if (updates.company_name) {
      fields.push('company_name = ?');
      values.push(updates.company_name);
    }
    if (updates.careers_url) {
      fields.push('careers_url = ?');
      values.push(updates.careers_url);
    }
    if (updates.ats_type) {
      fields.push('ats_type = ?');
      values.push(updates.ats_type);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    this.db.prepare(`UPDATE custom_companies SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return this.db.prepare('SELECT * FROM custom_companies WHERE id = ?').get(id);
  }

  deleteCustomCompany(id: number): void {
    this.db.prepare('DELETE FROM custom_companies WHERE id = ? AND added_by_user = 1').run(id);
  }

  // CV operations
  deactivateAllCVs(userProfileId: number = 1): void {
    this.db.prepare('UPDATE cv_documents SET is_active = 0 WHERE user_profile_id = ?').run(userProfileId);
  }

  saveCVDocument(data: {
    user_profile_id?: number;
    file_name: string;
    file_type: string;
    file_size: number;
    file_path: string;
    parsed_content: string;
    is_active?: boolean;
  }): any {
    const userProfileId = data.user_profile_id || 1;

    if (data.is_active !== false) {
      this.deactivateAllCVs(userProfileId);
    }

    const result = this.db.prepare(`
      INSERT INTO cv_documents (
        user_profile_id, file_name, file_type, file_size, file_path, parsed_content, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userProfileId,
      data.file_name,
      data.file_type,
      data.file_size,
      data.file_path,
      data.parsed_content,
      data.is_active !== false ? 1 : 0
    );

    return this.db.prepare('SELECT * FROM cv_documents WHERE id = ?').get(result.lastInsertRowid);
  }

  getCVDocuments(userProfileId: number = 1): any[] {
    return this.db.prepare('SELECT * FROM cv_documents WHERE user_profile_id = ? ORDER BY uploaded_at DESC').all(userProfileId);
  }

  getActiveCV(userProfileId: number = 1): any {
    return this.db.prepare('SELECT * FROM cv_documents WHERE user_profile_id = ? AND is_active = 1').get(userProfileId);
  }

  setActiveCVDocument(cvId: number, userProfileId: number = 1): any {
    this.deactivateAllCVs(userProfileId);
    this.db.prepare('UPDATE cv_documents SET is_active = 1 WHERE id = ? AND user_profile_id = ?').run(cvId, userProfileId);
    return this.db.prepare('SELECT * FROM cv_documents WHERE id = ?').get(cvId);
  }

  deleteCVDocument(cvId: number): void {
    this.db.prepare('DELETE FROM cv_documents WHERE id = ?').run(cvId);
  }

  getCVDocument(cvId: number): any {
    return this.db.prepare('SELECT * FROM cv_documents WHERE id = ?').get(cvId);
  }

  updateCVContent(cvId: number, content: string): void {
    const stmt = this.db.prepare(`
      UPDATE cv_documents
      SET parsed_content = ?
      WHERE id = ?
    `);
    stmt.run(content, cvId);
  }

  // User Profile operations
  saveUserProfile(data: {
    linkedin_url?: string;
    full_name: string;
    headline?: string;
    summary?: string;
    current_position?: string;
    years_of_experience?: number;
    skills?: string;
    experience?: string;
    education?: string;
    preferred_industries?: string;
    preferred_locations?: string;
    preferred_job_types?: string;
  }): any {
    // Check if default profile exists (id = 1)
    const existing = this.db.prepare('SELECT id FROM user_profiles WHERE id = 1').get();

    if (existing) {
      // Update existing profile
      const result = this.db.prepare(`
        UPDATE user_profiles SET
          linkedin_url = ?,
          full_name = ?,
          headline = ?,
          summary = ?,
          current_position = ?,
          years_of_experience = ?,
          skills = ?,
          experience = ?,
          education = ?,
          preferred_industries = ?,
          preferred_locations = ?,
          preferred_job_types = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `).run(
        data.linkedin_url || null,
        data.full_name,
        data.headline || null,
        data.summary || null,
        data.current_position || null,
        data.years_of_experience || 0,
        data.skills || null,
        data.experience || null,
        data.education || null,
        data.preferred_industries || null,
        data.preferred_locations || null,
        data.preferred_job_types || null
      );

      return this.db.prepare('SELECT * FROM user_profiles WHERE id = 1').get();
    } else {
      // Create new profile
      const result = this.db.prepare(`
        INSERT INTO user_profiles (
          linkedin_url, full_name, headline, summary, current_position,
          years_of_experience, skills, experience, education,
          preferred_industries, preferred_locations, preferred_job_types
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.linkedin_url || null,
        data.full_name,
        data.headline || null,
        data.summary || null,
        data.current_position || null,
        data.years_of_experience || 0,
        data.skills || null,
        data.experience || null,
        data.education || null,
        data.preferred_industries || null,
        data.preferred_locations || null,
        data.preferred_job_types || null
      );

      return this.db.prepare('SELECT * FROM user_profiles WHERE id = ?').get(result.lastInsertRowid);
    }
  }

  getUserProfile(profileId: number = 1): any {
    return this.db.prepare('SELECT * FROM user_profiles WHERE id = ?').get(profileId);
  }

  updateUserProfile(profileId: number, updates: any): any {
    const fields: string[] = [];
    const values: any[] = [];

    const allowedFields = [
      'linkedin_url', 'full_name', 'headline', 'summary', 'current_position',
      'years_of_experience', 'skills', 'experience', 'education',
      'preferred_industries', 'preferred_locations', 'preferred_job_types'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(profileId);

    this.db.prepare(`UPDATE user_profiles SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return this.db.prepare('SELECT * FROM user_profiles WHERE id = ?').get(profileId);
  }

  close() {
    this.db.close();
  }
}
