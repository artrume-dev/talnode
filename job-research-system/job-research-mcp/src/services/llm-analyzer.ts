/**
 * LLM Job Analyzer Service
 *
 * Uses GPT-4o Mini to perform 5-category job fit analysis
 * Features:
 * - Few-shot learning with examples
 * - Training data collection for fine-tuning
 * - User feedback integration (RLHF)
 * - Database caching
 */

import Database from 'better-sqlite3';
import { JobDatabase } from '../db/schema.js';
import { extractSkills, calculateEmbeddingSimilarity, analyzeRoleLevel } from './tool-helpers.js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AIAnalysisResult {
  overall_score: number;
  overall_stars: number;
  recommendation: 'high' | 'medium' | 'low' | 'pass';

  role_alignment: CategoryAnalysis;
  technical_match: CategoryAnalysis;
  company_fit: CategoryAnalysis;
  growth_potential: CategoryAnalysis;
  practical_factors: CategoryAnalysis;

  strong_matches: string[];
  gaps: string[];
  red_flags: string[];
  application_strategy: string;
  talking_points: string[];
}

export interface CategoryAnalysis {
  score: number;        // 0-100
  stars: number;        // 1-5
  reasoning: string;
}

interface Job {
  id: number;
  job_id: string;
  company: string;
  title: string;
  description: string;
  requirements: string;
  tech_stack: string;
  location: string;
  remote: boolean;
}

interface CV {
  id: number;
  parsed_content: string;
}

// ============================================================================
// FEW-SHOT EXAMPLES FOR PROMPT
// ============================================================================

const FEW_SHOT_EXAMPLES = [
  {
    job: {
      title: "Senior Product Designer",
      company: "Figma",
      description: "Lead design systems for our collaborative design tool",
      skills: ["Design Systems", "Figma", "React", "TypeScript"]
    },
    cv_summary: "5 years building design systems at enterprise scale, React expertise",
    output: {
      overall_score: 92,
      overall_stars: 5,
      recommendation: "high",
      role_alignment: { score: 95, stars: 5, reasoning: "Perfect title and seniority match. Strong design systems leadership experience aligns with role scope." },
      technical_match: { score: 98, stars: 5, reasoning: "Excellent overlap - React, TypeScript, and design systems expertise directly match requirements." },
      company_fit: { score: 88, stars: 4, reasoning: "Design-forward culture at Figma matches candidate's focus on craft and systems thinking." },
      growth_potential: { score: 85, stars: 4, reasoning: "Opportunity to shape design systems at industry-leading product design tool." },
      practical_factors: { score: 90, stars: 5, reasoning: "Remote-friendly, competitive comp, strong team structure." },
      strong_matches: ["design systems", "react", "typescript", "leadership"],
      gaps: ["figma-specific features"],
      red_flags: [],
      application_strategy: "Quick apply - emphasize design systems leadership",
      talking_points: ["Scaled design systems to 50+ products", "Led cross-functional teams", "Built component libraries in React"]
    }
  },
  {
    job: {
      title: "Junior Frontend Developer",
      company: "Startup Inc",
      description: "Entry-level position building web apps",
      skills: ["JavaScript", "HTML", "CSS"]
    },
    cv_summary: "Senior Engineering Manager, 15 years experience, led teams of 50+",
    output: {
      overall_score: 25,
      overall_stars: 1,
      recommendation: "pass",
      role_alignment: { score: 10, stars: 1, reasoning: "Major seniority mismatch - senior manager applying for junior IC role. Scope dramatically underutilizes experience." },
      technical_match: { score: 40, stars: 2, reasoning: "Has technical skills but massively overqualified. Unlikely to find role challenging." },
      company_fit: { score: 30, stars: 2, reasoning: "Senior leader unlikely to thrive in junior IC role at early-stage startup." },
      growth_potential: { score: 5, stars: 1, reasoning: "Significant step backward in career trajectory. No leadership opportunities." },
      practical_factors: { score: 40, stars: 2, reasoning: "Likely compensation mismatch given seniority level." },
      strong_matches: ["javascript"],
      gaps: ["seniority alignment", "role scope"],
      red_flags: ["Extreme seniority mismatch - candidate is 10+ years overqualified"],
      application_strategy: "Skip this role - pursue senior engineering or management positions",
      talking_points: []
    }
  }
];

