import { JobDatabase, Job } from '../db/schema.js';
import { readFileSync } from 'fs';
import { domainMatcher, DomainMatchResult } from '../domains/domain-matcher.js';
import { getDomainNames } from '../domains/domain-registry.js';

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
  cvId?: number,
  preferredIndustries?: string[],
  userId?: number
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
      const cv = db.getCVDocument(cvId, userId);
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
      const activeCV = db.getActiveCV(userId);
      if (activeCV && activeCV.parsed_content) {
        cvContent = activeCV.parsed_content;
      }
    } catch (error) {
      console.warn('No active CV found');
    }
  }

  // NEW: Get user's selected domains for domain-based matching
  const userProfile = userId ? db.getUserProfile(userId) : null;
  const userDomains = userProfile?.user_domains 
    ? JSON.parse(userProfile.user_domains) 
    : [];

  // NEW: Domain-based matching (if user has domains configured)
  let domainMatch: DomainMatchResult | undefined;
  
  if (userDomains.length > 0) {
    const jobDomains = domainMatcher.detectJobDomains(job.title, job.description || '');
    
    if (jobDomains.length > 0) {
      domainMatch = domainMatcher.matchUserDomains(cvContent, userDomains, jobDomains);
      
      // IMPROVED: Apply score cap for significant domain mismatches
      // Cap score if more than 50% of job domains are mismatched
      const mismatchRatio = domainMatch.mismatchedDomains.length / domainMatch.jobDomains.length;
      
      if (mismatchRatio > 0.5 && domainMatch.matchedDomains.length === 0) {
        // Major mismatch: more than half domains missing and no direct matches
        const result: AlignmentResult = {
          job_id: job.job_id,
          company: job.company,
          title: job.title,
          alignment_score: Math.min(domainMatch.alignmentScore, 35),
          strong_matches: domainMatch.transferableSkills.length > 0 
            ? [`🔄 Transferable: ${domainMatch.transferableSkills.join(', ')}`]
            : [],
          gaps: domainMatch.mismatchedDomains.map(id => {
            const domainNames = getDomainNames([id]);
            return `Missing: ${domainNames.join(', ')} experience`;
          }),
          recommendation: 'low',
          reasoning: domainMatch.reasoning,
        };
        
        // Update database
        db.updateAlignmentScore(jobId, result.alignment_score, result.strong_matches, result.gaps);
        return result;
      }
    }
  }

  // Calculate alignment based on keywords and requirements, passing domain match info
  const result = calculateAlignment(job, cvContent, preferredIndustries, userDomains, domainMatch);

  // Update alignment score in database with strong matches and gaps
  db.updateAlignmentScore(jobId, result.alignment_score, result.strong_matches, result.gaps);

  return result;
}

/**
 * Detects the domain/industry of a job based on its title and description
 */
function detectJobDomain(jobTitle: string, jobText: string): string[] {
  const titleLower = jobTitle.toLowerCase();
  const textLower = jobText.toLowerCase();
  const domains: string[] = [];

  const domainPatterns = {
    'Design Systems': [
      'design system', 'design systems', 'component library', 'ui kit',
      'design engineer', 'design infrastructure', 'design platform',
      'design tokens', 'design tooling'
    ],
    'Product Design': [
      'product designer', 'ux designer', 'ui designer', 'user experience',
      'interaction design', 'visual design', 'product design'
    ],
    'Frontend Engineering': [
      'frontend engineer', 'front-end engineer', 'ui engineer',
      'frontend developer', 'front end developer', 'web developer'
    ],
    'Backend Engineering': [
      'backend engineer', 'back-end engineer', 'backend developer',
      'server engineer', 'api engineer', 'platform engineer'
    ],
    'Software Engineering': [
      'software engineer', 'software developer', 'full stack',
      'full-stack engineer', 'engineer'
    ],
    'Data Science': [
      'data scientist', 'data analyst', 'machine learning engineer',
      'ml engineer', 'ai engineer', 'research scientist'
    ],
    'Infrastructure': [
      'infrastructure engineer', 'devops', 'site reliability',
      'sre', 'cloud engineer', 'platform infrastructure', 'compute'
    ],
    'Product Management': [
      'product manager', 'product lead', 'technical product manager',
      'tpm', 'product owner'
    ],
    'AI/ML': [
      'artificial intelligence', 'machine learning', 'deep learning',
      'ai research', 'ml research', 'llm', 'large language model'
    ],
    'Mobile': [
      'ios', 'android', 'mobile engineer', 'mobile developer',
      'react native', 'flutter'
    ]
  };

  // Check job title first (higher confidence)
  for (const [domain, patterns] of Object.entries(domainPatterns)) {
    if (patterns.some(pattern => titleLower.includes(pattern))) {
      domains.push(domain);
    }
  }

  // If no domain detected from title, check full text
  if (domains.length === 0) {
    for (const [domain, patterns] of Object.entries(domainPatterns)) {
      const matchCount = patterns.filter(pattern => textLower.includes(pattern)).length;
      // Need at least 2 keyword matches to infer domain from text
      if (matchCount >= 2) {
        domains.push(domain);
      }
    }
  }

  return domains;
}

