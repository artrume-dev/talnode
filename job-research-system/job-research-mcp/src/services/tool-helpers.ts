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

