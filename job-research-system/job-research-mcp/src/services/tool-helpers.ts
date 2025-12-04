/**
 * Tool Helper Functions for LLM Job Analyzer
 * 
 * These functions are called by the LLM via tool calling to ensure
 * deterministic, consistent scoring and analysis.
 */

// ============================================================================
// SKILL EXTRACTION TOOL
// ============================================================================

/**
 * Comprehensive skill keyword dictionary for deterministic extraction
 * Organized by category with normalized names
 */
const SKILL_KEYWORDS: Record<string, string[]> = {
  // Programming Languages
  'JavaScript': ['javascript', 'js', 'ecmascript', 'es6', 'es2015'],
  'TypeScript': ['typescript', 'ts'],
  'Python': ['python', 'py'],
  'Java': ['java'],
  'Go': ['go', 'golang'],
  'Rust': ['rust'],
  'C++': ['c++', 'cpp', 'c plus plus'],
  'C#': ['c#', 'csharp', 'c sharp'],
  'Ruby': ['ruby', 'rails', 'ruby on rails'],
  'PHP': ['php'],
  'Swift': ['swift', 'ios'],
  'Kotlin': ['kotlin', 'android'],
  'Scala': ['scala'],
  
  // Frontend Frameworks & Libraries
  'React': ['react', 'reactjs', 'react.js'],
  'Vue': ['vue', 'vuejs', 'vue.js'],
  'Angular': ['angular', 'angularjs', 'angular.js'],
  'Next.js': ['next.js', 'nextjs', 'next'],
  'Svelte': ['svelte', 'sveltekit'],
  'Remix': ['remix'],
  'Nuxt': ['nuxt', 'nuxtjs'],
  
  // Backend Frameworks
  'Node.js': ['node.js', 'nodejs', 'node'],
  'Express': ['express', 'express.js'],
  'Django': ['django'],
  'Flask': ['flask'],
  'FastAPI': ['fastapi', 'fast api'],
  'Spring': ['spring', 'spring boot', 'springboot'],
  'Laravel': ['laravel'],
  'ASP.NET': ['asp.net', 'aspnet'],
  
  // Databases
  'PostgreSQL': ['postgresql', 'postgres', 'pg'],
  'MySQL': ['mysql'],
  'MongoDB': ['mongodb', 'mongo'],
  'Redis': ['redis'],
  'Elasticsearch': ['elasticsearch', 'elastic search', 'elk'],
  'DynamoDB': ['dynamodb', 'dynamo db'],
  'Cassandra': ['cassandra'],
  
  // Cloud & Infrastructure
  'AWS': ['aws', 'amazon web services'],
  'Azure': ['azure', 'microsoft azure'],
  'GCP': ['gcp', 'google cloud', 'google cloud platform'],
  'Docker': ['docker', 'containerization'],
  'Kubernetes': ['kubernetes', 'k8s'],
  'Terraform': ['terraform'],
  'Ansible': ['ansible'],
  'CI/CD': ['ci/cd', 'cicd', 'continuous integration', 'continuous deployment'],
  'GitHub Actions': ['github actions', 'github ci'],
  'Jenkins': ['jenkins'],
  
  // Design Tools
  'Figma': ['figma'],
  'Sketch': ['sketch'],
  'Adobe XD': ['adobe xd', 'xd'],
  'InVision': ['invision'],
  'Zeplin': ['zeplin'],
  'Storybook': ['storybook'],
  'Framer': ['framer'],
  
  // Design Concepts
  'Design Systems': ['design system', 'design systems', 'component library', 'pattern library'],
  'Design Tokens': ['design tokens', 'design token'],
  'Accessibility': ['accessibility', 'a11y', 'wcag', 'aria', 'inclusive design'],
  'Responsive Design': ['responsive design', 'mobile-first', 'mobile first'],
  'User Experience': ['ux', 'user experience', 'user research', 'usability'],
  'User Interface': ['ui', 'user interface', 'interface design'],
  
  // AI/ML
  'Machine Learning': ['machine learning', 'ml', 'deep learning', 'neural networks'],
  'AI': ['artificial intelligence', 'ai', 'llm', 'large language model', 'gpt', 'claude', 'openai'],
  'NLP': ['natural language processing', 'nlp', 'text processing'],
  'Prompt Engineering': ['prompt engineering', 'prompt design'],
  
  // Testing
  'Jest': ['jest'],
  'Vitest': ['vitest'],
  'Cypress': ['cypress'],
  'Playwright': ['playwright'],
  'Selenium': ['selenium'],
  'Unit Testing': ['unit testing', 'unit tests', 'test driven development', 'tdd'],
  'Integration Testing': ['integration testing', 'integration tests'],
  'E2E Testing': ['e2e testing', 'end to end testing', 'end-to-end testing'],
  
  // Leadership & Management
  'Technical Leadership': ['technical leadership', 'tech lead', 'engineering lead'],
  'Team Leadership': ['team lead', 'team leadership', 'leading teams'],
  'Engineering Management': ['engineering manager', 'engineering management', 'em'],
  'Mentoring': ['mentoring', 'mentor', 'coaching', 'coach'],
  'Cross-functional': ['cross-functional', 'cross functional', 'crossfunctional'],
  'Stakeholder Management': ['stakeholder management', 'stakeholders'],
  'Strategic Planning': ['strategic planning', 'roadmap', 'roadmaps'],
  
  // Methodologies
  'Agile': ['agile', 'scrum', 'sprint', 'kanban'],
  'DevOps': ['devops', 'dev ops'],
  'Microservices': ['microservices', 'micro services', 'microservice architecture'],
  'REST API': ['rest api', 'rest', 'restful', 'restful api'],
  'GraphQL': ['graphql', 'graph ql'],
  'gRPC': ['grpc', 'g rpc'],
};