// ============================================================================
// LLM JOB ANALYZER CLASS
// ============================================================================

export interface ReasoningStep {
  type: 'info' | 'tool_call' | 'tool_result' | 'analysis' | 'complete';
  message: string;
  timestamp: number;
  data?: any;
}

export class LLMJobAnalyzer {
  private readonly PROMPT_VERSION = 'v2.0'; // Updated for tool calling
  private readonly MODEL = 'gpt-4o-mini'; // Updated model name (o4-mini -> gpt-4o-mini for tool calling support)
  private db: Database.Database;
  private progressCallback?: (step: ReasoningStep) => void;

  constructor(
    private jobDatabase: JobDatabase,
    private apiKey: string
  ) {
    this.db = jobDatabase.db;
  }

  /**
   * Set progress callback for real-time reasoning steps
   */
  setProgressCallback(callback: (step: ReasoningStep) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Emit progress step
   */
  private emitProgress(type: ReasoningStep['type'], message: string, data?: any): void {
    if (this.progressCallback) {
      this.progressCallback({
        type,
        message,
        timestamp: Date.now(),
        data,
      });
    }
  }

  /**
   * Main analysis method - orchestrates the full workflow
   */
  async analyzeJob(
    jobId: number,
    cvId: number,
    userId: number = 1
  ): Promise<AIAnalysisResult> {
    const startTime = Date.now();

    // 1. Check cache first
    this.emitProgress('info', 'Checking for cached analysis...');
    const cached = this.getCachedAnalysis(jobId, cvId, userId);
    if (cached) {
      console.log(`✅ Returning cached analysis for job ${jobId}`);
      this.emitProgress('info', 'Found cached analysis, returning results');
      return cached;
    }

    // 2. Get job and CV content
    this.emitProgress('info', 'Loading job and CV data...');
    const job = this.getJob(jobId);
    const cv = this.getCV(cvId);

    if (!job || !cv) {
      throw new Error(`Job ${jobId} or CV ${cvId} not found`);
    }

    this.emitProgress('info', `Analyzing: ${job.title} at ${job.company}`);

    // 🔍 DEBUG LOGGING - What data is being analyzed?
    console.log('\n========================================');
    console.log('🔍 AI ANALYSIS DEBUG - DATA BEING SENT TO GPT-4o MINI');
    console.log('========================================');
    console.log(`📋 Job ID: ${jobId}`);
    console.log(`📋 CV ID: ${cvId}`);
    console.log(`📋 User ID: ${userId}`);
    console.log('\n--- JOB DATA ---');
    console.log(`Company: ${job.company}`);
    console.log(`Title: ${job.title}`);
    console.log(`Description (first 200 chars): ${(job.description || 'N/A').substring(0, 200)}...`);
    console.log(`Tech Stack: ${job.tech_stack || 'N/A'}`);
    console.log('\n--- CV DATA ---');
    console.log(`CV parsed_content (first 500 chars):\n${cv.parsed_content.substring(0, 500)}...`);
    console.log(`CV parsed_content length: ${cv.parsed_content.length} characters`);
    console.log('========================================\n');

    // 3. Build prompt with few-shot examples
    this.emitProgress('info', 'Building analysis prompt with few-shot examples...');
    const prompt = this.buildAnalysisPrompt(job, cv.parsed_content);

    // 4. Call GPT-4o Mini with tool calling support
    this.emitProgress('info', 'Initializing GPT-4o Mini with tool calling...');
    let result: AIAnalysisResult;
    let responseTimeMs: number;
    let tokenCountInput: number;
    let tokenCountOutput: number;
    let jsonParseSuccess = false;

    try {
      const apiResponse = await this.callOpenAIWithTools(prompt, job, cv.parsed_content);
      responseTimeMs = Date.now() - startTime;

      // Parse JSON response
      this.emitProgress('info', 'Parsing LLM response...');
      const content = apiResponse.choices[0].message.content;

      // Try to parse JSON with better error handling
      try {
        result = JSON.parse(content);
        jsonParseSuccess = true;
      } catch (parseError) {
        // Log the content that failed to parse for debugging
        console.error('❌ JSON Parse Error:', parseError);
        console.error('📄 Content that failed to parse (first 2000 chars):');
        console.error(content.substring(0, 2000));
        console.error('📄 Content around position 1110:');
        console.error(content.substring(1050, 1200));

        // Try to extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          console.log('⚠️ Found JSON in markdown block, extracting...');
          result = JSON.parse(jsonMatch[1]);
          jsonParseSuccess = true;
        } else {
          // Re-throw with more context
          throw new Error(`JSON parse failed at position 1110. This may be due to unescaped quotes in the AI response. Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }
      }

      // Estimate token counts (rough approximation)
      tokenCountInput = Math.ceil(prompt.length / 4);
      tokenCountOutput = Math.ceil(content.length / 4);

      this.emitProgress('analysis', 'Analysis complete!', {
        overall_score: result.overall_score,
        recommendation: result.recommendation,
      });

      console.log(`✅ LLM analysis completed in ${responseTimeMs}ms`);
      console.log(`📊 Tokens: ${tokenCountInput} input, ${tokenCountOutput} output`);

    } catch (error) {
      console.error('❌ LLM analysis failed:', error);
      throw new Error(`Failed to analyze job: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 5. Store analysis in cache
    this.emitProgress('info', 'Storing analysis results...');
    const analysisId = this.storeAnalysis(jobId, cvId, userId, result);

    // 6. Store training data for future fine-tuning
    this.emitProgress('info', 'Saving training data for future improvements...');
    this.storeTrainingData({
      analysisId,
      jobId,
      cvId,
      userId,
      job,
      cvContent: cv.parsed_content,
      modelOutput: JSON.stringify(result),
      jsonParseSuccess,
      responseTimeMs,
      tokenCountInput,
      tokenCountOutput,
    });

    this.emitProgress('complete', 'Analysis complete and saved!', { analysisId });
    return result;
  }

  /**
   * Build analysis prompt with few-shot examples
   */
  private buildAnalysisPrompt(job: Job, cvContent: string): string {
    // Format few-shot examples
    const examplesText = FEW_SHOT_EXAMPLES.map((example, idx) => `
## Example ${idx + 1}: ${example.output.recommendation.toUpperCase()} PRIORITY

### Job
- Title: ${example.job.title}
- Company: ${example.job.company}
- Description: ${example.job.description}
- Skills: ${example.job.skills.join(', ')}

### CV Summary
${example.cv_summary}

### Analysis Output
\`\`\`json
${JSON.stringify(example.output, null, 2)}
\`\`\`
`).join('\n---\n');

    return `You are a job analysis specialist. Analyze job fit using a 5-category framework with weighted scoring.

${examplesText}

---

## Now analyze THIS job:

### Job Details
Company: ${job.company}
Title: ${job.title}
Description: ${job.description || 'N/A'}
Requirements: ${job.requirements || 'N/A'}
Tech Stack: ${job.tech_stack || 'N/A'}
Location: ${job.location || 'N/A'}
Remote: ${job.remote ? 'Yes' : 'No'}

### Candidate CV
${cvContent}

## Analysis Framework

**IMPORTANT: Use the provided tools for consistent, data-driven scoring:**

1. **ALWAYS call extract_skills** on both job requirements and CV content before scoring technical_match
2. **Use calculate_similarity** for objective alignment scores - use the returned score directly in your calculations
3. **Combine tool outputs with your reasoning** to provide comprehensive analysis

Evaluate across these 5 dimensions:

### 1. Role Alignment (30% weight)
- **Use calculate_similarity** with comparison_type="role_alignment" to get objective score
- Title match with experience level
- Scope appropriateness (not too junior, not too senior)
- Leadership vs IC work ratio
- Cross-functional requirements

### 2. Technical Match (25% weight)
- **MUST call extract_skills** on job requirements and CV content first
- Compare extracted skill lists to determine overlap
- Required tech stack vs candidate skills (use extracted skills)
- Domain expertise alignment
- Tool proficiency

### 3. Company Fit (20% weight)
- **Use calculate_similarity** with comparison_type="company_fit" for objective score
- Culture alignment
- Company stage/size preference
- Product type match
- Remote/hybrid setup

### 4. Growth Potential (15% weight)
- **ALWAYS call analyze_role_level** first to get structured career progression data
- Use the returned growthScore (0-100) as a baseline, then adjust based on:
  - Learning opportunities mentioned in job description
  - Leadership potential and scope
  - Impact scope and visibility
  - Company growth stage (startup vs enterprise)
- Combine role level analysis with calculate_similarity for comprehensive scoring

### 5. Practical Factors (10% weight)
- Location/remote flexibility
- Compensation indicators
- Team structure
- Timeline fit

## Output Format

Return ONLY valid JSON (no markdown, no code blocks, no explanations):

{
  "overall_score": 82,
  "overall_stars": 4,
  "recommendation": "high",

  "role_alignment": {
    "score": 85,
    "stars": 4,
    "reasoning": "Strong match - title aligns with senior-level experience..."
  },
  "technical_match": {
    "score": 90,
    "stars": 5,
    "reasoning": "Excellent tech stack overlap..."
  },
  "company_fit": {
    "score": 75,
    "stars": 4,
    "reasoning": "Good cultural indicators..."
  },
  "growth_potential": {
    "score": 80,
    "stars": 4,
    "reasoning": "Significant opportunity..."
  },
  "practical_factors": {
    "score": 70,
    "stars": 4,
    "reasoning": "Remote-friendly..."
  },

  "strong_matches": ["skill1", "skill2"],
  "gaps": ["gap1"],
  "red_flags": [],
  "application_strategy": "Quick apply with emphasis on X",
  "talking_points": ["Point 1", "Point 2", "Point 3"]
}

**Calculation Rules:**
- overall_score = (role_alignment.score * 0.30) + (technical_match.score * 0.25) + (company_fit.score * 0.20) + (growth_potential.score * 0.15) + (practical_factors.score * 0.10)
- Star ratings: 5★ (90-100), 4★ (75-89), 3★ (60-74), 2★ (40-59), 1★ (0-39)
- Recommendation: "high" (≥75), "medium" (50-74), "low" (40-49), "pass" (<40)
- Red flags: List serious concerns (seniority mismatch, unrealistic requirements, culture red flags)
- Be honest and specific in reasoning - help candidate make informed decisions`;
  }

  /**
   * Call OpenAI API with tool calling support
   */
  private async callOpenAIWithTools(
    prompt: string,
    job: Job,
    cvContent: string
  ): Promise<any> {
    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'extract_skills',
          description: 'Extract skills deterministically from text. Use this to get structured skill lists from job descriptions and CV content. Returns normalized skill names and categories.',
          parameters: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The text to extract skills from (job description, requirements, or CV content)',
              },
            },
            required: ['text'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'calculate_similarity',
          description: 'Calculate semantic similarity between two texts using embeddings. Use this for data-driven alignment scoring. Returns a numerical similarity score (0-100) that you should use directly in your scoring calculations.',
          parameters: {
            type: 'object',
            properties: {
              text1: {
                type: 'string',
                description: 'First text to compare (e.g., job description or requirement)',
              },
              text2: {
                type: 'string',
                description: 'Second text to compare (e.g., CV content or relevant experience)',
              },
              comparison_type: {
                type: 'string',
                enum: ['role_alignment', 'technical_match', 'company_fit', 'growth_potential'],
                description: 'Type of comparison to help interpret the similarity score',
              },
            },
            required: ['text1', 'text2', 'comparison_type'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'analyze_role_level',
          description: 'Analyze role levels and career progression. Use this to determine growth potential by comparing the job level vs candidate level. Returns structured data about career progression direction (step up, lateral, step down) and growth score. ALWAYS use this tool before scoring growth_potential category.',
          parameters: {
            type: 'object',
            properties: {
              job_title: {
                type: 'string',
                description: 'The job title (e.g., "Senior Software Engineer", "Lead Designer")',
              },
              job_description: {
                type: 'string',
                description: 'The full job description text',
              },
              cv_content: {
                type: 'string',
                description: 'The candidate CV content (first 2000 characters is usually sufficient)',
              },
            },
            required: ['job_title', 'job_description', 'cv_content'],
          },
        },
      },
    ];

    const messages: any[] = [
      {
        role: 'system',
        content: `You are a job analysis specialist with access to powerful tools for consistent, data-driven scoring.

## Your Role
Analyze job fit using a 5-category weighted framework. Your goal is to provide honest, specific, and actionable insights to help candidates make informed career decisions.

## Available Tools (USE THEM!)

1. **extract_skills(text)** - Deterministically extracts skills from text
   - ALWAYS call this on both job requirements AND CV content before scoring technical_match
   - Returns normalized skill lists with categories
   - Use the extracted skills directly in your analysis

2. **calculate_similarity(text1, text2, comparison_type)** - Calculates semantic similarity using embeddings
   - Use for objective alignment scoring: role_alignment, technical_match, company_fit, growth_potential
   - Returns numerical score (0-100) - USE THIS SCORE DIRECTLY in your calculations
   - Provides interpretation (very high/high/moderate/low/very low)

3. **analyze_role_level(job_title, job_description, cv_content)** - Analyzes career progression
   - ALWAYS call this before scoring growth_potential category
   - Returns structured progression data (step_up, lateral, step_down)
   - Returns baseline growth score (0-100) - use as starting point, then adjust based on other factors
   - Helps identify red flags (overqualified candidates, career regression)

## Tool Usage Rules

- **Technical Match:** MUST call extract_skills first, then use calculate_similarity
- **Role Alignment:** Use calculate_similarity with comparison_type="role_alignment"
- **Company Fit:** Use calculate_similarity with comparison_type="company_fit"
- **Growth Potential:** MUST call analyze_role_level first, then use calculate_similarity, combine both for final score
- **Practical Factors:** No tools needed, use your reasoning

## Output Requirements

- Return ONLY valid JSON (no markdown, no code blocks, no explanations)
- Match the exact structure specified in the user prompt
- Use tool outputs directly in your scoring calculations
- Be honest and specific in reasoning - help candidates make informed decisions
- Flag red flags clearly (seniority mismatch, unrealistic requirements, culture concerns)`
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    // Make initial API call with tools
    let response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.MODEL,
        messages,
        tools,
        tool_choice: 'auto', // Let the model decide when to use tools
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    let apiResponse = await response.json();
    let message = apiResponse.choices[0].message;

      // Handle tool calls - execute tools and send results back
      let toolCallCount = 0;
      const maxToolCalls = 10; // Prevent infinite loops

      while (message.tool_calls && toolCallCount < maxToolCalls) {
        toolCallCount++;
        console.log(`🔧 Processing ${message.tool_calls.length} tool call(s)...`);
        this.emitProgress('info', `Processing ${message.tool_calls.length} tool call(s)...`);

        // Add assistant message with tool calls
        messages.push({
          role: 'assistant',
          content: message.content || null,
          tool_calls: message.tool_calls,
        });

        // Execute each tool call
        for (const toolCall of message.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);

          this.emitProgress('tool_call', `Calling ${toolName}...`, {
            tool: toolName,
            args: toolArgs,
          });

          let toolResult: any;

          try {
            if (toolName === 'extract_skills') {
              const extracted = extractSkills(toolArgs.text);
              toolResult = {
                skills: extracted.skills,
                skillCategories: extracted.skillCategories,
                confidence: extracted.confidence,
              };
              console.log(`✅ Extracted ${extracted.skills.length} skills from text`);
              this.emitProgress('tool_result', `Extracted ${extracted.skills.length} skills`, {
                tool: toolName,
                skills: extracted.skills,
                categories: extracted.skillCategories,
                confidence: extracted.confidence,
              });
            } else if (toolName === 'calculate_similarity') {
              this.emitProgress('info', `Calculating embedding similarity for ${toolArgs.comparison_type}...`);
              const similarity = await calculateEmbeddingSimilarity(
                toolArgs.text1,
                toolArgs.text2,
                this.apiKey
              );
              toolResult = {
                similarity: similarity.similarity,
                score: similarity.score,
                interpretation: similarity.interpretation,
                comparison_type: toolArgs.comparison_type,
              };
              console.log(`✅ Calculated similarity: ${similarity.score.toFixed(1)}% (${toolArgs.comparison_type})`);
              this.emitProgress('tool_result', `Similarity score: ${similarity.score.toFixed(1)}% (${similarity.interpretation})`, {
                tool: toolName,
                score: similarity.score,
                similarity: similarity.similarity,
                interpretation: similarity.interpretation,
                comparison_type: toolArgs.comparison_type,
              });
            } else if (toolName === 'analyze_role_level') {
              this.emitProgress('info', 'Analyzing role levels and career progression...');
              const roleAnalysis = analyzeRoleLevel(
                toolArgs.job_title,
                toolArgs.job_description,
                toolArgs.cv_content
              );
              toolResult = {
                jobLevel: roleAnalysis.jobLevel.levelName,
                candidateLevel: roleAnalysis.candidateLevel.levelName,
                progression: roleAnalysis.progression.direction,
                progressionDescription: roleAnalysis.progression.description,
                growthScore: roleAnalysis.growthScore.score,
                growthReasoning: roleAnalysis.growthScore.reasoning,
                recommendation: roleAnalysis.recommendation,
              };
              console.log(`✅ Role level analysis: ${roleAnalysis.candidateLevel.levelName} → ${roleAnalysis.jobLevel.levelName} (${roleAnalysis.progression.direction})`);
              this.emitProgress('tool_result', `Role progression: ${roleAnalysis.progression.description}`, {
                tool: toolName,
                jobLevel: roleAnalysis.jobLevel.levelName,
                candidateLevel: roleAnalysis.candidateLevel.levelName,
                progression: roleAnalysis.progression.direction,
                growthScore: roleAnalysis.growthScore.score,
              });
            } else {
              toolResult = { error: `Unknown tool: ${toolName}` };
            }
          } catch (error) {
            console.error(`❌ Tool execution error for ${toolName}:`, error);
            this.emitProgress('tool_result', `Error executing ${toolName}`, {
              tool: toolName,
              error: error instanceof Error ? error.message : String(error),
            });
            toolResult = {
              error: error instanceof Error ? error.message : String(error),
            };
          }

        // Add tool result to messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Make another API call with tool results
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.MODEL,
          messages,
          tools,
          tool_choice: 'auto',
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      apiResponse = await response.json();
      message = apiResponse.choices[0].message;
    }

    if (toolCallCount >= maxToolCalls) {
      console.warn(`⚠️ Reached maximum tool call limit (${maxToolCalls})`);
    }

    // Return final response
    return apiResponse;
  }

  /**
   * Legacy OpenAI API call (kept for backward compatibility)
   */
  private async callOpenAI(prompt: string): Promise<any> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a job analysis specialist. Return only valid JSON matching the exact structure specified. Be honest and specific in your analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get cached analysis from database
   */
  private getCachedAnalysis(
    jobId: number,
    cvId: number,
    userId: number
  ): AIAnalysisResult | null {
    const cached = this.db.prepare(`
      SELECT * FROM job_ai_analysis
      WHERE job_id = ? AND cv_id = ? AND user_id = ?
    `).get(jobId, cvId, userId) as any;

    if (!cached) return null;

    // Reconstruct result object
    return {
      overall_score: cached.overall_score,
      overall_stars: cached.overall_stars,
      recommendation: cached.recommendation,
      role_alignment: {
        score: cached.role_alignment_score,
        stars: cached.role_alignment_stars,
        reasoning: cached.role_alignment_reasoning,
      },
      technical_match: {
        score: cached.technical_match_score,
        stars: cached.technical_match_stars,
        reasoning: cached.technical_match_reasoning,
      },
      company_fit: {
        score: cached.company_fit_score,
        stars: cached.company_fit_stars,
        reasoning: cached.company_fit_reasoning,
      },
      growth_potential: {
        score: cached.growth_potential_score,
        stars: cached.growth_potential_stars,
        reasoning: cached.growth_potential_reasoning,
      },
      practical_factors: {
        score: cached.practical_factors_score,
        stars: cached.practical_factors_stars,
        reasoning: cached.practical_factors_reasoning,
      },
      strong_matches: JSON.parse(cached.strong_matches || '[]'),
      gaps: JSON.parse(cached.gaps || '[]'),
      red_flags: JSON.parse(cached.red_flags || '[]'),
      application_strategy: cached.application_strategy,
      talking_points: JSON.parse(cached.talking_points || '[]'),
    };
  }

  /**
   * Store analysis in database
   */
  private storeAnalysis(
    jobId: number,
    cvId: number,
    userId: number,
    result: AIAnalysisResult
  ): number {
    const stmt = this.db.prepare(`
      INSERT INTO job_ai_analysis (
        job_id, cv_id, user_id,
        overall_score, overall_stars, recommendation,
        role_alignment_score, role_alignment_stars, role_alignment_reasoning,
        technical_match_score, technical_match_stars, technical_match_reasoning,
        company_fit_score, company_fit_stars, company_fit_reasoning,
        growth_potential_score, growth_potential_stars, growth_potential_reasoning,
        practical_factors_score, practical_factors_stars, practical_factors_reasoning,
        strong_matches, gaps, red_flags, application_strategy, talking_points,
        model_used
      ) VALUES (
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?
      )
      ON CONFLICT(job_id, cv_id, user_id) DO UPDATE SET
        overall_score = excluded.overall_score,
        overall_stars = excluded.overall_stars,
        recommendation = excluded.recommendation,
        role_alignment_score = excluded.role_alignment_score,
        role_alignment_stars = excluded.role_alignment_stars,
        role_alignment_reasoning = excluded.role_alignment_reasoning,
        technical_match_score = excluded.technical_match_score,
        technical_match_stars = excluded.technical_match_stars,
        technical_match_reasoning = excluded.technical_match_reasoning,
        company_fit_score = excluded.company_fit_score,
        company_fit_stars = excluded.company_fit_stars,
        company_fit_reasoning = excluded.company_fit_reasoning,
        growth_potential_score = excluded.growth_potential_score,
        growth_potential_stars = excluded.growth_potential_stars,
        growth_potential_reasoning = excluded.growth_potential_reasoning,
        practical_factors_score = excluded.practical_factors_score,
        practical_factors_stars = excluded.practical_factors_stars,
        practical_factors_reasoning = excluded.practical_factors_reasoning,
        strong_matches = excluded.strong_matches,
        gaps = excluded.gaps,
        red_flags = excluded.red_flags,
        application_strategy = excluded.application_strategy,
        talking_points = excluded.talking_points,
        analyzed_at = CURRENT_TIMESTAMP
    `);

    const info = stmt.run(
      jobId, cvId, userId,
      result.overall_score, result.overall_stars, result.recommendation,
      result.role_alignment.score, result.role_alignment.stars, result.role_alignment.reasoning,
      result.technical_match.score, result.technical_match.stars, result.technical_match.reasoning,
      result.company_fit.score, result.company_fit.stars, result.company_fit.reasoning,
      result.growth_potential.score, result.growth_potential.stars, result.growth_potential.reasoning,
      result.practical_factors.score, result.practical_factors.stars, result.practical_factors.reasoning,
      JSON.stringify(result.strong_matches),
      JSON.stringify(result.gaps),
      JSON.stringify(result.red_flags),
      result.application_strategy,
      JSON.stringify(result.talking_points),
      this.MODEL
    );

    return info.lastInsertRowid as number;
  }

  /**
   * Store training data for fine-tuning
   */
  private storeTrainingData(data: {
    analysisId: number;
    jobId: number;
    cvId: number;
    userId: number;
    job: Job;
    cvContent: string;
    modelOutput: string;
    jsonParseSuccess: boolean;
    responseTimeMs: number;
    tokenCountInput: number;
    tokenCountOutput: number;
  }): void {
    this.db.prepare(`
      INSERT INTO ai_training_data (
        analysis_id, job_id, cv_id, user_id,
        job_title, job_company, job_description, job_requirements, job_tech_stack,
        cv_content, model_output, model_version, prompt_version,
        json_parse_success, response_time_ms, token_count_input, token_count_output
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.analysisId, data.jobId, data.cvId, data.userId,
      data.job.title, data.job.company, data.job.description, data.job.requirements, data.job.tech_stack,
      data.cvContent, data.modelOutput, this.MODEL, this.PROMPT_VERSION,
      data.jsonParseSuccess ? 1 : 0, data.responseTimeMs, data.tokenCountInput, data.tokenCountOutput
    );

    console.log(`📝 Stored training data for analysis ${data.analysisId}`);
  }

  /**
   * Record user feedback for RLHF
   */
  recordUserFeedback(
    analysisId: number,
    feedback: {
      rating?: number;        // 1-5 stars
      wasHelpful?: boolean;  // thumbs up/down
      feedbackText?: string;
      actualOutcome?: 'applied' | 'rejected' | 'interviewed' | 'offered';
      outcomeNotes?: string;
    }
  ): void {
    const updates: string[] = [];
    const values: any[] = [];

    if (feedback.rating !== undefined) {
      updates.push('user_rating = ?');
      values.push(feedback.rating);
    }
    if (feedback.wasHelpful !== undefined) {
      updates.push('was_helpful = ?');
      values.push(feedback.wasHelpful ? 1 : 0);
    }
    if (feedback.feedbackText) {
      updates.push('user_feedback = ?');
      values.push(feedback.feedbackText);
    }
    if (feedback.actualOutcome) {
      updates.push('actual_outcome = ?');
      values.push(feedback.actualOutcome);
    }
    if (feedback.outcomeNotes) {
      updates.push('outcome_notes = ?');
      values.push(feedback.outcomeNotes);
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(analysisId);

      this.db.prepare(`
        UPDATE ai_training_data
        SET ${updates.join(', ')}
        WHERE analysis_id = ?
      `).run(...values);

      console.log(`👍 Recorded user feedback for analysis ${analysisId}`);
    }
  }

  /**
   * Get job from database
   */
  private getJob(jobId: number): Job | null {
    return this.db.prepare(`
      SELECT * FROM jobs WHERE id = ?
    `).get(jobId) as Job | null;
  }

  /**
   * Get CV from database
   */
  private getCV(cvId: number): CV | null {
    return this.db.prepare(`
      SELECT * FROM cv_documents WHERE id = ?
    `).get(cvId) as CV | null;
  }

  /**
   * Export training data in OpenAI fine-tuning format (JSONL)
   */
  exportTrainingDataForFineTuning(minRating: number = 4): string {
    const data = this.db.prepare(`
      SELECT
        job_title, job_company, job_description, job_requirements, job_tech_stack,
        cv_content, model_output
      FROM ai_training_data
      WHERE user_rating >= ? AND json_parse_success = 1
      ORDER BY user_rating DESC, created_at DESC
      LIMIT 1000
    `).all(minRating) as any[];

    // Convert to OpenAI fine-tuning format
    const jsonLines = data.map(row => {
      const prompt = this.buildAnalysisPrompt({
        id: 0,
        job_id: '',
        company: row.job_company,
        title: row.job_title,
        description: row.job_description,
        requirements: row.job_requirements,
        tech_stack: row.job_tech_stack,
        location: '',
        remote: false,
      }, row.cv_content);

      return JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a job analysis specialist. Return only valid JSON.' },
          { role: 'user', content: prompt },
          { role: 'assistant', content: row.model_output }
        ]
      });
    }).join('\n');

    console.log(`📤 Exported ${data.length} training examples (rating ≥${minRating})`);
    return jsonLines;
  }
}
