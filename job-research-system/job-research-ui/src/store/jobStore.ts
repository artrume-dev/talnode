import { create } from 'zustand';
import type { Job } from '../types';

interface JobFilters {
  status?: string;
  priority?: string;
  minAlignment?: number;
  searchKeywords?: string[];
  companies?: string[];
  remoteOnly?: boolean;
  salaryRange?: { min?: number; max?: number };
}

interface JobStore {
  // State
  jobs: Job[];
  selectedJobId: string | null;
  currentPage: number;
  pageSize: number;
  totalJobs: number;
  filters: JobFilters;
  searchQuery: string;
  selectedCompanies: string[];
  isLoading: boolean;
  error: string | null;
  usePreferences: boolean;

  // Actions
  setJobs: (jobs: Job[]) => void;
  addJobs: (jobs: Job[]) => void;
  updateJob: (id: string, updates: Partial<Job>) => void;
  removeJob: (id: string) => void;
  setSelectedJobId: (id: string | null) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalJobs: (total: number) => void;
  setFilters: (filters: Partial<JobFilters>) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;
  setSelectedCompanies: (companies: string[]) => void;
  toggleCompany: (company: string) => void;
  selectAllCompanies: (companies: string[]) => void;
  deselectAllCompanies: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUsePreferences: (use: boolean) => void;
  reset: () => void;
  loadJobs: () => Promise<void>;

  // Computed
  filteredJobs: () => Job[];
  paginatedJobs: () => Job[];
  selectedJob: () => Job | null;
}

const initialState = {
  jobs: [],
  selectedJobId: null,
  currentPage: 1,
  pageSize: 10,
  totalJobs: 0,
  filters: {},
  searchQuery: '',
  selectedCompanies: [],
  isLoading: false,
  error: null,
  usePreferences: true,
};

