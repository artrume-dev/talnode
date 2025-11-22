import { JobDatabase, Job } from '../db/schema.js';
import { readFileSync } from 'fs';

export interface AlignmentResult {
  job_id: string;
  company: string;
  title: string;
  alignment_score: number;
  strong_matches: string[];
  gaps: string[];
  recommendation: 'high' | 'medium' | 'low';
  reasoning: string;
}

/**
 * Analyze job fit against CV
 * This is a simplified heuristic - in Claude Code, you can use Claude to do deeper analysis
 */
export function analyzeJobFit(
  db: JobDatabase,
  jobId: string,
  cvPath?: string,
  cvId?: number
): AlignmentResult {
  const job = db.getJobById(jobId);

  if (!job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  // Load CV - prefer CV ID from database, fallback to file path
  let cvContent = '';

  if (cvId) {
    // Get CV from database
    try {
      const cv = db.getCVDocument(cvId);
      if (cv && cv.parsed_content) {
        cvContent = cv.parsed_content;
      } else {
        console.warn(`CV ${cvId} not found or has no parsed content`);
      }
    } catch (error) {
      console.warn(`Could not read CV ${cvId} from database:`, error);
    }
  } else if (cvPath) {
    // Fallback to file path for backward compatibility
    try {
      cvContent = readFileSync(cvPath, 'utf-8');
    } catch (error) {
      console.warn(`Could not read CV from ${cvPath}`);
    }
  } else {
    // Try to get active CV if no CV specified
    try {
      const activeCV = db.getActiveCV();
      if (activeCV && activeCV.parsed_content) {
        cvContent = activeCV.parsed_content;
      }
    } catch (error) {
      console.warn('No active CV found');
    }
  }

  // Calculate alignment based on keywords and requirements
  const result = calculateAlignment(job, cvContent);

  // Update alignment score in database with strong matches and gaps
  db.updateAlignmentScore(jobId, result.alignment_score, result.strong_matches, result.gaps);

  return result;
}

/**
 * Detect fundamental domain mismatches between job and CV
 * Returns penalty information if the role requires domain-specific experience
 */
function detectDomainMismatch(jobText: string, cv: string): {
  isMismatch: boolean;
  maxScore: number;
  reasoning: string;
  transferableSkills: string[];
  missingDomains: string[];
} {
  // First check if this is a technical/engineering role - these should NOT be flagged
  const technicalRoleIndicators = [
    'software engineer', 'research engineer', 'ml engineer', 'ai engineer',
    'data engineer', 'infrastructure engineer', 'backend engineer', 'frontend engineer',
    'full-stack engineer', 'machine learning', 'deep learning', 'ai research',
    'technical lead', 'engineering manager', 'staff engineer', 'principal engineer',
    'llm', 'model training', 'pytorch', 'tensorflow', 'neural network'
  ];
  
  const isTechnicalRole = technicalRoleIndicators.some(indicator => 
    jobText.includes(indicator)
  );
  
  // Skip domain mismatch check for technical roles
  if (isTechnicalRole) {
    return {
      isMismatch: false,
      maxScore: 100,
      reasoning: '',
      transferableSkills: [],
      missingDomains: []
    };
  }

  // Define domain-specific requirements that are hard to transfer
  const domainRequirements = {
    political: {
      keywords: [
        'political research', 'policy research', 'public policy', 'government relations',
        'political campaign', 'polling firm', 'election cycle', 'legislative', 'regulatory affairs',
        'public affairs', 'advocacy', 'lobbying', 'political strategy', 'campaign management',
        'political consultant', 'poll analysis', 'political communications'
      ],
      cvKeywords: [
        'political', 'policy work', 'government', 'campaign', 'polling firm', 
        'public affairs', 'legislative', 'political experience', 'policy analyst'
      ],
      domainName: 'political/policy experience',
      requiredCount: 2 // Need at least 2 keyword matches to flag as domain-specific
    },
    medical: {
      keywords: [
        'medical doctor', 'clinical practice', 'healthcare provider', 'physician', 'nurse practitioner', 
        'patient care', 'clinical diagnosis', 'medical treatment', 'medical degree', 'medical school',
        'clinical trial', 'hospital ward', 'medical residency'
      ],
      cvKeywords: [
        'medical school', 'clinical practice', 'patient care', 'hospital', 'healthcare provider',
        'md', 'rn', 'physician', 'nurse', 'clinical residency'
      ],
      domainName: 'medical/clinical practice experience',
      requiredCount: 2
    },
    legal: {
      keywords: [
        'law firm', 'attorney', 'lawyer', 'law degree', 'jd required', 'bar admission', 
        'litigation experience', 'legal counsel', 'contract negotiation', 'legal practice',
        'courtroom', 'legal brief', 'bar exam'
      ],
      cvKeywords: [
        'law school', 'jd', 'attorney', 'lawyer', 'legal practice', 'bar admission',
        'litigation', 'legal counsel', 'law firm'
      ],
      domainName: 'legal practice experience',
      requiredCount: 2
    },
    finance: {
      keywords: [
        'investment banking', 'equity research analyst', 'financial modeling', 'dcf valuation',
        'portfolio management', 'sell-side trading', 'buy-side', 'hedge fund',
        'cfa required', 'securities trading', 'm&a advisory', 'capital markets desk'
      ],
      cvKeywords: [
        'investment bank', 'financial analyst', 'portfolio manager', 'trader', 
        'hedge fund', 'private equity', 'cfa', 'securities', 'investment management'
      ],
      domainName: 'finance/investment banking experience',
      requiredCount: 2
    }
  };

  const transferableSkills: string[] = [];
  const missingDomains: string[] = [];

  // Check each domain requirement with stricter matching
  for (const [domain, config] of Object.entries(domainRequirements)) {
    // Count how many domain keywords appear in job
    const jobDomainKeywordCount = config.keywords.filter(kw => jobText.includes(kw)).length;
    
    // Only flag as domain-specific if multiple strong indicators present
    if (jobDomainKeywordCount >= config.requiredCount) {
      const cvHasDomain = config.cvKeywords.some(kw => cv.includes(kw));
      
      if (!cvHasDomain) {
        // Found a domain mismatch
        missingDomains.push(config.domainName);
        
        // Check for transferable skills
        const transferable = [
          'research methodology', 'data analysis', 'collaboration',
          'strategic thinking', 'communication', 'project management'
        ];
        transferable.forEach(skill => {
          if (jobText.includes(skill) && cv.includes(skill)) {
            transferableSkills.push(skill);
          }
        });
        
        return {
          isMismatch: true,
          maxScore: 25, // Cap at 25% for domain mismatches
          reasoning: `This role requires ${config.domainName} which is not present in your CV. While you have some transferable skills (${transferableSkills.join(', ') || 'research, analysis'}), the core domain expertise is missing.`,
          transferableSkills,
          missingDomains
        };
      }
    }
  }

  return {
    isMismatch: false,
    maxScore: 100,
    reasoning: '',
    transferableSkills: [],
    missingDomains: []
  };
}

function calculateAlignment(job: Job, cvContent: string): AlignmentResult {
  const strongMatches: string[] = [];
  const gaps: string[] = [];
  let score = 0;

  const jobText = `${job.title} ${job.description || ''} ${job.requirements || ''}`.toLowerCase();
  const cv = cvContent.toLowerCase();

  // Check if job has sufficient information for analysis
  const hasDescription = job.description && job.description.trim().length > 20;
  const hasRequirements = job.requirements && job.requirements.trim().length > 20;
  
  if (!hasDescription && !hasRequirements) {
    // Job has insufficient data for accurate analysis
    gaps.push('Job posting lacks detailed description and requirements');
    gaps.push('Cannot perform accurate alignment analysis');
    
    return {
      job_id: job.job_id,
      company: job.company,
      title: job.title,
      alignment_score: 0, // Set to 0 instead of defaulting to high score
      strong_matches: [],
      gaps: gaps,
      recommendation: 'low',
      reasoning: 'Job posting has insufficient information (no description or requirements). Cannot accurately assess fit. Please check the company careers page directly for full job details.',
    };
  }

  // Domain Mismatch Detection - Check for fundamental role incompatibility
  const domainMismatches = detectDomainMismatch(jobText, cv);
  if (domainMismatches.isMismatch) {
    // Cap score at 30% for domain mismatches
    return {
      job_id: job.job_id,
      company: job.company,
      title: job.title,
      alignment_score: Math.min(domainMismatches.maxScore, 30),
      strong_matches: domainMismatches.transferableSkills,
      gaps: domainMismatches.missingDomains,
      recommendation: 'low',
      reasoning: domainMismatches.reasoning,
    };
  }

  // Check for strong experience matches - Expanded keyword dictionary
  const experienceKeywords = {
    // Leadership & Management (15-25 points)
    'technical leadership': 25,
    'team lead': 20,
    'engineering manager': 20,
    'cross-functional': 15,
    'stakeholder management': 15,
    'mentoring': 15,
    'coaching': 12,
    'strategic planning': 18,
    'roadmap': 12,

    // Design Systems & UX (10-20 points)
    'design system': 20,
    'design tokens': 15,
    'component library': 15,
    'pattern library': 12,
    'accessibility': 15,
    'wcag': 12,
    'a11y': 12,
    'aria': 10,
    'inclusive design': 12,
    'responsive design': 10,
    'mobile-first': 10,

    // Frontend Technologies (8-15 points)
    'react': 12,
    'next.js': 12,
    'nextjs': 12,
    'vue': 10,
    'angular': 10,
    'typescript': 12,
    'javascript': 10,
    'html': 8,
    'css': 8,
    'sass': 8,
    'tailwind': 10,
    'styled-components': 8,
    'webpack': 8,
    'vite': 8,
    'graphql': 10,
    'rest api': 10,

    // Design Tools (8-12 points)
    'figma': 12,
    'sketch': 10,
    'adobe xd': 10,
    'invision': 8,
    'zeplin': 8,
    'storybook': 12,

    // AI & Machine Learning (12-20 points)
    'artificial intelligence': 18,
    'ai': 18,
    'machine learning': 18,
    'ml': 15,
    'llm': 15,
    'large language model': 15,
    'gpt': 12,
    'claude': 12,
    'openai': 12,
    'natural language processing': 15,
    'nlp': 15,
    'prompt engineering': 12,
    'ai integration': 15,

    // Backend & Full Stack (8-15 points)
    'node.js': 12,
    'nodejs': 12,
    'python': 10,
    'django': 10,
    'flask': 10,
    'fastapi': 10,
    'express': 10,
    'api development': 12,
    'microservices': 12,
    'serverless': 10,
    'lambda': 8,

    // Data & Databases (8-12 points)
    'sql': 10,
    'postgresql': 10,
    'mysql': 10,
    'mongodb': 10,
    'redis': 8,
    'elasticsearch': 10,
    'data modeling': 12,

    // DevOps & Infrastructure (8-15 points)
    'docker': 12,
    'kubernetes': 12,
    'ci/cd': 12,
    'github actions': 10,
    'jenkins': 8,
    'aws': 12,
    'azure': 10,
    'gcp': 10,
    'terraform': 10,

    // Development Practices (10-18 points)
    'agile': 10,
    'scrum': 10,
    'test-driven development': 12,
    'tdd': 12,
    'unit testing': 10,
    'integration testing': 10,
    'e2e testing': 10,
    'jest': 8,
    'cypress': 8,
    'playwright': 8,
    'code review': 10,
    'pair programming': 10,

    // Architecture & Scale (12-20 points)
    'system design': 18,
    'architecture': 15,
    'scalability': 15,
    'performance optimization': 15,
    'enterprise scale': 18,
    'high availability': 12,
    'distributed systems': 15,

    // Product & Business (10-18 points)
    'product development': 15,
    'user research': 12,
    'user testing': 12,
    'a/b testing': 10,
    'analytics': 10,
    'metrics': 10,
    'kpi': 10,
    'data-driven': 12,

    // Platform & Tools (10-15 points)
    'developer experience': 18,
    'platform': 15,
    'tooling': 12,
    'cli': 10,
    'sdk': 10,
    'api design': 12,
    'documentation': 10,

    // Security (10-15 points)
    'security': 12,
    'authentication': 10,
    'authorization': 10,
    'oauth': 10,
    'encryption': 10,
    'compliance': 12,

    // Collaboration (8-12 points)
    'git': 8,
    'github': 8,
    'gitlab': 8,
    'jira': 8,
    'confluence': 8,
    'slack': 6,
    'remote work': 8,

    // Industry Terms (8-12 points)
    'saas': 10,
    'b2b': 8,
    'b2c': 8,
    'fintech': 10,
    'e-commerce': 10,
    'startup': 8,
    'governance': 12,
  };

  for (const [keyword, points] of Object.entries(experienceKeywords)) {
    if (jobText.includes(keyword)) {
      if (cv.includes(keyword) || cv.includes(keyword.replace(/\s/g, ''))) {
        score += points;
        strongMatches.push(keyword);
      } else {
        gaps.push(keyword);
      }
    }
  }

  // Check for tech stack alignment and calculate scores
  const techStack = job.tech_stack?.toLowerCase() || '';
  const cvTechKeywords = [
    'react', 'typescript', 'javascript', 'figma', 'css', 'html',
    'storybook', 'git', 'node', 'python'
  ];

  cvTechKeywords.forEach(tech => {
    if (techStack.includes(tech) && cv.includes(tech)) {
      score += 5;
    }
  });

  // Calculate max possible score based on keywords that appear in the job posting
  // This gives a more accurate match percentage
  let maxPossibleScore = 0;
  for (const [keyword, points] of Object.entries(experienceKeywords)) {
    if (jobText.includes(keyword)) {
      maxPossibleScore += points;
    }
  }
  
  // Add tech stack potential points
  cvTechKeywords.forEach(tech => {
    if (techStack.includes(tech)) {
      maxPossibleScore += 5;
    }
  });
  
  // Ensure we have a valid denominator (minimum 100 points if job has any requirements)
  if (maxPossibleScore === 0 && jobText.length > 100) {
    maxPossibleScore = 100; // Fallback for jobs without recognized keywords
  }
  
  const alignmentScore = maxPossibleScore > 0 
    ? Math.min(Math.round((score / maxPossibleScore) * 100), 100)
    : 0;

  // Determine recommendation
  let recommendation: 'high' | 'medium' | 'low';
  let reasoning: string;

  if (alignmentScore >= 70) {
    recommendation = 'high';
    reasoning = `Strong alignment (${alignmentScore}%). Your experience closely matches requirements.`;
  } else if (alignmentScore >= 50) {
    recommendation = 'medium';
    reasoning = `Good alignment (${alignmentScore}%) with some gaps. Consider emphasizing transferable skills.`;
  } else {
    recommendation = 'low';
    reasoning = `Limited alignment (${alignmentScore}%). Significant gaps in key requirements.`;
  }

  return {
    job_id: job.job_id,
    company: job.company,
    title: job.title,
    alignment_score: alignmentScore,
    strong_matches: strongMatches.slice(0, 10),
    gaps: gaps.slice(0, 5),
    recommendation,
    reasoning,
  };
}

/**
 * Batch analyze multiple jobs
 */
export function batchAnalyzeJobs(
  db: JobDatabase,
  jobIds: string[],
  cvPath?: string,
  cvId?: number
): AlignmentResult[] {
  return jobIds
    .map(id => {
      try {
        return analyzeJobFit(db, id, cvPath, cvId);
      } catch (error) {
        console.error(`Error analyzing job ${id}:`, error);
        return null;
      }
    })
    .filter((result): result is AlignmentResult => result !== null);
}
