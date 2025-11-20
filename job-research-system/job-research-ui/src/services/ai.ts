import type { Job } from '../types';

interface CVVersion {
  type: 'conservative' | 'optimized' | 'stretch';
  alignment: number;
  changes: string[];
  content: string;
}

interface CVOptimizationResult {
  versions: CVVersion[];
  baseline_alignment: number;
  strong_matches: string[];
  gaps: string[];
}

const AI_PROVIDER = import.meta.env.VITE_AI_PROVIDER || 'openai';
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

class AIService {
  private async callOpenAI(prompt: string): Promise<string> {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in .env file.');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a CV optimization specialist. Your job is to analyze job postings and create tailored CV versions that maximize alignment while maintaining complete factual accuracy. Never invent experience or skills.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async callAnthropic(prompt: string): Promise<string> {
    if (!ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured. Please set VITE_ANTHROPIC_API_KEY in .env file.');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  async optimizeCV(job: Job, cvContent: string): Promise<CVOptimizationResult> {
    if (!cvContent || cvContent.trim().length === 0) {
      throw new Error('No CV content provided. Please upload a CV first.');
    }

    const prompt = `
You are a CV optimization specialist. Analyze this job posting and create 3 optimized CV versions.

## Job Details
**Company:** ${job.company}
**Title:** ${job.title}
**Description:** ${job.description || 'Not provided'}
**Requirements:** ${job.requirements || 'Not provided'}
**Current Alignment:** ${job.alignment_score || 'Unknown'}%

## Candidate's CV
${cvContent}

## Task
Create 3 CV versions with different optimization levels:

1. **Conservative (75% target):** Minimal changes, emphasize strongest alignments
2. **Optimized (85% target):** Strategic reframing and keyword optimization (RECOMMENDED)
3. **Stretch (90% target):** Maximum legitimate optimization, emphasize transferable skills

For each version, provide:
- Estimated alignment score
- List of 3-5 key changes made
- Full optimized CV content in markdown

Also identify:
- Strong matches between CV and job requirements
- Gaps that need addressing

Return your response in this exact JSON format:
\`\`\`json
{
  "baseline_alignment": 45,
  "strong_matches": [
    "Design systems experience",
    "Enterprise scale",
    "Cross-functional leadership"
  ],
  "gaps": [
    "Need to emphasize AI/ML experience more",
    "Product operations background not highlighted"
  ],
  "versions": [
    {
      "type": "conservative",
      "alignment": 75,
      "changes": [
        "Reordered skills to match job requirements",
        "Updated professional summary",
        "Highlighted relevant experience"
      ],
      "content": "# Full CV content here..."
    },
    {
      "type": "optimized",
      "alignment": 85,
      "changes": [
        "Strategic reframing of experience",
        "Enhanced keyword optimization",
        "Reordered achievements by relevance",
        "Updated skills section priority"
      ],
      "content": "# Full CV content here..."
    },
    {
      "type": "stretch",
      "alignment": 90,
      "changes": [
        "Maximum legitimate optimization",
        "Emphasized all transferable skills",
        "Added context for emerging skills",
        "Comprehensive keyword alignment"
      ],
      "content": "# Full CV content here..."
    }
  ]
}
\`\`\`

IMPORTANT:
- Never invent experience or projects
- Never fabricate metrics or achievements
- Only reframe and emphasize existing experience
- Maintain factual accuracy and authentic voice
- Focus on clarity and relevance
`;

    let response: string;

    try {
      if (AI_PROVIDER === 'anthropic') {
        response = await this.callAnthropic(prompt);
      } else {
        response = await this.callOpenAI(prompt);
      }

      // Extract JSON from response (might be wrapped in markdown code blocks)
      let jsonStr = response.trim();
      
      // Try to extract JSON from markdown code blocks
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      // Remove any leading/trailing whitespace
      jsonStr = jsonStr.trim();
      
      // Parse JSON
      const result = JSON.parse(jsonStr);
      return result;
    } catch (error) {
      console.error('CV optimization error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to optimize CV');
    }
  }
}

export const aiService = new AIService();
