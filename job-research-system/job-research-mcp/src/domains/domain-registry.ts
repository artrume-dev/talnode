/**
 * Domain Registry - Central definition of all professional domains
 * 
 * This registry defines domains that can be detected in job postings
 * and matched against user expertise. It's AI-ready - the same domains
 * can be used with keyword matching (current) or AI models (future).
 */

export interface Domain {
  id: string;
  name: string;
  category: 'design' | 'engineering' | 'content' | 'product' | 'data' | 'operations' | 'marketing';
  description: string;
  keywords: string[]; // What job postings in this domain mention
  cvKeywords: string[]; // What CVs in this domain mention
  transferableTo: string[]; // IDs of domains with transferable skills
  requiredCount: number; // Min keyword matches to detect this domain
}

/**
 * Complete domain registry for digital/tech domains
 * Easy to extend with new domains
 */
export const DOMAIN_REGISTRY: Record<string, Domain> = {
  // ============================================================================
  // DESIGN DOMAINS
  // ============================================================================
  
  'design-systems': {
    id: 'design-systems',
    name: 'Design Systems',
    category: 'design',
    description: 'Component libraries, design tokens, UI frameworks, design infrastructure',
    keywords: [
      'design system', 'design systems', 'component library', 'ui kit',
      'design tokens', 'design infrastructure', 'design platform',
      'pattern library', 'storybook', 'figma', 'design ops',
      'design system lead', 'design system engineer', 'tokens studio',
      'design tooling', 'component documentation'
    ],
    cvKeywords: [
      'design system', 'component library', 'design tokens', 'storybook',
      'figma', 'design ops', 'ui kit', 'pattern library', 'tokens studio',
      'design infrastructure'
    ],
    transferableTo: ['ux-design', 'frontend-engineering', 'product-design'],
    requiredCount: 2
  },
  
  'ux-design': {
    id: 'ux-design',
    name: 'UX/UI Design',
    category: 'design',
    description: 'User experience, interface design, interaction design, usability',
    keywords: [
      'ux designer', 'ui designer', 'user experience', 'user interface',
      'interaction design', 'visual design', 'product design',
      'wireframes', 'prototypes', 'user research', 'usability testing',
      'user flows', 'information architecture', 'ux research'
    ],
    cvKeywords: [
      'ux design', 'ui design', 'user experience', 'wireframes',
      'prototypes', 'figma', 'sketch', 'user research', 'usability',
      'interaction design'
    ],
    transferableTo: ['product-design', 'design-systems', 'product-management'],
    requiredCount: 2
  },

  'product-design': {
    id: 'product-design',
    name: 'Product Design',
    category: 'design',
    description: 'End-to-end product design, design strategy, design leadership',
    keywords: [
      'product designer', 'product design', 'design strategy',
      'design leadership', 'design thinking', 'design sprint',
      'product design lead', 'principal designer', 'design vision'
    ],
    cvKeywords: [
      'product design', 'product designer', 'design strategy',
      'design leadership', 'design thinking', 'end-to-end design'
    ],
    transferableTo: ['ux-design', 'product-management', 'design-systems'],
    requiredCount: 2
  },

  'graphic-design': {
    id: 'graphic-design',
    name: 'Graphic Design',
    category: 'design',
    description: 'Visual design, branding, illustrations, graphic design',
    keywords: [
      'graphic designer', 'graphic design', 'visual designer',
      'brand design', 'branding', 'illustrator', 'photoshop',
      'visual identity', 'logo design', 'print design'
    ],
    cvKeywords: [
      'graphic design', 'visual design', 'branding', 'illustrator',
      'photoshop', 'visual identity', 'brand design'
    ],
    transferableTo: ['ux-design', 'product-design'],
    requiredCount: 2
  },

  // ============================================================================
  // ENGINEERING DOMAINS
  // ============================================================================

  'frontend-engineering': {
    id: 'frontend-engineering',
    name: 'Frontend Engineering',
    category: 'engineering',
    description: 'Web development, React, Vue, Angular, JavaScript, TypeScript',
    keywords: [
      'frontend engineer', 'front-end engineer', 'web developer',
      'react', 'vue', 'angular', 'javascript', 'typescript',
      'html', 'css', 'webpack', 'next.js', 'frontend development',
      'web application', 'spa', 'single page application'
    ],
    cvKeywords: [
      'frontend', 'react', 'vue', 'angular', 'javascript', 'typescript',
      'web development', 'html', 'css', 'next.js', 'webpack'
    ],
    transferableTo: ['backend-engineering', 'fullstack-engineering', 'design-systems', 'mobile-engineering'],
    requiredCount: 2
  },

  'backend-engineering': {
    id: 'backend-engineering',
    name: 'Backend Engineering',
    category: 'engineering',
    description: 'Server-side development, APIs, databases, microservices',
    keywords: [
      'backend engineer', 'back-end engineer', 'backend developer',
      'api development', 'database design', 'server architecture',
      'node.js', 'python', 'java', 'go', 'rust', 'sql', 'microservices',
      'rest api', 'graphql', 'postgresql', 'mongodb'
    ],
    cvKeywords: [
      'backend', 'api', 'database', 'server', 'node.js', 'python',
      'sql', 'microservices', 'rest', 'graphql', 'backend development'
    ],
    transferableTo: ['fullstack-engineering', 'devops', 'infrastructure-engineering', 'frontend-engineering'],
    requiredCount: 2
  },

  'fullstack-engineering': {
    id: 'fullstack-engineering',
    name: 'Fullstack Engineering',
    category: 'engineering',
    description: 'Full-stack development, both frontend and backend',
    keywords: [
      'fullstack engineer', 'full-stack engineer', 'full stack developer',
      'fullstack developer', 'full stack', 'end-to-end development'
    ],
    cvKeywords: [
      'fullstack', 'full-stack', 'full stack', 'end-to-end development',
      'frontend and backend'
    ],
    transferableTo: ['frontend-engineering', 'backend-engineering', 'product-engineering'],
    requiredCount: 1
  },

  'mobile-engineering': {
    id: 'mobile-engineering',
    name: 'Mobile Engineering',
    category: 'engineering',
    description: 'iOS, Android, React Native, Flutter, mobile app development',
    keywords: [
      'mobile engineer', 'mobile developer', 'ios developer', 'android developer',
      'react native', 'flutter', 'swift', 'kotlin', 'mobile app',
      'ios engineer', 'android engineer'
    ],
    cvKeywords: [
      'mobile', 'ios', 'android', 'react native', 'flutter',
      'swift', 'kotlin', 'mobile development'
    ],
    transferableTo: ['frontend-engineering', 'fullstack-engineering'],
    requiredCount: 2
  },

  'ai-ml-engineering': {
    id: 'ai-ml-engineering',
    name: 'AI/ML Engineering',
    category: 'data',
    description: 'Machine learning, AI systems, LLMs, deep learning',
    keywords: [
      'machine learning engineer', 'ml engineer', 'ai engineer',
      'deep learning', 'neural networks', 'pytorch', 'tensorflow',
      'llm', 'large language model', 'ai research', 'ml research',
      'model training', 'ai systems', 'machine learning', 'mlops'
    ],
    cvKeywords: [
      'machine learning', 'ai', 'deep learning', 'pytorch', 'tensorflow',
      'llm', 'neural networks', 'ml engineer', 'ai research', 'ml research'
    ],
    transferableTo: ['data-science', 'research-scientist', 'backend-engineering'],
    requiredCount: 2
  },

  'devops': {
    id: 'devops',
    name: 'DevOps / SRE',
    category: 'operations',
    description: 'DevOps, site reliability, infrastructure automation, CI/CD',
    keywords: [
      'devops', 'site reliability engineer', 'sre', 'infrastructure engineer',
      'ci/cd', 'kubernetes', 'docker', 'aws', 'gcp', 'azure',
      'terraform', 'ansible', 'jenkins', 'cloud infrastructure'
    ],
    cvKeywords: [
      'devops', 'sre', 'infrastructure', 'kubernetes', 'docker',
      'ci/cd', 'terraform', 'aws', 'cloud', 'site reliability'
    ],
    transferableTo: ['infrastructure-engineering', 'backend-engineering', 'platform-engineering'],
    requiredCount: 2
  },

  'infrastructure-engineering': {
    id: 'infrastructure-engineering',
    name: 'Infrastructure Engineering',
    category: 'operations',
    description: 'Platform infrastructure, distributed systems, scalability',
    keywords: [
      'infrastructure engineer', 'platform engineer', 'systems engineer',
      'distributed systems', 'scalability', 'performance', 'reliability',
      'cloud infrastructure', 'platform infrastructure'
    ],
    cvKeywords: [
      'infrastructure', 'platform', 'distributed systems', 'scalability',
      'systems engineering', 'cloud infrastructure'
    ],
    transferableTo: ['devops', 'backend-engineering', 'platform-engineering'],
    requiredCount: 2
  },

  // ============================================================================
  // PRODUCT & MANAGEMENT DOMAINS
  // ============================================================================

  'product-management': {
    id: 'product-management',
    name: 'Product Management',
    category: 'product',
    description: 'Product strategy, roadmaps, feature planning, product leadership',
    keywords: [
      'product manager', 'product lead', 'technical product manager',
      'product strategy', 'product roadmap', 'feature planning',
      'user stories', 'agile', 'scrum', 'product owner',
      'product vision', 'product management'
    ],
    cvKeywords: [
      'product manager', 'product management', 'product strategy',
      'roadmap', 'agile', 'scrum', 'user stories', 'product lead'
    ],
    transferableTo: ['product-design', 'program-management', 'ux-design'],
    requiredCount: 2
  },

  'program-management': {
    id: 'program-management',
    name: 'Program/Project Management',
    category: 'operations',
    description: 'Program management, project management, execution, coordination',
    keywords: [
      'program manager', 'project manager', 'technical program manager',
      'tpm', 'project management', 'program management', 'project coordination',
      'cross-functional', 'stakeholder management'
    ],
    cvKeywords: [
      'program manager', 'project manager', 'project management',
      'program management', 'tpm', 'cross-functional'
    ],
    transferableTo: ['product-management', 'operations'],
    requiredCount: 2
  },

  // ============================================================================
  // DATA & ANALYTICS DOMAINS
  // ============================================================================

  'data-science': {
    id: 'data-science',
    name: 'Data Science',
    category: 'data',
    description: 'Data analysis, statistical modeling, data insights, analytics',
    keywords: [
      'data scientist', 'data science', 'data analysis', 'statistical modeling',
      'analytics', 'data insights', 'python', 'r', 'sql', 'data modeling',
      'data analytics', 'quantitative analysis'
    ],
    cvKeywords: [
      'data science', 'data scientist', 'data analysis', 'analytics',
      'statistical modeling', 'python', 'r', 'sql'
    ],
    transferableTo: ['ai-ml-engineering', 'data-engineering', 'research-scientist'],
    requiredCount: 2
  },

  'data-engineering': {
    id: 'data-engineering',
    name: 'Data Engineering',
    category: 'data',
    description: 'Data pipelines, ETL, data infrastructure, data warehousing',
    keywords: [
      'data engineer', 'data engineering', 'data pipeline', 'etl',
      'data warehouse', 'data infrastructure', 'spark', 'airflow',
      'kafka', 'data processing', 'big data'
    ],
    cvKeywords: [
      'data engineer', 'data engineering', 'data pipeline', 'etl',
      'spark', 'airflow', 'kafka', 'data warehouse'
    ],
    transferableTo: ['backend-engineering', 'data-science', 'infrastructure-engineering'],
    requiredCount: 2
  },

  // ============================================================================
  // CONTENT & CREATIVE DOMAINS
  // ============================================================================

  'content-strategy': {
    id: 'content-strategy',
    name: 'Content Strategy',
    category: 'content',
    description: 'Content planning, editorial, content design, UX writing',
    keywords: [
      'content strategist', 'content strategy', 'editorial', 'content design',
      'ux writing', 'content planning', 'content management',
      'content creation', 'copywriting', 'content ops', 'content designer'
    ],
    cvKeywords: [
      'content strategy', 'editorial', 'ux writing', 'copywriting',
      'content design', 'content creation', 'content strategist'
    ],
    transferableTo: ['ux-design', 'marketing', 'technical-writing'],
    requiredCount: 2
  },

  'technical-writing': {
    id: 'technical-writing',
    name: 'Technical Writing',
    category: 'content',
    description: 'Technical documentation, API docs, developer documentation',
    keywords: [
      'technical writer', 'technical writing', 'documentation',
      'api documentation', 'developer docs', 'technical documentation',
      'documentation engineer'
    ],
    cvKeywords: [
      'technical writing', 'technical writer', 'documentation',
      'api docs', 'developer documentation'
    ],
    transferableTo: ['content-strategy', 'developer-relations'],
    requiredCount: 2
  },

  // ============================================================================
  // MARKETING & GROWTH DOMAINS
  // ============================================================================

  'marketing': {
    id: 'marketing',
    name: 'Marketing',
    category: 'marketing',
    description: 'Digital marketing, growth marketing, marketing strategy',
    keywords: [
      'marketing', 'digital marketing', 'growth marketing', 'marketing strategy',
      'marketing manager', 'marketing lead', 'demand generation',
      'marketing campaigns', 'brand marketing'
    ],
    cvKeywords: [
      'marketing', 'digital marketing', 'growth marketing',
      'marketing strategy', 'marketing manager', 'demand generation'
    ],
    transferableTo: ['growth-engineering', 'social-media', 'content-strategy'],
    requiredCount: 2
  },

  'social-media': {
    id: 'social-media',
    name: 'Social Media Management',
    category: 'marketing',
    description: 'Social media strategy, community management, social content',
    keywords: [
      'social media manager', 'social media strategy', 'community manager',
      'social media marketing', 'social content', 'social media campaigns',
      'twitter', 'linkedin', 'instagram', 'tiktok', 'social engagement'
    ],
    cvKeywords: [
      'social media', 'community management', 'social media marketing',
      'social content', 'community engagement', 'social media manager'
    ],
    transferableTo: ['marketing', 'content-strategy', 'community-management'],
    requiredCount: 2
  },

  'growth-engineering': {
    id: 'growth-engineering',
    name: 'Growth Engineering',
    category: 'engineering',
    description: 'Growth engineering, experimentation, A/B testing, metrics',
    keywords: [
      'growth engineer', 'growth engineering', 'experimentation',
      'a/b testing', 'metrics', 'analytics', 'conversion optimization',
      'growth hacking'
    ],
    cvKeywords: [
      'growth engineer', 'growth engineering', 'experimentation',
      'a/b testing', 'metrics', 'conversion optimization'
    ],
    transferableTo: ['frontend-engineering', 'backend-engineering', 'marketing'],
    requiredCount: 2
  },

  // ============================================================================
  // SPECIALIZED DOMAINS
  // ============================================================================

  'security-engineering': {
    id: 'security-engineering',
    name: 'Security Engineering',
    category: 'engineering',
    description: 'Application security, security engineering, penetration testing',
    keywords: [
      'security engineer', 'security engineering', 'application security',
      'appsec', 'penetration testing', 'security audit', 'vulnerability',
      'security researcher', 'infosec'
    ],
    cvKeywords: [
      'security engineer', 'security engineering', 'application security',
      'penetration testing', 'security audit', 'appsec'
    ],
    transferableTo: ['backend-engineering', 'devops'],
    requiredCount: 2
  },

  'developer-relations': {
    id: 'developer-relations',
    name: 'Developer Relations',
    category: 'operations',
    description: 'Developer advocacy, developer experience, developer community',
    keywords: [
      'developer advocate', 'developer relations', 'devrel',
      'developer experience', 'developer community', 'developer evangelist',
      'technical evangelist'
    ],
    cvKeywords: [
      'developer advocate', 'developer relations', 'devrel',
      'developer experience', 'developer community'
    ],
    transferableTo: ['product-management', 'technical-writing', 'marketing'],
    requiredCount: 2
  },

  'research-scientist': {
    id: 'research-scientist',
    name: 'Research Scientist',
    category: 'data',
    description: 'Research, scientific research, ML research, AI research',
    keywords: [
      'research scientist', 'researcher', 'research engineer',
      'scientific research', 'ml research', 'ai research',
      'research lab', 'phd researcher'
    ],
    cvKeywords: [
      'research scientist', 'researcher', 'research',
      'phd', 'research lab', 'scientific research'
    ],
    transferableTo: ['ai-ml-engineering', 'data-science'],
    requiredCount: 2
  },

  // Keep the existing non-tech domains for completeness
  'security-grc': {
    id: 'security-grc',
    name: 'Security GRC/Compliance',
    category: 'operations',
    description: 'Governance, risk, compliance, security audit, compliance frameworks',
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
    transferableTo: ['security-engineering', 'operations'],
    requiredCount: 3
  },
};