export const useJobStore = create<JobStore>((set, get) => ({
  ...initialState,

  setJobs: (jobs) => {
    // Parse JSON fields from database
    const parsedJobs = jobs.map(job => ({
      ...job,
      strong_matches: typeof job.strong_matches === 'string' 
        ? JSON.parse(job.strong_matches) 
        : job.strong_matches,
      gaps: typeof job.gaps === 'string' 
        ? JSON.parse(job.gaps) 
        : job.gaps,
    }));
    set({ jobs: parsedJobs, totalJobs: parsedJobs.length });
  },

  addJobs: (newJobs) =>
    set((state) => {
      // Parse JSON fields from database
      const parsedJobs = newJobs.map(job => ({
        ...job,
        strong_matches: typeof job.strong_matches === 'string' 
          ? JSON.parse(job.strong_matches) 
          : job.strong_matches,
        gaps: typeof job.gaps === 'string' 
          ? JSON.parse(job.gaps) 
          : job.gaps,
      }));
      
      const existingIds = new Set(state.jobs.map((j) => j.id));
      const uniqueJobs = parsedJobs.filter((j) => !existingIds.has(j.id));
      const allJobs = [...state.jobs, ...uniqueJobs];
      return { jobs: allJobs, totalJobs: allJobs.length };
    }),

  updateJob: (id, updates) =>
    set((state) => ({
      jobs: state.jobs.map((job) => (job.id === id ? { ...job, ...updates } : job)),
    })),

  removeJob: (id) =>
    set((state) => {
      const newJobs = state.jobs.filter((job) => job.id !== id);
      return {
        jobs: newJobs,
        totalJobs: newJobs.length,
        selectedJobId: state.selectedJobId === id ? null : state.selectedJobId,
      };
    }),

  setSelectedJobId: (id) => set({ selectedJobId: id }),

  setCurrentPage: (page) => set({ currentPage: page }),

  setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),

  setTotalJobs: (total) => set({ totalJobs: total }),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      currentPage: 1, // Reset to first page when filters change
    })),

  clearFilters: () => set({ filters: {}, currentPage: 1 }),

  setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),

  setSelectedCompanies: (companies) => set({ selectedCompanies: companies, currentPage: 1 }),

  toggleCompany: (company) =>
    set((state) => {
      const selected = state.selectedCompanies.includes(company)
        ? state.selectedCompanies.filter((c) => c !== company)
        : [...state.selectedCompanies, company];
      return { selectedCompanies: selected, currentPage: 1 };
    }),

  selectAllCompanies: (companies) => set({ selectedCompanies: companies, currentPage: 1 }),

  deselectAllCompanies: () => set({ selectedCompanies: [], currentPage: 1 }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  setUsePreferences: (use) => set({ usePreferences: use }),

  reset: () => set(initialState),

  loadJobs: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('http://localhost:3001/api/tools/get_jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to load jobs');
      }

      const jobs = await response.json();
      set({ jobs, totalJobs: jobs.length, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load jobs',
        isLoading: false 
      });
    }
  },

  // Computed getters
  filteredJobs: () => {
    const state = get();
    let filtered = state.jobs;

    // Import user preferences from userStore
    // Note: This creates a dependency on userStore, but it's necessary for preference-based filtering
    const userProfile = typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('user-storage') || '{}')?.state?.profile 
      : null;

    // Filter by user preferences (from onboarding) - only if usePreferences is true
    if (state.usePreferences && userProfile) {
      // Filter by preferred locations
      if (userProfile.preferred_locations) {
        try {
          const preferredLocations = JSON.parse(userProfile.preferred_locations);
          if (preferredLocations.length > 0) {
            filtered = filtered.filter((job) => {
              const jobLocation = (job.location || '').toLowerCase();
              
              // If job has ambiguous location, match ALL preferences (more lenient)
              const ambiguousLocations = ['multiple locations', 'various', 'various locations', 'multiple', 'flexible'];
              if (ambiguousLocations.some(amb => jobLocation.includes(amb))) {
                return true; // Show jobs with flexible locations to everyone
              }
              
              // Check if job matches any preferred location
              return preferredLocations.some((loc: string) => {
                const prefLoc = loc.toLowerCase();
                
                // Special handling for "Remote" preference
                if (prefLoc === 'remote') {
                  return job.remote === true || jobLocation.includes('remote');
                }
                
                // Handle common abbreviations
                const locationMap: Record<string, string[]> = {
                  'sf': ['san francisco', 'sf'],
                  'san francisco': ['san francisco', 'sf'],
                  'nyc': ['new york', 'nyc', 'ny'],
                  'new york': ['new york', 'nyc', 'ny'],
                  'la': ['los angeles', 'la'],
                  'los angeles': ['los angeles', 'la'],
                  'seattle': ['seattle', 'wa'],
                  'austin': ['austin', 'tx'],
                  'boston': ['boston', 'ma'],
                  'chicago': ['chicago', 'il'],
                  'uk': ['london', 'uk', 'united kingdom'],
                  'london': ['london', 'uk'],
                  'india': ['bangalore', 'india', 'mumbai', 'delhi'],
                  'bangalore': ['bangalore', 'india'],
                };
                
                // Get all variations of this location
                const variations = locationMap[prefLoc] || [prefLoc];
                
                // Check if job location contains any variation
                return variations.some(variant => jobLocation.includes(variant));
              });
            });
          }
        } catch (e) {
          console.warn('Failed to parse preferred_locations:', e);
        }
      }

      // Filter by preferred job types
      if (userProfile.preferred_job_types) {
        try {
          const preferredJobTypes = JSON.parse(userProfile.preferred_job_types);
          if (preferredJobTypes.length > 0) {
            filtered = filtered.filter((job) => {
              const jobTitle = (job.title || '').toLowerCase();
              const jobDesc = (job.description || '').toLowerCase();
              const jobLocation = (job.location || '').toLowerCase();
              
              return preferredJobTypes.some((type: string) => {
                const prefType = type.toLowerCase();
                
                // Match job types
                if (prefType === 'remote') {
                  return job.remote === true || jobLocation.includes('remote');
                }
                if (prefType === 'full-time') {
                  return jobTitle.includes('full') || jobTitle.includes('full-time') || 
                         jobDesc.includes('full-time') || !jobTitle.includes('contract') && !jobTitle.includes('part-time');
                }
                if (prefType === 'part-time') {
                  return jobTitle.includes('part') || jobTitle.includes('part-time') || jobDesc.includes('part-time');
                }
                if (prefType === 'contract') {
                  return jobTitle.includes('contract') || jobDesc.includes('contract') || jobDesc.includes('contractor');
                }
                if (prefType === 'hybrid') {
                  return jobLocation.includes('hybrid') || jobDesc.includes('hybrid');
                }
                if (prefType === 'on-site') {
                  return !job.remote && !jobLocation.includes('remote');
                }
                
                // Generic match
                return jobTitle.includes(prefType) || jobDesc.includes(prefType);
              });
            });
          }
        } catch (e) {
          console.warn('Failed to parse preferred_job_types:', e);
        }
      }

      // Filter by preferred industries (check job title, description, tech_stack)
      if (userProfile.preferred_industries) {
        try {
          const preferredIndustries = JSON.parse(userProfile.preferred_industries);
          if (preferredIndustries.length > 0) {
            filtered = filtered.filter((job) => {
              const jobTitle = (job.title || '').toLowerCase();
              const jobDesc = (job.description || '').toLowerCase();
              const techStack = (job.tech_stack || '').toLowerCase();
              const company = (job.company || '').toLowerCase();
              
              return preferredIndustries.some((industry: string) => {
                const ind = industry.toLowerCase();
                
                // Map industry keywords to job-related terms
                const industryKeywords: Record<string, string[]> = {
                  'ai/ml': ['ai', 'machine learning', 'ml', 'artificial intelligence', 'llm', 'nlp'],
                  'product management': ['product', 'pm', 'product manager', 'product management'],
                  'design systems': ['design system', 'design systems', 'component library', 'ui kit'],
                  'developer tools': ['developer tools', 'dx', 'developer experience', 'devtools', 'api'],
                  'infrastructure': ['infrastructure', 'devops', 'platform', 'cloud', 'kubernetes', 'aws'],
                  'security': ['security', 'infosec', 'cybersecurity', 'compliance'],
                  'data': ['data', 'analytics', 'data science', 'data engineer'],
                  'frontend': ['frontend', 'front-end', 'react', 'vue', 'angular', 'typescript'],
                  'backend': ['backend', 'back-end', 'api', 'server', 'node', 'python', 'java'],
                  'mobile': ['mobile', 'ios', 'android', 'react native', 'flutter'],
                };
                
                // Get keywords for this industry
                const keywords = industryKeywords[ind] || [ind];
                
                // Check if any keyword matches
                return keywords.some(keyword => 
                  jobTitle.includes(keyword) || 
                  jobDesc.includes(keyword) || 
                  techStack.includes(keyword) ||
                  company.includes(keyword)
                );
              });
            });
          }
        } catch (e) {
          console.warn('Failed to parse preferred_industries:', e);
        }
      }
    }

    // Filter by selected companies
    if (state.selectedCompanies.length > 0) {
      filtered = filtered.filter((job) =>
        state.selectedCompanies.some((company) =>
          job.company.toLowerCase().includes(company.toLowerCase())
        )
      );
    }

    // Filter by status
    if (state.filters.status) {
      filtered = filtered.filter((job) => job.status === state.filters.status);
    }

    // Filter by priority
    if (state.filters.priority) {
      filtered = filtered.filter((job) => job.priority === state.filters.priority);
    }

    // Filter by minimum alignment
    if (state.filters.minAlignment !== undefined) {
      filtered = filtered.filter(
        (job) => job.alignment_score !== undefined && job.alignment_score >= state.filters.minAlignment!
      );
    }

    // Filter by search query
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.company.toLowerCase().includes(query) ||
          job.description?.toLowerCase().includes(query)
      );
    }

    // Filter by remote only
    if (state.filters.remoteOnly) {
      filtered = filtered.filter((job) => job.remote);
    }

    // Sort by alignment score (match score) descending - highest matches first
    filtered = filtered.sort((a, b) => {
      const scoreA = a.alignment_score ?? 0;
      const scoreB = b.alignment_score ?? 0;
      return scoreB - scoreA;
    });

    return filtered;
  },

  paginatedJobs: () => {
    const state = get();
    const filtered = state.filteredJobs();
    const start = (state.currentPage - 1) * state.pageSize;
    const end = start + state.pageSize;
    return filtered.slice(start, end);
  },

  selectedJob: () => {
    const state = get();
    return state.jobs.find((job) => job.id === state.selectedJobId) || null;
  },
}));