/**
 * Checks if job domain matches user's preferred industries
 * Returns adjustment to apply to the alignment score
 */
function calculateDomainAlignment(
  jobDomains: string[],
  preferredIndustries?: string[]
): {
  adjustment: number;
  reasoning: string;
  isMatch: boolean;
} {
  if (!preferredIndustries || preferredIndustries.length === 0) {
    // No preferences set, don't adjust
    return { adjustment: 0, reasoning: '', isMatch: true };
  }

  if (jobDomains.length === 0) {
    // Can't detect job domain, slight penalty for uncertainty
    return {
      adjustment: -5,
      reasoning: 'Job domain unclear',
      isMatch: false
    };
  }

  // Check for direct match
  const hasMatch = jobDomains.some(domain =>
    preferredIndustries.some(pref =>
      domain.toLowerCase().includes(pref.toLowerCase()) ||
      pref.toLowerCase().includes(domain.toLowerCase())
    )
  );

  if (hasMatch) {
    // Direct domain match - boost score
    return {
      adjustment: 25,
      reasoning: `Strong domain match: ${jobDomains.join(', ')}`,
      isMatch: true
    };
  }

  // Check for related domains (e.g., Design Systems vs Product Design)
  const relatedDomains: { [key: string]: string[] } = {
    'Design Systems': ['Product Design', 'Frontend Engineering', 'UI/UX'],
    'Product Design': ['Design Systems', 'UI/UX'],
    'Frontend Engineering': ['Design Systems', 'Software Engineering'],
    'Backend Engineering': ['Software Engineering', 'Infrastructure'],
    'AI/ML': ['Data Science', 'Software Engineering'],
    'Data Science': ['AI/ML', 'Backend Engineering']
  };

  const hasRelatedMatch = preferredIndustries.some(pref => {
    const related = relatedDomains[pref] || [];
    return jobDomains.some(domain =>
      related.some(r => domain.toLowerCase().includes(r.toLowerCase()))
    );
  });

  if (hasRelatedMatch) {
    // Related domain - small boost
    return {
      adjustment: 10,
      reasoning: `Related domain: ${jobDomains.join(', ')}`,
      isMatch: true
    };
  }

  // No match - significant penalty
  return {
    adjustment: -40,
    reasoning: `Domain mismatch: Job is ${jobDomains.join(', ')}, but you prefer ${preferredIndustries.join(', ')}`,
    isMatch: false
  };
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
    },
    recruiting: {
      keywords: [
        'recruiter', 'recruiting', 'recruitment', 'talent acquisition', 'technical recruiter',
        'full-cycle recruiting', 'sourcing candidates', 'hiring manager', 'candidate pipeline',
        'recruitment strategy', 'headhunter', 'talent sourcing', 'interview coordination',
        'offer negotiation', 'recruiting experience', 'ats system', 'talent partner',
        'recruiting operations', 'hire talent', 'build teams', 'recruiting background'
      ],
      cvKeywords: [
        'recruiter', 'recruiting', 'recruitment', 'talent acquisition', 'hired',
        'sourced candidates', 'talent partner', 'hr', 'human resources', 'headhunter',
        'recruiting experience', 'recruiting background', 'recruiting operations'
      ],
      domainName: 'recruiting/talent acquisition experience',
      requiredCount: 2
    },
    sales: {
      keywords: [
        'sales', 'account executive', 'business development', 'quota', 'sales quota',
        'sales pipeline', 'crm', 'salesforce', 'territory', 'revenue target',
        'account management', 'lead generation', 'closing deals', 'sales target',
        'sales experience', 'sales background', 'sold', 'deal closing', 'sales cycle',
        'outbound sales', 'inbound sales', 'sales strategy', 'sales operations'
      ],
      cvKeywords: [
        'sales', 'sold', 'account executive', 'quota', 'revenue', 'sales pipeline',
        'crm', 'business development', 'sales experience', 'sales background',
        'account management', 'closing deals', 'sales operations'
      ],
      domainName: 'sales experience',
      requiredCount: 2
    },
    security_grc: {
      keywords: [
        'grc', 'governance risk compliance', 'security grc', 'grc specialist',
        'compliance framework', 'soc 2', 'soc2', 'iso 27001', 'iso27001',
        'nist', 'gdpr compliance', 'hipaa', 'pci dss', 'fedramp',
        'security audit', 'compliance audit', 'risk assessment', 'control testing',
        'security controls', 'compliance controls', 'audit framework',
        'risk management framework', 'third-party risk', 'vendor risk',
        'security questionnaire', 'compliance certification', 'audit evidence',
        'policy compliance', 'security policy', 'compliance program'
      ],
      cvKeywords: [
        'grc', 'governance', 'compliance', 'security audit', 'risk assessment',
        'soc 2', 'soc2', 'iso 27001', 'iso27001', 'nist', 'audit',
        'compliance framework', 'risk management', 'security controls',
        'fedramp', 'gdpr', 'hipaa', 'pci dss', 'security certification',
        'vendor risk', 'third-party risk', 'compliance program'
      ],
      domainName: 'security GRC/compliance experience',
      requiredCount: 3
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

function calculateAlignment(
  job: Job, 
  cvContent: string, 
  preferredIndustries?: string[], 
  userDomains?: string[],
  domainMatch?: DomainMatchResult
): AlignmentResult {
  const strongMatches: string[] = [];
  const gaps: string[] = [];
  let score = 0;
  let domainReasoning = '';

  const jobText = `${job.title} ${job.description || ''} ${job.requirements || ''}`.toLowerCase();
  const cv = cvContent.toLowerCase();

  // NEW: Add comprehensive domain match info if available
  if (domainMatch) {
    // Add matched domains to strong matches
    if (domainMatch.matchedDomains.length > 0) {
      const matchedNames = getDomainNames(domainMatch.matchedDomains);
      strongMatches.push(`🎯 Domain match: ${matchedNames.join(', ')}`);
      score += 15; // Bonus for direct domain match
    }
    
    // Add transferable skills to strong matches
    if (domainMatch.transferableSkills.length > 0) {
      strongMatches.push(`🔄 Transferable: ${domainMatch.transferableSkills.join(', ')}`);
      score += 10; // Bonus for transferable skills
    }
    
    // Add mismatched domains to gaps
    if (domainMatch.mismatchedDomains.length > 0) {
      const mismatchedNames = getDomainNames(domainMatch.mismatchedDomains);
      gaps.push(...mismatchedNames.map(name => `Missing: ${name} experience`));
    }
    
    // Preserve domain reasoning
    if (domainMatch.reasoning) {
      domainReasoning = domainMatch.reasoning;
    }
    
    // Apply score cap for significant domain mismatches
    const mismatchRatio = domainMatch.mismatchedDomains.length / domainMatch.jobDomains.length;
    if (mismatchRatio > 0.5) {
      // More than 50% of job domains are mismatched
      score = Math.min(score, 35);
    }
  }

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

  // OLD: Legacy domain detection - DISABLED in favor of new domain matching system
  // The new domain matching system (lines 75-111) handles domain alignment more accurately
  // This old logic was giving false positives (e.g., matching "AI/ML" for marketing CVs)
  // const jobDomains = detectJobDomain(job.title, jobText);
  // const domainAlignment = calculateDomainAlignment(jobDomains, preferredIndustries);
  
  // Disabled: Track domain match info
  // if (domainAlignment.reasoning) {
  //   if (domainAlignment.isMatch) {
  //     strongMatches.push(domainAlignment.reasoning);
  //   } else {
  //     gaps.push(domainAlignment.reasoning);
  //   }
  // }

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
  
  let alignmentScore = maxPossibleScore > 0
    ? Math.min(Math.round((score / maxPossibleScore) * 100), 100)
    : 0;

  // OLD: Apply domain alignment adjustment - DISABLED (was causing false positives)
  // Domain alignment is now handled by the new domain matching system (lines 479-511)
  // alignmentScore = Math.max(0, Math.min(100, alignmentScore + domainAlignment.adjustment));

  // Determine recommendation with clearer thresholds
  let recommendation: 'high' | 'medium' | 'low';
  let reasoning: string;

  if (alignmentScore >= 70) {
    recommendation = 'high';
    reasoning = `Strong alignment (${alignmentScore}%). Your experience closely matches requirements. This is a good fit!`;
  } else if (alignmentScore >= 50) {
    recommendation = 'medium';
    reasoning = `Moderate alignment (${alignmentScore}%) with some gaps. Consider emphasizing transferable skills in your application.`;
  } else if (alignmentScore >= 30) {
    recommendation = 'low';
    reasoning = `Limited alignment (${alignmentScore}%). Significant gaps in key requirements. Application not recommended - focus on jobs with better match.`;
  } else {
    recommendation = 'low';
    reasoning = `Very low alignment (${alignmentScore}%). Fundamental domain mismatch detected. DO NOT APPLY - this role requires experience you don't have. Optimizing CV for this role may lead to fabricated content.`;
  }

  // Prepend domain reasoning if available
  if (domainReasoning) {
    reasoning = domainReasoning + ' ' + reasoning;
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
  cvId?: number,
  preferredIndustries?: string[],
  userId?: number
): AlignmentResult[] {
  return jobIds
    .map(id => {
      try {
        return analyzeJobFit(db, id, cvPath, cvId, preferredIndustries, userId);
      } catch (error) {
        console.error(`Error analyzing job ${id}:`, error);
        return null;
      }
    })
    .filter((result): result is AlignmentResult => result !== null);
}
