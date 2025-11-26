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
    user_id?: number;
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
    if (filters?.user_id) {
      query += ' AND (user_id = ? OR user_id IS NULL)';
      params.push(filters.user_id);
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
  getAllCompanies(userId?: number): any[] {
    if (userId) {
      // Authenticated user: return their companies + shared companies (user_id IS NULL)
      return this.db.prepare(`
        SELECT * FROM custom_companies
        WHERE user_id = ? OR user_id IS NULL
        ORDER BY added_by_user ASC, company_name ASC
      `).all(userId);
    }
    // Unauthenticated user: return only shared companies (user_id IS NULL)
    return this.db.prepare(`
      SELECT * FROM custom_companies
      WHERE user_id IS NULL
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
    user_id?: number;
  }): any {
    const result = this.db.prepare(`
      INSERT INTO custom_companies (
        company_name, careers_url, ats_type, 
        greenhouse_id, lever_id, workday_id, ashby_id, smartrecruiters_id,
        is_active, added_by_user, user_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)
    `).run(
      data.company_name,
      data.careers_url,
      data.ats_type,
      data.greenhouse_id || null,
      data.lever_id || null,
      data.workday_id || null,
      data.ashby_id || null,
      data.smartrecruiters_id || null,
      data.user_id || null
    );

    return this.db.prepare('SELECT * FROM custom_companies WHERE id = ?').get(result.lastInsertRowid);
  }

  getCompanyById(id: number): any {
    return this.db.prepare('SELECT * FROM custom_companies WHERE id = ?').get(id);
  }

  updateCustomCompany(id: number, userId: number, updates: {
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

    values.push(id, userId);
    this.db.prepare(`UPDATE custom_companies SET ${fields.join(', ')} WHERE id = ? AND (user_id = ? OR user_id IS NULL)`).run(...values);

    return this.db.prepare('SELECT * FROM custom_companies WHERE id = ?').get(id);
  }

  deleteCustomCompany(id: number, userId: number): void {
    this.db.prepare('DELETE FROM custom_companies WHERE id = ? AND user_id = ? AND added_by_user = 1').run(id, userId);
  }

  // CV operations
  deactivateAllCVs(userId: number): void {
    this.db.prepare('UPDATE cv_documents SET is_active = 0 WHERE user_id = ?').run(userId);
  }

  saveCVDocument(data: {
    user_profile_id?: number;
    file_name: string;
    file_type: string;
    file_size: number;
    file_path: string;
    parsed_content: string;
    is_active?: boolean;
    user_id?: number;
  }): any {
    const userProfileId = data.user_profile_id || 1;
    const userId = data.user_id || null;

    if (data.is_active !== false && userId) {
      this.deactivateAllCVs(userId);
    }

    const result = this.db.prepare(`
      INSERT INTO cv_documents (
        user_profile_id, file_name, file_type, file_size, file_path, parsed_content, is_active, user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userProfileId,
      data.file_name,
      data.file_type,
      data.file_size,
      data.file_path,
      data.parsed_content,
      data.is_active !== false ? 1 : 0,
      userId
    );

    return this.db.prepare('SELECT * FROM cv_documents WHERE id = ?').get(result.lastInsertRowid);
  }

  getCVDocuments(userId?: number): any[] {
    if (userId) {
      return this.db.prepare('SELECT * FROM cv_documents WHERE user_id = ? ORDER BY uploaded_at DESC').all(userId);
    }
    // Fallback for old data without user_id
    return this.db.prepare('SELECT * FROM cv_documents ORDER BY uploaded_at DESC').all();
  }

  getActiveCV(userId?: number): any {
    if (userId) {
      return this.db.prepare('SELECT * FROM cv_documents WHERE user_id = ? AND is_active = 1').get(userId);
    }
    // Fallback for old data without user_id
    return this.db.prepare('SELECT * FROM cv_documents WHERE is_active = 1').get();
  }

  setActiveCVDocument(cvId: number, userId: number): any {
    this.deactivateAllCVs(userId);
    this.db.prepare('UPDATE cv_documents SET is_active = 1 WHERE id = ? AND user_id = ?').run(cvId, userId);
    return this.db.prepare('SELECT * FROM cv_documents WHERE id = ?').get(cvId);
  }

  deleteCVDocument(cvId: number, userId?: number): void {
    if (userId) {
      this.db.prepare('DELETE FROM cv_documents WHERE id = ? AND user_id = ?').run(cvId, userId);
    } else {
      this.db.prepare('DELETE FROM cv_documents WHERE id = ?').run(cvId);
    }
  }

  getCVDocument(cvId: number, userId?: number): any {
    if (userId) {
      return this.db.prepare('SELECT * FROM cv_documents WHERE id = ? AND user_id = ?').get(cvId, userId);
    }
    return this.db.prepare('SELECT * FROM cv_documents WHERE id = ?').get(cvId);
  }

  updateCVContent(cvId: number, content: string, userId?: number): void {
    if (userId) {
      const stmt = this.db.prepare(`
        UPDATE cv_documents
        SET parsed_content = ?
        WHERE id = ? AND user_id = ?
      `);
      stmt.run(content, cvId, userId);
    } else {
      const stmt = this.db.prepare(`
        UPDATE cv_documents
        SET parsed_content = ?
        WHERE id = ?
      `);
      stmt.run(content, cvId);
    }
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
    user_id?: number;
  }): any {
    const userId = data.user_id || null;
    
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
          user_id = ?,
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
        data.preferred_job_types || null,
        userId
      );

      return this.db.prepare('SELECT * FROM user_profiles WHERE id = 1').get();
    } else {
      // Create new profile
      const result = this.db.prepare(`
        INSERT INTO user_profiles (
          linkedin_url, full_name, headline, summary, current_position,
          years_of_experience, skills, experience, education,
          preferred_industries, preferred_locations, preferred_job_types, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        data.preferred_job_types || null,
        userId
      );

      return this.db.prepare('SELECT * FROM user_profiles WHERE id = ?').get(result.lastInsertRowid);
    }
  }

  getUserProfile(userId?: number): any {
    if (userId) {
      // Query by user_id (from auth system)
      return this.db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId);
    }
    // Fallback to id=1 for old single-user data
    return this.db.prepare('SELECT * FROM user_profiles WHERE id = ?').get(1);
  }

  updateUserProfile(profileId: number, updates: any): any {
    const fields: string[] = [];
    const values: any[] = [];

    const allowedFields = [
      'linkedin_url', 'full_name', 'headline', 'summary', 'current_position',
      'years_of_experience', 'skills', 'experience', 'education',
      'preferred_industries', 'preferred_locations', 'preferred_job_types', 'user_domains'
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

  // Job Application operations
  hasAppliedToJob(userId: number, jobId: number): boolean {
    const result = this.db.prepare(`
      SELECT COUNT(*) as count FROM job_applications 
      WHERE user_id = ? AND job_id = ?
    `).get(userId, jobId) as { count: number };
    return result.count > 0;
  }

  createJobApplication(data: {
    user_id: number;
    job_id: number;
    cv_variant_id?: number;
    applied_date: string;
    application_status?: string;
    application_source?: string;
    application_notes?: string;
  }): any {
    const result = this.db.prepare(`
      INSERT INTO job_applications (
        user_id, job_id, cv_variant_id, applied_date, 
        application_status, application_source, application_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.user_id,
      data.job_id,
      data.cv_variant_id || null,
      data.applied_date,
      data.application_status || 'applied',
      data.application_source || null,
      data.application_notes || null
    );
    return this.db.prepare('SELECT * FROM job_applications WHERE id = ?').get(result.lastInsertRowid);
  }

  getJobApplications(userId: number, filters?: { status?: string; limit?: number; page?: number }): any[] {
    let query = 'SELECT * FROM job_applications WHERE user_id = ?';
    const params: any[] = [userId];
    
    if (filters?.status) {
      query += ' AND application_status = ?';
      params.push(filters.status);
    }
    
    query += ' ORDER BY applied_date DESC';
    
    if (filters?.limit) {
      const limit = filters.limit;
      const page = filters.page || 1;
      const offset = (page - 1) * limit;
      query += ' LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }
    
    return this.db.prepare(query).all(...params);
  }

  getJobApplicationsCount(userId: number): any {
    const total = this.db.prepare(`
      SELECT COUNT(*) as count FROM job_applications WHERE user_id = ?
    `).get(userId) as { count: number };
    
    const applied = this.db.prepare(`
      SELECT COUNT(*) as count FROM job_applications WHERE user_id = ? AND application_status = 'applied'
    `).get(userId) as { count: number };
    
    const in_review = this.db.prepare(`
      SELECT COUNT(*) as count FROM job_applications WHERE user_id = ? AND application_status = 'in_review'
    `).get(userId) as { count: number };
    
    const interview = this.db.prepare(`
      SELECT COUNT(*) as count FROM job_applications WHERE user_id = ? AND application_status = 'interview'
    `).get(userId) as { count: number };
    
    const accepted = this.db.prepare(`
      SELECT COUNT(*) as count FROM job_applications WHERE user_id = ? AND application_status = 'accepted'
    `).get(userId) as { count: number };
    
    const rejected = this.db.prepare(`
      SELECT COUNT(*) as count FROM job_applications WHERE user_id = ? AND application_status = 'rejected'
    `).get(userId) as { count: number };
    
    return {
      total: total.count,
      applied: applied.count,
      in_review: in_review.count,
      interview: interview.count,
      accepted: accepted.count,
      rejected: rejected.count
    };
  }

  getJobApplication(applicationId: number, userId: number): any {
    return this.db.prepare(`
      SELECT * FROM job_applications 
      WHERE id = ? AND user_id = ?
    `).get(applicationId, userId);
  }

  updateJobApplication(applicationId: number, userId: number, updates: any): any {
    const fields: string[] = [];
    const values: any[] = [];

    const allowedFields = [
      'application_status', 'application_notes', 'follow_up_date',
      'interview_date', 'interview_notes', 'offer_amount', 'offer_currency',
      'decision', 'decision_date', 'rejection_reason'
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
    values.push(applicationId, userId);

    this.db.prepare(`
      UPDATE job_applications 
      SET ${fields.join(', ')} 
      WHERE id = ? AND user_id = ?
    `).run(...values);

    return this.getJobApplication(applicationId, userId);
  }

  deleteJobApplication(applicationId: number, userId: number): void {
    this.db.prepare(`
      DELETE FROM job_applications 
      WHERE id = ? AND user_id = ?
    `).run(applicationId, userId);
  }

  getRecentJobApplications(userId: number, limit: number = 5): any[] {
    return this.db.prepare(`
      SELECT * FROM job_applications 
      WHERE user_id = ? 
      ORDER BY applied_date DESC 
      LIMIT ?
    `).all(userId, limit);
  }

  // Dashboard operations
  getDashboardStats(userId: number): any {
    const totalJobs = this.db.prepare(`
      SELECT COUNT(*) as count FROM jobs 
      WHERE user_id = ? OR user_id IS NULL
    `).get(userId) as { count: number };

    const appliedJobs = this.db.prepare(`
      SELECT COUNT(*) as count FROM job_applications 
      WHERE user_id = ?
    `).get(userId) as { count: number };

    const interviews = this.db.prepare(`
      SELECT COUNT(*) as count FROM job_applications 
      WHERE user_id = ? AND application_status = 'interview'
    `).get(userId) as { count: number };

    const offers = this.db.prepare(`
      SELECT COUNT(*) as count FROM job_applications 
      WHERE user_id = ? AND application_status = 'offer'
    `).get(userId) as { count: number };

    return {
      total_jobs: totalJobs.count,
      applied_jobs: appliedJobs.count,
      interviews: interviews.count,
      offers: offers.count
    };
  }

  getRecentCVOptimizations(userId: number, limit: number = 5): any[] {
    return this.db.prepare(`
      SELECT * FROM cv_variants 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(userId, limit);
  }

  close() {
    this.db.close();
  }
}