/**
 * Domain categories with display metadata
 */
export const DOMAIN_CATEGORIES = {
  design: { name: 'Design', color: '#8B5CF6', icon: '🎨' },
  engineering: { name: 'Engineering', color: '#3B82F6', icon: '💻' },
  product: { name: 'Product', color: '#10B981', icon: '📦' },
  content: { name: 'Content', color: '#F59E0B', icon: '✍️' },
  data: { name: 'Data & AI', color: '#EF4444', icon: '📊' },
  marketing: { name: 'Marketing', color: '#EC4899', icon: '📢' },
  operations: { name: 'Operations', color: '#6366F1', icon: '⚙️' },
};

/**
 * Get a domain by ID
 */
export function getDomainById(id: string): Domain | undefined {
  return DOMAIN_REGISTRY[id];
}

/**
 * Get all domains in a specific category
 */
export function getDomainsByCategory(category: string): Domain[] {
  return Object.values(DOMAIN_REGISTRY).filter(d => d.category === category);
}

/**
 * Get all available domains
 */
export function getAllDomains(): Domain[] {
  return Object.values(DOMAIN_REGISTRY);
}

/**
 * Get domain names from IDs
 */
export function getDomainNames(domainIds: string[]): string[] {
  return domainIds
    .map(id => DOMAIN_REGISTRY[id]?.name)
    .filter((name): name is string => !!name);
}

/**
 * Check if two domains are transferable
 */
export function areDomainsTransferable(fromDomainId: string, toDomainId: string): boolean {
  const fromDomain = DOMAIN_REGISTRY[fromDomainId];
  return fromDomain ? fromDomain.transferableTo.includes(toDomainId) : false;
}