/**
 * Normalize text for skill matching (lowercase, remove special chars)
 */
function normalizeText(text: string): string {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract skills from text deterministically
 * Returns structured list of skills found in the text
 */
export function extractSkills(text: string): {
  skills: string[];
  skillCategories: Record<string, string[]>;
  confidence: 'high' | 'medium' | 'low';
} {
  const normalized = normalizeText(text);
  const foundSkills: Set<string> = new Set();
  const skillCategories: Record<string, string[]> = {};
  
  // Check each skill keyword
  for (const [skillName, keywords] of Object.entries(SKILL_KEYWORDS)) {
    for (const keyword of keywords) {
      const normalizedKeyword = normalizeText(keyword);
      
      // Check for exact word match or phrase match
      const regex = new RegExp(`\\b${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(normalized)) {
        foundSkills.add(skillName);
        
        // Categorize skill
        const category = getSkillCategory(skillName);
        if (!skillCategories[category]) {
          skillCategories[category] = [];
        }
        if (!skillCategories[category].includes(skillName)) {
          skillCategories[category].push(skillName);
        }
        break; // Found this skill, move to next
      }
    }
  }
  
  // Determine confidence based on number of skills found
  let confidence: 'high' | 'medium' | 'low' = 'low';
  const skillCount = foundSkills.size;
  if (skillCount >= 10) {
    confidence = 'high';
  } else if (skillCount >= 5) {
    confidence = 'medium';
  }
  
  return {
    skills: Array.from(foundSkills).sort(),
    skillCategories,
    confidence,
  };
}

/**
 * Get category for a skill
 */
function getSkillCategory(skill: string): string {
  if (['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala'].includes(skill)) {
    return 'Programming Languages';
  }
  if (['React', 'Vue', 'Angular', 'Next.js', 'Svelte', 'Remix', 'Nuxt'].includes(skill)) {
    return 'Frontend Frameworks';
  }
  if (['Node.js', 'Express', 'Django', 'Flask', 'FastAPI', 'Spring', 'Laravel', 'ASP.NET'].includes(skill)) {
    return 'Backend Frameworks';
  }
  if (['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra'].includes(skill)) {
    return 'Databases';
  }
  if (['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'CI/CD', 'GitHub Actions', 'Jenkins'].includes(skill)) {
    return 'Cloud & Infrastructure';
  }
  if (['Figma', 'Sketch', 'Adobe XD', 'InVision', 'Zeplin', 'Storybook', 'Framer'].includes(skill)) {
    return 'Design Tools';
  }
  if (['Design Systems', 'Design Tokens', 'Accessibility', 'Responsive Design', 'User Experience', 'User Interface'].includes(skill)) {
    return 'Design Concepts';
  }
  if (['Machine Learning', 'AI', 'NLP', 'Prompt Engineering'].includes(skill)) {
    return 'AI/ML';
  }
  if (['Jest', 'Vitest', 'Cypress', 'Playwright', 'Selenium', 'Unit Testing', 'Integration Testing', 'E2E Testing'].includes(skill)) {
    return 'Testing';
  }
  if (['Technical Leadership', 'Team Leadership', 'Engineering Management', 'Mentoring', 'Cross-functional', 'Stakeholder Management', 'Strategic Planning'].includes(skill)) {
    return 'Leadership & Management';
  }
  if (['Agile', 'DevOps', 'Microservices', 'REST API', 'GraphQL', 'gRPC'].includes(skill)) {
    return 'Methodologies';
  }
  return 'Other';
}

// ============================================================================
// EMBEDDING SIMILARITY TOOL
// ============================================================================

/**
 * Calculate cosine similarity between two embedding vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  
  return dotProduct / denominator;
}

/**
 * Calculate embedding similarity between two texts using OpenAI embeddings
 * Returns similarity score (0-1) and normalized score (0-100)
 */
export async function calculateEmbeddingSimilarity(
  text1: string,
  text2: string,
  apiKey: string
): Promise<{
  similarity: number;      // 0-1 cosine similarity
  score: number;           // 0-100 normalized score
  interpretation: string;
}> {
  try {
    // Call OpenAI embeddings API
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-large',
        input: [text1, text2],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`OpenAI embeddings API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const embeddings = data.data;
    
    if (embeddings.length !== 2) {
      throw new Error('Expected 2 embeddings, got ' + embeddings.length);
    }

    const embedding1 = embeddings[0].embedding;
    const embedding2 = embeddings[1].embedding;
    
    // Calculate cosine similarity
    const similarity = cosineSimilarity(embedding1, embedding2);
    
    // Normalize to 0-100 score
    // Cosine similarity ranges from -1 to 1, but embeddings are typically 0-1
    // We'll scale it to 0-100
    const score = Math.max(0, Math.min(100, similarity * 100));
    
    // Provide interpretation
    let interpretation: string;
    if (score >= 80) {
      interpretation = 'Very high similarity - strong alignment';
    } else if (score >= 65) {
      interpretation = 'High similarity - good alignment';
    } else if (score >= 50) {
      interpretation = 'Moderate similarity - some alignment';
    } else if (score >= 35) {
      interpretation = 'Low similarity - limited alignment';
    } else {
      interpretation = 'Very low similarity - poor alignment';
    }
    
    return {
      similarity,
      score,
      interpretation,
    };
  } catch (error) {
    console.error('Error calculating embedding similarity:', error);
    throw error;
  }
}

// ============================================================================
// ROLE-LEVEL LOOKUP TOOL
// ============================================================================

/**
 * Standardized role levels hierarchy
 * Ordered from entry-level to most senior
 */
export enum RoleLevel {
  INTERN = 0,
  JUNIOR = 1,
  MID = 2,
  SENIOR = 3,
  LEAD = 4,
  STAFF = 5,
  PRINCIPAL = 6,
  ARCHITECT = 7,
  DIRECTOR = 8,
  VP = 9,
  C_LEVEL = 10,
}

/**
 * Role level patterns - maps keywords to standardized levels
 * More specific patterns should come first
 */
const ROLE_LEVEL_PATTERNS: Array<{ level: RoleLevel; patterns: string[]; minYears?: number; maxYears?: number }> = [
  // C-Level
  { level: RoleLevel.C_LEVEL, patterns: ['chief', 'cto', 'cfo', 'ceo', 'cpo', 'cmo', 'ciso', 'chief technology officer', 'chief product officer'] },
  
  // VP Level
  { level: RoleLevel.VP, patterns: ['vice president', 'vp of', 'vp engineering', 'vp product', 'vp design'] },
  
  // Director Level
  { level: RoleLevel.DIRECTOR, patterns: ['director of', 'director', 'head of', 'head of engineering', 'head of product', 'head of design'], minYears: 8 },
  
  // Architect Level
  { level: RoleLevel.ARCHITECT, patterns: ['architect', 'solution architect', 'system architect', 'technical architect'], minYears: 10 },
  
  // Principal Level
  { level: RoleLevel.PRINCIPAL, patterns: ['principal', 'principal engineer', 'principal designer', 'principal product', 'principal software'], minYears: 8 },
  
  // Staff Level
  { level: RoleLevel.STAFF, patterns: ['staff', 'staff engineer', 'staff designer', 'staff software', 'staff product'], minYears: 7 },
  
  // Lead Level
  { level: RoleLevel.LEAD, patterns: ['lead', 'tech lead', 'engineering lead', 'team lead', 'technical lead', 'lead engineer', 'lead designer', 'lead product', 'lead software'], minYears: 5 },
  
  // Senior Level
  { level: RoleLevel.SENIOR, patterns: ['senior', 'sr.', 'sr ', 'senior engineer', 'senior designer', 'senior product', 'senior software', 'senior developer'], minYears: 4, maxYears: 8 },
  
  // Mid Level
  { level: RoleLevel.MID, patterns: ['mid', 'mid-level', 'mid level', 'engineer', 'designer', 'developer', 'product manager', 'software engineer'], minYears: 2, maxYears: 5 },
  
  // Junior Level
  { level: RoleLevel.JUNIOR, patterns: ['junior', 'jr.', 'jr ', 'entry', 'entry-level', 'entry level', 'associate', 'associate engineer', 'associate designer'], minYears: 0, maxYears: 2 },
  
  // Intern Level
  { level: RoleLevel.INTERN, patterns: ['intern', 'internship', 'intern engineer', 'intern designer'] },
];

/**
 * Extract role level from job title or CV text
 */
function extractRoleLevel(text: string): {
  level: RoleLevel;
  levelName: string;
  confidence: 'high' | 'medium' | 'low';
  matchedPattern?: string;
} {
  const normalized = normalizeText(text);
  
  // Try to match patterns (more specific first)
  for (const { level, patterns } of ROLE_LEVEL_PATTERNS) {
    for (const pattern of patterns) {
      const normalizedPattern = normalizeText(pattern);
      // Check for word boundary match
      const regex = new RegExp(`\\b${normalizedPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(normalized)) {
        return {
          level,
          levelName: RoleLevel[level],
          confidence: 'high',
          matchedPattern: pattern,
        };
      }
    }
  }
  
  // If no match found, try to infer from context
  // Check for years of experience mentions
  const yearsMatch = normalized.match(/(\d+)\+?\s*(years?|yrs?|y\.?)\s*(of\s*)?(experience|exp)/i);
  if (yearsMatch) {
    const years = parseInt(yearsMatch[1]);
    if (years >= 10) {
      return { level: RoleLevel.PRINCIPAL, levelName: 'PRINCIPAL', confidence: 'low' };
    } else if (years >= 7) {
      return { level: RoleLevel.STAFF, levelName: 'STAFF', confidence: 'low' };
    } else if (years >= 5) {
      return { level: RoleLevel.LEAD, levelName: 'LEAD', confidence: 'low' };
    } else if (years >= 3) {
      return { level: RoleLevel.SENIOR, levelName: 'SENIOR', confidence: 'low' };
    } else if (years >= 1) {
      return { level: RoleLevel.MID, levelName: 'MID', confidence: 'low' };
    }
  }
  
  // Default to mid-level if no clear indication
  return { level: RoleLevel.MID, levelName: 'MID', confidence: 'low' };
}

/**
 * Determine career progression direction
 */
function getProgressionDirection(jobLevel: RoleLevel, candidateLevel: RoleLevel): {
  direction: 'step_up' | 'lateral' | 'step_down' | 'significant_step_down';
  levelDifference: number;
  description: string;
} {
  const difference = jobLevel - candidateLevel;
  
  if (difference >= 2) {
    return {
      direction: 'step_up',
      levelDifference: difference,
      description: `Significant step up: ${RoleLevel[candidateLevel]} → ${RoleLevel[jobLevel]} (${difference} levels)`,
    };
  } else if (difference === 1) {
    return {
      direction: 'step_up',
      levelDifference: difference,
      description: `Step up: ${RoleLevel[candidateLevel]} → ${RoleLevel[jobLevel]}`,
    };
  } else if (difference === 0) {
    return {
      direction: 'lateral',
      levelDifference: 0,
      description: `Lateral move: Both ${RoleLevel[jobLevel]} level`,
    };
  } else if (difference === -1) {
    return {
      direction: 'step_down',
      levelDifference: difference,
      description: `Step down: ${RoleLevel[candidateLevel]} → ${RoleLevel[jobLevel]}`,
    };
  } else {
    return {
      direction: 'significant_step_down',
      levelDifference: difference,
      description: `Significant step down: ${RoleLevel[candidateLevel]} → ${RoleLevel[jobLevel]} (${Math.abs(difference)} levels)`,
    };
  }
}

/**
 * Calculate growth potential score based on role levels
 */
function calculateGrowthScore(progression: ReturnType<typeof getProgressionDirection>): {
  score: number; // 0-100
  reasoning: string;
} {
  switch (progression.direction) {
    case 'step_up':
      if (progression.levelDifference >= 2) {
        return {
          score: 95,
          reasoning: `Excellent growth opportunity - significant step up (${progression.levelDifference} levels). This role offers substantial career advancement.`,
        };
      } else {
        return {
          score: 85,
          reasoning: `Good growth opportunity - step up to next level. Natural career progression.`,
        };
      }
    case 'lateral':
      return {
        score: 60,
        reasoning: `Lateral move - maintains current level. May offer different challenges or domain exposure.`,
      };
    case 'step_down':
      return {
        score: 30,
        reasoning: `Step down in seniority - may indicate career change, pivot, or work-life balance priority. Limited growth potential.`,
      };
    case 'significant_step_down':
      return {
        score: 10,
        reasoning: `Significant step down - major career regression. Likely a red flag unless intentional pivot.`,
      };
    default:
      return {
        score: 50,
        reasoning: `Unclear progression direction.`,
      };
  }
}

/**
 * Analyze role levels and career progression
 * This tool helps determine growth potential by comparing job level vs candidate level
 */
export function analyzeRoleLevel(
  jobTitle: string,
  jobDescription: string,
  cvContent: string
): {
  jobLevel: {
    level: RoleLevel;
    levelName: string;
    confidence: 'high' | 'medium' | 'low';
  };
  candidateLevel: {
    level: RoleLevel;
    levelName: string;
    confidence: 'high' | 'medium' | 'low';
  };
  progression: {
    direction: 'step_up' | 'lateral' | 'step_down' | 'significant_step_down';
    levelDifference: number;
    description: string;
  };
  growthScore: {
    score: number;
    reasoning: string;
  };
  recommendation: string;
} {
  // Extract levels
  const jobTitleLower = jobTitle.toLowerCase();
  const combinedJobText = `${jobTitle} ${jobDescription}`.substring(0, 1000); // Limit for performance
  const jobLevel = extractRoleLevel(combinedJobText);
  
  // Extract candidate level from CV (look for current position, most recent role)
  // Try to find current position first
  const currentPositionMatch = cvContent.match(/current\s+(position|role|title|job)[:\s]+([^\n]+)/i) ||
                                cvContent.match(/(?:^|\n)\s*([A-Z][^\n]{10,60}(?:engineer|designer|developer|manager|lead|senior|principal|architect)[^\n]{0,30})/i);
  
  let candidateText = cvContent.substring(0, 2000); // First 2000 chars usually contain current role
  if (currentPositionMatch) {
    candidateText = currentPositionMatch[0] + ' ' + candidateText;
  }
  
  const candidateLevel = extractRoleLevel(candidateText);
  
  // Determine progression
  const progression = getProgressionDirection(jobLevel.level, candidateLevel.level);
  
  // Calculate growth score
  const growthScore = calculateGrowthScore(progression);
  
  // Generate recommendation
  let recommendation: string;
  if (progression.direction === 'step_up' && progression.levelDifference >= 2) {
    recommendation = 'Excellent growth opportunity - significant advancement potential';
  } else if (progression.direction === 'step_up') {
    recommendation = 'Good growth opportunity - natural career progression';
  } else if (progression.direction === 'lateral') {
    recommendation = 'Lateral move - consider if offers new challenges or domain exposure';
  } else if (progression.direction === 'step_down') {
    recommendation = 'Step down - evaluate if intentional (career pivot, work-life balance)';
  } else {
    recommendation = 'Significant step down - likely not a good fit unless intentional career change';
  }
  
  return {
    jobLevel: {
      level: jobLevel.level,
      levelName: jobLevel.levelName,
      confidence: jobLevel.confidence,
    },
    candidateLevel: {
      level: candidateLevel.level,
      levelName: candidateLevel.levelName,
      confidence: candidateLevel.confidence,
    },
    progression,
    growthScore,
    recommendation,
  };
}

