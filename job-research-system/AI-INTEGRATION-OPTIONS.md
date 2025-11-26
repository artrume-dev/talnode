# AI Integration Options for Job Research System

**Created:** November 24, 2025  
**Status:** Research & Planning Document

---

## Table of Contents

1. [Current AI Usage in Your App](#current-ai-usage-in-your-app)
2. [Job Analysis Problem](#job-analysis-problem)
3. [Open-Source AI Solutions](#open-source-ai-solutions)
4. [Training & Fine-Tuning](#training--fine-tuning)
5. [Architecture Comparisons](#architecture-comparisons)
6. [Cost Analysis](#cost-analysis)
7. [Recommendations](#recommendations)
8. [Implementation Paths](#implementation-paths)

---

## Current AI Usage in Your App

### OpenAI/Anthropic is ONLY Used for ONE Feature

**Feature:** CV Optimizer (Frontend)

**Location:** 
- `job-research-ui/src/services/ai.ts`
- `job-research-ui/src/components/CVOptimizer.tsx`

**What it Does:**
Takes your uploaded CV and a specific job posting, then generates 3 optimized CV versions:

1. **Conservative** (75% target) - Minimal changes, emphasize strongest alignments
2. **Optimized** (85% target) - Strategic reframing and keyword optimization (RECOMMENDED)
3. **Stretch** (90% target) - Maximum legitimate optimization, emphasize transferable skills

**Example:**
```
Input:
- Your CV: "Design System Lead"
- Job: "Senior Product Designer at Anthropic"

Output:
- Conservative CV: Emphasizes existing design system work
- Optimized CV: Reframes leadership as "product-focused design"
- Stretch CV: Highlights AI integration in design tools
```

**Cost:** ~$0.01-0.03 per CV optimization (GPT-4 Turbo)

**API Keys Required:**
```bash
# .env file in job-research-ui/
VITE_AI_PROVIDER=openai  # or "anthropic"
VITE_OPENAI_API_KEY=sk-proj-xxxxx
VITE_ANTHROPIC_API_KEY=sk-ant-xxxxx
```

**Supported Providers:**
- **OpenAI** (GPT-4 Turbo) - Default, reliable, fast
- **Anthropic** (Claude Sonnet) - Better at nuanced text reframing

---

### Where CV Optimizer is Used

#### 1. Job Cards - "Optimize CV" Button
Each job card in the job list has an "Optimize CV" button that opens the optimizer modal.

#### 2. CV Optimizer Modal
- Displays your current CV
- Shows the job description
- Click "Generate Optimized Versions"
- AI analyzes and creates 3 versions
- Download or save any version

#### 3. Built-in Safety Features

The AI service includes **fabrication detection** to maintain professional integrity:

**Protections:**
- Cannot change your job title domain (e.g., Designer → Recruiter)
- Cannot invent experience, projects, or achievements
- Cannot fabricate metrics or statistics
- Cannot claim skills/tools not in base CV
- Only reframes existing experience

**Example Rejection:**
```
🚫 CV OPTIMIZATION REJECTED - FABRICATION DETECTED

The AI attempted to fabricate content:
⚠️ DOMAIN SWITCH DETECTED: Changed from "designer" to "recruiter"
⚠️ FABRICATED METRIC: "hired 50 people" - not found in base CV

❌ This optimization has been blocked to protect integrity.
```

---

## Job Analysis Problem

### Current System: Keyword-Based Heuristics (NOT AI)

**Current Implementation:**
- `job-research-mcp/src/tools/analyze.ts`
- Uses hardcoded keyword dictionaries
- Domain mismatch detection for only 6 domains:
  1. Medicine/Healthcare
  2. Law/Legal
  3. Finance/Investment Banking
  4. Recruiting
  5. Sales
  6. Security/GRC (recently added)

**Limitations:**
- Cannot detect novel domain mismatches
- Example failure: Estate Agency PM → Digital Product Manager (scores 65% but should be 25%)
- Misses contextual understanding of transferability
- Not scalable to thousands of job types
- Requires manual updates for each new domain

**Why This is a Problem:**
You identified that the system gave incorrect high scores for fundamentally mismatched roles like:
- Design System Lead → Security GRC Specialist (should be 15-25%, was likely 40-70%)
- The algorithm couldn't understand that these are completely different career paths

---

### Proposed Solution: AI-Powered Dynamic Analysis

**File Created:** `job-research-mcp/src/tools/ai-analyze.ts`

**What it Would Do:**
- Dynamic domain detection for ANY domain (not just 6)
- Contextual understanding of job requirements
- Transferability analysis (which skills actually transfer)
- Natural language reasoning about fit
- Handles edge cases automatically

**Example Improvement:**

**Current Heuristic Analysis:**
```
Estate Agent PM → Digital Product Manager

Score: 65%
Reasoning: "Matches keywords: project management, stakeholder, planning"
Strong Matches: ["project management", "stakeholder management"]
Gaps: ["agile", "scrum"]
```
❌ Misses the fundamental domain mismatch

**AI Analysis:**
```
Estate Agent PM → Digital Product Manager

Score: 28%
Job Domain: "Digital Product Management (Tech/SaaS)"
CV Domain: "Estate Agency / Real Estate Project Management"
Domain Match: false

Reasoning: "Significant domain shift from estate agency to digital product 
management. While both roles involve project coordination and stakeholder 
management, the digital PM role requires deep understanding of software 
development, agile methodologies, user stories, sprint planning, and 
tech product lifecycle that isn't present in real estate project management. 
The transferable skills (stakeholder management, planning) are valuable but 
insufficient for this tech-focused role."

Strong Matches: []
Transferable Skills: [
  "stakeholder management", 
  "project planning", 
  "client communication"
]
Gaps: [
  "software development understanding",
  "agile/scrum methodology",
  "product roadmap for tech products",
  "engineering team collaboration",
  "tech product metrics (DAU, retention, etc.)"
]
```
✅ Accurately identifies domain mismatch with detailed reasoning

**Cost:** ~$0.003 per job analysis (Claude 3.5 Sonnet)

---

## Open-Source AI Solutions

### Option 1: Ollama (Local Model) - Easiest & Free

#### What is Ollama?

Ollama is a tool that lets you run large language models locally on your computer. Think of it like running a web server, but instead of serving web pages, it serves AI responses.

**Key Features:**
- Runs AI models completely offline on your machine
- No API costs - 100% free
- Privacy-focused - data never leaves your computer
- Supports popular open-source models:
  - Llama 3.1 (Meta) - 8B, 70B variants
  - Mistral (Mistral AI) - 7B variant
  - Gemma (Google) - 2B, 7B variants
  - Phi-3 (Microsoft) - 3.8B variant

#### Hardware Requirements

**Minimum (Will Work, But Slow):**
- 8GB RAM
- CPU only
- Expected speed: 30-60 seconds per job analysis
- Model: Llama 3.1 8B or Phi-3 3.8B

**Recommended (Good Performance):**
- 16GB RAM
- GPU with 8GB VRAM (NVIDIA RTX 3060, AMD RX 6700 XT)
- Expected speed: 5-15 seconds per job analysis
- Model: Llama 3.1 8B or Mistral 7B

**Optimal (Best Performance):**
- 32GB RAM
- GPU with 12GB+ VRAM (NVIDIA RTX 4060 Ti, RTX 3090, RTX 4090)
- Expected speed: 2-5 seconds per job analysis
- Model: Llama 3.1 70B or any smaller model (blazing fast)

**Your Mac Compatibility:**
- ✅ M1/M2/M3 Mac with 16GB+ unified memory - Excellent performance
- ✅ Intel Mac with 16GB+ RAM - Good performance (CPU only)
- ⚠️ Mac with 8GB RAM - Will work but slow

#### Installation

```bash
# macOS
brew install ollama

# Start Ollama server (runs in background)
ollama serve

# Download a model (one-time, ~4-8GB download)
ollama pull llama3.1:8b

# Test it
ollama run llama3.1:8b "Analyze this job fit..."
```

**Windows:**
1. Download from https://ollama.com/download
2. Run installer
3. Ollama runs as a Windows service automatically

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama serve
ollama pull llama3.1:8b
```

#### Architecture Integration

**No server infrastructure needed!** Ollama runs on the same machine as your app.

```
Current Architecture:
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │────▶│ Backend  │────▶│ Keyword  │
│ (React)  │     │ (Node.js)│     │ Matching │
└──────────┘     └──────────┘     └──────────┘

With Ollama:
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Frontend │────▶│ Backend  │────▶│ Ollama   │
│ (React)  │     │ (Node.js)│     │localhost │
└──────────┘     └──────────┘     └──────────┘
                                   ↓
                              Runs on user's
                              Mac/PC (free)
```

#### Code Integration

Minimal changes required - just HTTP calls to localhost:

```typescript
// job-research-mcp/src/tools/ollama-analyze.ts

async function analyzeWithOllama(jobDescription: string, cvContent: string) {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1:8b',
      prompt: `Analyze job fit between this CV and job...\n\n${cvContent}\n\n${jobDescription}`,
      stream: false,
      format: 'json', // Request JSON response
    }),
  });

  const data = await response.json();
  return JSON.parse(data.response);
}
```

**Pros:**
- ✅ Completely free
- ✅ Works offline
- ✅ No API keys needed
- ✅ Privacy-focused (data never leaves machine)
- ✅ No external dependencies
- ✅ Easy installation (single command)
- ✅ No new servers required

**Cons:**
- ❌ Requires local hardware (RAM/GPU)
- ❌ Slower than cloud APIs (5-15s vs 2-5s)
- ❌ Lower accuracy than GPT-4 (80-85% vs 95%)
- ❌ Uses local resources (battery drain on laptops)

**Best For:**
- Individual users running on their own machines
- Privacy-sensitive applications
- Offline usage scenarios
- Development and testing
- Cost-conscious users

---

### Option 2: Hugging Face Inference API - Cloud

#### What is Hugging Face?

Hugging Face is like GitHub for AI models. They host thousands of open-source models and provide APIs to run them in the cloud.

**Key Features:**
- Cloud-hosted open-source models
- No hardware requirements (runs in cloud)
- Access to 300,000+ models
- Pay-as-you-go pricing (cheaper than OpenAI/Anthropic)
- Supports inference endpoints and serverless inference

**Popular Models Available:**
- Llama 2 & 3 (Meta)
- Mistral & Mixtral (Mistral AI)
- Falcon (Technology Innovation Institute)
- BLOOM (BigScience)
- Code Llama (Meta)
- Zephyr (Hugging Face)

#### Pricing

**Free Tier:**
- 1,000 requests per month
- Rate limited (1-2 requests per second)
- Perfect for testing and small-scale use

**Paid Tier (Pro):**
- $9/month subscription
- ~$0.0005-0.001 per request (inference API)
- Dedicated endpoints: $0.60-4/hour depending on hardware

**Cost Comparison:**
```
1,000 job analyses:
- OpenAI GPT-4: $3.00
- Anthropic Claude: $3.00
- Hugging Face: $0.50-1.00
- Ollama (local): $0.00 (but uses your hardware)
```

#### Hardware Requirements

**Your Machine:** None! Everything runs in Hugging Face's cloud.

**Their Infrastructure:** They handle all the servers, GPUs, scaling, etc.

#### Architecture Integration

```
Frontend → Backend → Hugging Face API → Response
                      ↑
                   Cloud (no local resources)
                   Similar to OpenAI API
```

**No new servers needed** - just API calls like OpenAI!

#### Code Integration

Very similar to OpenAI integration:

```typescript
// job-research-mcp/src/tools/huggingface-analyze.ts

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

async function analyzeWithHuggingFace(jobDescription: string, cvContent: string) {
  const response = await fetch(
    'https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `Analyze job fit...\n\n${cvContent}\n\n${jobDescription}`,
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.3,
          return_full_text: false,
        },
      }),
    }
  );

  const data = await response.json();
  return JSON.parse(data[0].generated_text);
}
```

**Pros:**
- ✅ No hardware requirements
- ✅ Cheaper than OpenAI/Anthropic
- ✅ No installation needed
- ✅ Scales automatically
- ✅ Access to many models
- ✅ Free tier available (1,000 requests/month)
- ✅ Similar integration to OpenAI

**Cons:**
- ❌ Still costs money (but less)
- ❌ Requires internet connection
- ❌ Data sent to third-party (privacy concern for some)
- ❌ Lower accuracy than GPT-4 (85-90% vs 95%)
- ❌ Can be slower than OpenAI (3-8s vs 2-5s)

**Best For:**
- Production apps with budget constraints
- Users who want AI without local hardware
- Apps that need API scalability
- Testing multiple models easily

---

### Option 3: Self-Hosted Models (Your Own Server)

#### When You'd Need This

**Don't start here!** Only consider this when:
- You have 10,000+ job analyses per month
- API costs exceed server costs ($200+/month)
- You need complete data privacy (medical, legal, proprietary data)
- You want to fine-tune models specifically for your app
- You're building a SaaS product with many users

**Monthly Volume Breakeven:**
```
At what point is a server cheaper than APIs?

Hugging Face API: $0.001/request
Monthly cost for 200,000 requests: $200

GPU Server: $50-200/month (fixed)
Breakeven: ~50,000-200,000 requests/month

Conclusion: Start with APIs, move to server at scale
```

#### Hardware Requirements

**Option A: Cloud GPU (AWS, GCP, Azure)**

**AWS EC2 g4dn.xlarge:**
- NVIDIA T4 GPU (16GB VRAM)
- 4 vCPUs, 16GB RAM
- Cost: ~$0.526/hour = **~$380/month** (if running 24/7)
- Can handle: ~10-20 requests per second
- Model: Llama 3.1 8B or Mistral 7B

**AWS EC2 g5.xlarge:**
- NVIDIA A10G GPU (24GB VRAM)
- 4 vCPUs, 16GB RAM
- Cost: ~$1.006/hour = **~$730/month** (if running 24/7)
- Can handle: ~20-30 requests per second
- Model: Llama 3.1 70B or multiple 8B models

**Cost Optimization:**
- Use auto-scaling (turn off at night)
- Use spot instances (50-90% discount but can be interrupted)
- Use reserved instances (30-70% discount with commitment)

**Option B: Dedicated Server (Hetzner, OVH, Vultr)**

**Hetzner AX41:**
- AMD EPYC CPU
- NVIDIA RTX 3060 GPU (12GB VRAM)
- 64GB RAM, 2TB NVMe
- Cost: **~$100-150/month** (fixed price)
- No per-hour charges
- Lower cost than cloud at 24/7 usage

**Hetzner GX44:**
- Intel Xeon CPU
- NVIDIA RTX 4000 Ada GPU (20GB VRAM)
- 64GB RAM, 2x512GB NVMe
- Cost: **~$200/month** (fixed price)

**Pros vs Cloud:**
- ✅ Fixed monthly cost (predictable)
- ✅ Cheaper for 24/7 usage
- ✅ Better GPU value

**Cons vs Cloud:**
- ❌ Fixed capacity (can't auto-scale)
- ❌ More setup complexity
- ❌ You manage everything

#### Software Stack

**Server Setup:**
```bash
# Ubuntu 22.04 LTS
# Install NVIDIA drivers
apt-get install nvidia-driver-535

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install NVIDIA Container Toolkit
apt-get install nvidia-container-toolkit

# Deploy Text Generation Inference (TGI)
docker run --gpus all --shm-size 1g -p 8080:80 \
  -v $PWD/data:/data \
  ghcr.io/huggingface/text-generation-inference:latest \
  --model-id meta-llama/Llama-3.1-8B-Instruct \
  --max-input-length 4096 \
  --max-total-tokens 8192
```

**Alternative: vLLM (faster inference)**
```bash
docker run --gpus all -p 8000:8000 \
  vllm/vllm-openai:latest \
  --model meta-llama/Llama-3.1-8B-Instruct \
  --max-model-len 8192
```

**Load Balancer (nginx):**
```nginx
upstream ai_backend {
    server localhost:8080;
}

server {
    listen 80;
    location / {
        proxy_pass http://ai_backend;
    }
}
```

#### Architecture

```
                                    ┌──────────────┐
                                    │  Your GPU    │
Frontend → Backend → API Gateway →  │  Server      │
                                    │  (Llama 3.1) │
                                    └──────────────┘
                                     ↓
                              Runs 24/7 on your server
                              Fixed $50-200/month cost
```

**Your Backend Integration:**
```typescript
// Same API as OpenAI!
const response = await fetch('https://your-server.com/v1/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'meta-llama/Llama-3.1-8B-Instruct',
    prompt: 'Analyze job fit...',
    max_tokens: 1000,
  }),
});
```

**Pros:**
- ✅ Full control over infrastructure
- ✅ Complete data privacy
- ✅ Cost-effective at high volume
- ✅ Can fine-tune models
- ✅ Predictable performance
- ✅ Can serve multiple apps

**Cons:**
- ❌ High upfront complexity
- ❌ Requires DevOps skills
- ❌ Ongoing maintenance (updates, monitoring)
- ❌ Fixed capacity (need to plan scaling)
- ❌ Expensive until you reach scale
- ❌ Not cost-effective for small apps

**Best For:**
- Production SaaS with 10,000+ users
- High-volume job analysis (10,000+/month)
- Privacy-critical applications
- Multiple apps sharing infrastructure
- When API costs exceed $200/month

---

## Training & Fine-Tuning

### Do You Need to Train a Model?

**Short Answer: NO, not initially!**

Pre-trained models (Llama 3.1, Mistral, GPT-4, Claude) are already excellent at:
- Understanding job descriptions
- Analyzing CVs
- Detecting domain mismatches
- Evaluating skill transferability
- Writing natural language explanations

These models have been trained on trillions of tokens including:
- Job postings from LinkedIn, Indeed, etc.
- CVs and resumes
- HR and recruiting content
- Career advice articles
- Industry-specific terminology

**They already know:**
- What a "Design System Lead" does
- What "Security GRC Specialist" requires
- That these are different domains
- How to explain the mismatch

### When You'd Train/Fine-Tune

Consider fine-tuning only when:

1. **You have substantial data** (>10,000 examples)
   - Example: 10,000 job-CV pairs with human expert ratings
   - "This Design Lead CV is 25% match for Security GRC role" × 10,000

2. **You need specialized terminology**
   - Example: Quantum computing jobs with niche terminology
   - Example: Medical jobs requiring specific certifications
   - Example: Legal jobs with jurisdiction-specific requirements

3. **You want to improve accuracy** beyond 90%
   - Pre-trained: 85-90% accuracy
   - Fine-tuned: 92-97% accuracy
   - But requires significant data and expertise

4. **You're building a commercial product**
   - Competitive advantage through custom model
   - Proprietary scoring methodology
   - Brand-specific tone and style

5. **You have domain-specific requirements**
   - Your app focuses on a specific industry (e.g., only healthcare jobs)
   - You have unique scoring criteria
   - You need to match your company's hiring philosophy

### Fine-Tuning Requirements

#### Data Requirements

**Minimum Dataset:**
- 1,000-2,000 high-quality examples
- Each example: (Job description, CV, Expert rating, Explanation)

**Recommended Dataset:**
- 10,000-50,000 examples
- Multiple human raters per example (consensus labels)
- Diverse job types and experience levels

**Example Training Data:**
```json
{
  "job_description": "Security GRC Specialist at Anthropic...",
  "cv_content": "Design System Lead with 8 years experience...",
  "alignment_score": 25,
  "reasoning": "Fundamental domain mismatch: design vs security...",
  "strong_matches": [],
  "gaps": ["No GRC experience", "No compliance certifications"],
  "transferable_skills": ["project management", "documentation"]
}
```

**How to Collect:**
- Manual labeling by HR experts ($20-50/hour)
- Crowdsourcing (Mechanical Turk, Scale AI)
- User feedback in your app (implicit labels)
- A/B testing with multiple models

**Cost:**
- Labeling 10,000 examples at $5 each = **$50,000**
- Or 500 hours at $20/hour = **$10,000**
- This is the biggest cost of fine-tuning!

#### Hardware Requirements

**GPU Requirements:**

**For 7-8B parameter models (Llama 3.1 8B, Mistral 7B):**
- Minimum: RTX 3090 (24GB VRAM)
- Recommended: RTX 4090 (24GB VRAM) or A100 (40GB VRAM)
- Training time: 4-24 hours depending on dataset

**For 70B+ parameter models:**
- Minimum: A100 (80GB VRAM) or 2x A100 (40GB)
- Training time: 1-7 days depending on dataset
- Not recommended for individual developers

**Cloud GPU Costs:**
```
AWS p3.2xlarge (Tesla V100, 16GB):
- $3.06/hour × 12 hours = $37 per training run

AWS p4d.24xlarge (8x A100, 40GB each):
- $32.77/hour × 24 hours = $786 per training run

Google Cloud A100 (40GB):
- $2.93/hour × 12 hours = $35 per training run

Total for experimentation (10 runs): $350-$7,860
```

#### Fine-Tuning Process

**1. Prepare Dataset:**
```python
# Convert your data to fine-tuning format
import json

training_data = []
for example in your_examples:
    training_data.append({
        "messages": [
            {"role": "system", "content": "You are a job-CV analyzer..."},
            {"role": "user", "content": f"Job: {example.job}\nCV: {example.cv}"},
            {"role": "assistant", "content": json.dumps(example.rating)}
        ]
    })

with open('training.jsonl', 'w') as f:
    for item in training_data:
        f.write(json.dumps(item) + '\n')
```

**2. Fine-Tune the Model:**

**Using Hugging Face transformers:**
```bash
# Install dependencies
pip install transformers accelerate peft bitsandbytes

# Run fine-tuning (LoRA - efficient method)
python fine_tune.py \
  --model_name meta-llama/Llama-3.1-8B-Instruct \
  --dataset training.jsonl \
  --epochs 3 \
  --learning_rate 2e-5 \
  --output_dir ./fine-tuned-model
```

**Using OpenAI API (easiest):**
```bash
# Upload training file
openai api fine_tunes.create \
  -t training.jsonl \
  -m gpt-4-0613 \
  --suffix "job-analyzer"

# Cost: ~$8-16 per 1,000 training examples
```

**3. Evaluate the Model:**
```python
# Test on held-out validation set
from sklearn.metrics import mean_absolute_error

predictions = model.predict(validation_set)
actual = validation_set['alignment_score']

mae = mean_absolute_error(actual, predictions)
print(f"Mean Absolute Error: {mae}%")  # Target: <5%
```

**4. Deploy the Fine-Tuned Model:**
- Host on your GPU server
- Or use Hugging Face Inference Endpoints
- Or OpenAI serves it automatically (if you fine-tuned GPT-4)

#### Total Fine-Tuning Costs

**One-Time Setup:**
```
Data Collection:
- 10,000 examples × $5 = $50,000
- Or 500 hours × $20/hour = $10,000

Training:
- GPU rental: $35-800 per run
- 10 experimental runs: $350-8,000
- Final training: $35-800

Total: $10,350 - $58,800 (depending on approach)
```

**Ongoing Costs:**
```
Model Retraining (quarterly):
- New data collection: $2,000-5,000/quarter
- Retraining GPU: $35-800
- Testing & validation: 40 hours × $50 = $2,000

Annual: ~$16,000-$32,000
```

### Recommendation: Start with Pre-Trained

**For your app, you should:**

1. **Start with pre-trained models**
   - Llama 3.1, Mistral, or GPT-4/Claude
   - They already understand jobs and CVs
   - 85-95% accuracy out of the box

2. **Collect data in production**
   - Track user feedback (implicit labels)
   - "Was this match score accurate?"
   - Build dataset organically over 6-12 months

3. **Fine-tune later** (after MVP validation)
   - Wait until you have 5,000-10,000 labeled examples
   - Wait until API costs exceed $200/month
   - Only if accuracy improvements justify cost

4. **Use Prompt Engineering first**
   - Improve prompts before fine-tuning
   - Often achieves 90%+ of fine-tuning benefits
   - Zero cost, immediate results

**Example Prompt Improvements:**
```typescript
// Bad prompt (generic)
const prompt = "Analyze this job and CV";

// Good prompt (specific, with examples)
const prompt = `
You are an expert recruiter analyzing job-candidate fit.

Rate alignment from 0-100 where:
- 80-100: Excellent fit (same domain, skills match)
- 60-79: Good fit (adjacent domain, transferable skills)
- 40-59: Moderate fit (different domain, some overlap)
- 20-39: Poor fit (major mismatch, few transferable skills)
- 0-19: Very poor fit (completely different domain)

Key considerations:
1. Domain match (tech vs non-tech, design vs engineering)
2. Experience level (junior, mid, senior, lead)
3. Skill overlap (technical skills, soft skills)
4. Career trajectory (logical progression vs jump)

Examples:
- Design Lead → Senior Designer at tech company: 85-90%
- Design Lead → Security GRC: 15-25%
- Estate Agent PM → Digital PM: 20-35%

Now analyze:
Job: {job_description}
CV: {cv_content}
`;
```

**Prompt engineering can improve accuracy by 10-20% at zero cost!**

---

## Architecture Comparisons

### Current Architecture (No AI)

```
┌──────────────┐
│   Frontend   │
│   (React)    │
│   Port 5173  │
└──────┬───────┘
       │
       │ HTTP
       │
┌──────▼───────┐
│   Backend    │
│  (Node.js)   │
│  Port 3001   │
└──────┬───────┘
       │
       │
┌──────▼────────────┐
│ Keyword Matching  │
│   (Heuristic)     │
│                   │
│ - 6 domains       │
│ - Keywords        │
│ - 0.1s/job        │
│ - Free            │
└───────────────────┘
```

**Pros:**
- ✅ Fast (0.1s per job)
- ✅ Free
- ✅ Works offline
- ✅ Simple

**Cons:**
- ❌ Low accuracy (60-70%)
- ❌ Misses novel domain mismatches
- ❌ No context understanding
- ❌ Requires manual domain additions

---

### Architecture with Ollama (Local AI)

```
┌──────────────┐
│   Frontend   │
│   (React)    │
│   Port 5173  │
└──────┬───────┘
       │
       │ HTTP
       │
┌──────▼───────┐
│   Backend    │
│  (Node.js)   │
│  Port 3001   │
└──────┬───────┘
       │
       │ HTTP (localhost)
       │
┌──────▼────────────┐
│     Ollama        │
│  (Local Server)   │
│  Port 11434       │
│                   │
│ - Llama 3.1 8B    │
│ - Runs locally    │
│ - 5-15s/job       │
│ - Free            │
│ - Offline         │
└───────────────────┘

Runs on same machine:
- Your Mac/PC
- User's computer (if deployed)
```

**Deployment Options:**

**Option A: Dev Machine Only**
- Ollama runs on your dev machine
- Users must also install Ollama
- Good for: power users, tech-savvy audience

**Option B: Hybrid Mode**
- Detect if Ollama is available locally
- Fall back to keyword matching if not
- Best user experience

**Pros:**
- ✅ Free (no API costs)
- ✅ Works offline
- ✅ Privacy (data stays local)
- ✅ Good accuracy (80-85%)
- ✅ Handles any domain
- ✅ Easy installation

**Cons:**
- ❌ Requires local hardware (RAM/GPU)
- ❌ Slower than cloud (5-15s)
- ❌ Users must install Ollama
- ❌ Battery drain on laptops

---

### Architecture with Hugging Face API (Cloud AI)

```
┌──────────────┐
│   Frontend   │
│   (React)    │
│   Port 5173  │
└──────┬───────┘
       │
       │ HTTP
       │
┌──────▼───────┐
│   Backend    │
│  (Node.js)   │
│  Port 3001   │
└──────┬───────┘
       │
       │ HTTPS (Internet)
       │
┌──────▼─────────────────┐
│  Hugging Face API      │
│  (Cloud)               │
│                        │
│ - Llama 3.1 8B         │
│ - Runs on HF servers   │
│ - 3-8s/job             │
│ - $0.001/request       │
│ - Always available     │
└────────────────────────┘
```

**Similar to OpenAI integration:**
- No new infrastructure
- Just API calls
- Scales automatically

**Pros:**
- ✅ No hardware needed
- ✅ Cheaper than OpenAI/Claude
- ✅ Scales automatically
- ✅ Good accuracy (85-90%)
- ✅ Multiple models available
- ✅ Free tier (1,000 requests/month)

**Cons:**
- ❌ Costs money (but less than GPT-4)
- ❌ Requires internet
- ❌ Data sent to third party
- ❌ Slower than GPT-4 (3-8s vs 2-5s)

---

### Architecture with Self-Hosted GPU (Your Server)

```
┌──────────────┐
│   Frontend   │
│   (React)    │
│   Port 5173  │
└──────┬───────┘
       │
       │ HTTP
       │
┌──────▼───────┐
│   Backend    │
│  (Node.js)   │
│  Port 3001   │
└──────┬───────┘
       │
       │ HTTPS (Internet)
       │
┌──────▼─────────────────┐
│  Your GPU Server       │
│  (AWS/Hetzner/etc)     │
│                        │
│  ┌─────────────────┐   │
│  │ Load Balancer   │   │
│  │   (nginx)       │   │
│  └────────┬────────┘   │
│           │            │
│  ┌────────▼────────┐   │
│  │  TGI/vLLM       │   │
│  │  Server         │   │
│  └────────┬────────┘   │
│           │            │
│  ┌────────▼────────┐   │
│  │ Llama 3.1 70B   │   │
│  │ (Model in GPU)  │   │
│  └─────────────────┘   │
│                        │
│ - 2-5s/job             │
│ - $50-200/month fixed  │
│ - Your infrastructure  │
└────────────────────────┘
```

**When to use:**
- High volume (>50,000 requests/month)
- API costs exceed $200/month
- Privacy requirements

**Pros:**
- ✅ Full control
- ✅ Complete privacy
- ✅ Cost-effective at scale
- ✅ Can fine-tune
- ✅ Fast (2-5s)
- ✅ Predictable performance

**Cons:**
- ❌ High setup complexity
- ❌ Requires DevOps skills
- ❌ Ongoing maintenance
- ❌ Fixed capacity
- ❌ Expensive initially

---

### Hybrid Multi-Model Architecture (Recommended)

```
┌──────────────┐
│   Frontend   │
│   (React)    │
└──────┬───────┘
       │
       │ User Chooses AI Provider
       │
┌──────▼───────────────────────────────────┐
│            Backend                       │
│          (Node.js)                       │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │     AI Provider Router             │ │
│  │                                    │ │
│  │  if (provider === 'ollama')       │ │
│  │    → localhost:11434               │ │
│  │  else if (provider === 'hf')      │ │
│  │    → Hugging Face API              │ │
│  │  else if (provider === 'openai')  │ │
│  │    → OpenAI API                    │ │
│  │  else                              │ │
│  │    → Keyword Heuristic             │ │
│  └────────────────────────────────────┘ │
└──────┬───────────────┬───────────┬──────┘
       │               │           │
       ▼               ▼           ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│  Ollama  │   │ HF API   │   │ OpenAI   │
│ (Local)  │   │ (Cloud)  │   │ (Cloud)  │
│  Free    │   │ $0.001   │   │ $0.003   │
│  5-15s   │   │  3-8s    │   │  2-5s    │
└──────────┘   └──────────┘   └──────────┘
```

**User Settings UI:**
```
AI Analysis Provider:
┌─────────────────────────────────┐
│ ○ Keyword Matching (Free)       │
│   ├─ Speed: ⚡⚡⚡ Very Fast     │
│   ├─ Accuracy: ★★☆☆☆ Limited  │
│   └─ Cost: Free                 │
│                                 │
│ ○ Ollama - Local (Free)         │
│   ├─ Speed: ⚡⚡☆ Medium        │
│   ├─ Accuracy: ★★★★☆ Good     │
│   ├─ Cost: Free                 │
│   └─ Requires: Ollama installed │
│                                 │
│ ○ Hugging Face ($0.001/job)     │
│   ├─ Speed: ⚡⚡☆ Medium        │
│   ├─ Accuracy: ★★★★☆ Good     │
│   ├─ Cost: ~$1 per 1000 jobs   │
│   └─ API Key: [Configure]       │
│                                 │
│ ○ OpenAI GPT-4 ($0.003/job)     │
│   ├─ Speed: ⚡⚡⚡ Fast         │
│   ├─ Accuracy: ★★★★★ Best     │
│   ├─ Cost: ~$3 per 1000 jobs   │
│   └─ API Key: [Configure]       │
│                                 │
│ ○ Anthropic Claude ($0.003/job) │
│   ├─ Speed: ⚡⚡⚡ Fast         │
│   ├─ Accuracy: ★★★★★ Best     │
│   ├─ Cost: ~$3 per 1000 jobs   │
│   └─ API Key: [Configure]       │
└─────────────────────────────────┘

[Save Settings]
```

**Why This is Best:**
- ✅ Users choose based on their needs
- ✅ No vendor lock-in
- ✅ Graceful fallback (keyword if no AI)
- ✅ Can work offline (Ollama)
- ✅ Scales from free to premium
- ✅ Privacy options (Ollama vs cloud)

---

## Cost Analysis

### Per-Request Costs

| Provider | Model | Cost per Job | Cost per 1K Jobs | Cost per 10K Jobs |
|----------|-------|-------------|------------------|-------------------|
| **Keyword Heuristic** | N/A | $0.000 | $0.00 | $0.00 |
| **Ollama (Local)** | Llama 3.1 8B | $0.000* | $0.00* | $0.00* |
| **Hugging Face Free** | Various | $0.000 | $0.00 | $0.00 |
| **Hugging Face API** | Llama 3.1 8B | $0.0005-0.001 | $0.50-1.00 | $5-10 |
| **OpenAI** | GPT-4 Turbo | $0.003 | $3.00 | $30 |
| **Anthropic** | Claude 3.5 | $0.003 | $3.00 | $30 |
| **Self-Hosted GPU** | Llama 3.1 70B | $0.0001-0.0003** | $0.10-0.30 | $1-3 |

*Hardware costs (electricity, depreciation) not included  
**After amortizing $100-200/month server cost

### Monthly Cost Scenarios

#### Scenario 1: Individual Job Seeker (You)
```
Usage: 100-500 jobs per month
Active job search, analyzing roles daily

Keyword Heuristic: $0/month (current)
Ollama Local: $0/month + electricity (~$2-5/month)
Hugging Face: $0.05-0.50/month (free tier covers this)
OpenAI GPT-4: $0.30-1.50/month
Anthropic Claude: $0.30-1.50/month

Recommendation: Ollama (free, private) or HF free tier
```

#### Scenario 2: Active Job Marketplace (10 Users)
```
Usage: 1,000-5,000 jobs per month
10 users, each analyzing 100-500 jobs

Keyword Heuristic: $0/month
Ollama Local: $0/month (each user runs locally)
Hugging Face: $0.50-5.00/month
OpenAI GPT-4: $3-15/month
Anthropic Claude: $3-15/month

Recommendation: Hybrid (Ollama + HF API fallback)
```

#### Scenario 3: Small SaaS (100 Users)
```
Usage: 10,000-50,000 jobs per month
100 paying users, each analyzing 100-500 jobs

Keyword Heuristic: $0/month
Ollama Local: Not scalable (requires each user to install)
Hugging Face: $5-50/month
OpenAI GPT-4: $30-150/month
Anthropic Claude: $30-150/month
Self-Hosted GPU: $100-200/month (fixed)

Recommendation: Hugging Face API initially
Migration path: Self-hosted GPU when >50,000/month
```

#### Scenario 4: Growing SaaS (1,000 Users)
```
Usage: 100,000-500,000 jobs per month
1,000 users, professional recruiting teams

Keyword Heuristic: $0/month (not accurate enough)
Hugging Face: $50-500/month
OpenAI GPT-4: $300-1,500/month
Anthropic Claude: $300-1,500/month
Self-Hosted GPU: $200-500/month (multiple servers)

Recommendation: Self-hosted GPU (cost-effective at scale)
Breakeven point: ~50,000-100,000 requests/month
```

### Total Cost of Ownership (1 Year)

#### Option A: Ollama (Local)
```
Setup Time: 1 hour
Hardware: Your existing Mac/PC
Electricity: ~$2-5/month
Total Year 1: ~$24-60

Pros: Free, private, offline
Cons: Uses your hardware, slower
```

#### Option B: Hugging Face API
```
Setup Time: 2 hours
API Costs: $5-50/month (depends on usage)
Total Year 1: $60-600

Pros: No hardware, scales automatically
Cons: Still costs money, requires internet
```

#### Option C: OpenAI/Anthropic
```
Setup Time: 1 hour (already integrated!)
API Costs: $30-150/month (depends on usage)
Total Year 1: $360-1,800

Pros: Best accuracy, fast, reliable
Cons: Most expensive, vendor lock-in
```

#### Option D: Self-Hosted GPU
```
Setup Time: 1-2 days
Server Costs: $100-200/month
Maintenance: 4 hours/month × $50/hour = $200/month
Total Year 1: $3,600-4,800 (server) + $2,400 (maintenance) = $6,000-7,200

Pros: Control, privacy, cost-effective at scale
Cons: High upfront cost, requires expertise
Breakeven: Only makes sense at 50,000+ requests/month
```

### Recommendation by Stage

**MVP / Individual Use:**
- Start with: **Ollama** (free) or **Keyword Heuristic** (current)
- Cost: $0/month
- Validate product-market fit first

**Early Traction (10-100 users):**
- Migrate to: **Hugging Face API**
- Cost: $5-50/month
- Better accuracy, scales automatically

**Growth Stage (100-1,000 users):**
- Continue: **Hugging Face API**
- Or upgrade to: **OpenAI/Claude** if accuracy critical
- Cost: $50-500/month

**Scale Stage (1,000+ users):**
- Migrate to: **Self-Hosted GPU**
- Cost: $200-500/month (fixed)
- Cost-effective at high volume

---

## Recommendations

### For Your Current App (MVP)

**Recommended Approach: Hybrid Architecture**

Implement multiple AI providers with user choice:

#### Phase 1: Quick Win (1-2 days)

1. **Add Ollama Support**
   - Easy integration (just HTTP calls)
   - No API costs
   - Works on your Mac
   - Good accuracy (80-85%)
   - Users can opt-in

2. **Keep Keyword Heuristic as Default**
   - Fast fallback
   - Works for everyone
   - No setup required

**Result:** 
- Free AI analysis for those willing to install Ollama
- No breaking changes for existing users
- Easy to test and validate

#### Phase 2: Scale (1-2 weeks later)

3. **Add Hugging Face API Support**
   - Cheap cloud option ($0.001/request)
   - No local hardware needed
   - Better than keyword matching

4. **Add OpenAI/Claude Support**
   - Already have code for CV Optimizer
   - Just add job analysis endpoint
   - Premium option for best accuracy

**Result:**
- Users choose their preferred provider
- Balance of cost, accuracy, privacy
- No vendor lock-in

#### Phase 3: Optimize (3-6 months later)

5. **Collect User Feedback**
   - Track which provider users prefer
   - Measure accuracy vs cost
   - Identify pain points

6. **Consider Self-Hosted** (if needed)
   - Only if you have >10,000 analyses/month
   - Only if API costs exceed $200/month
   - Start with cloud GPU (AWS/GCP)

### Implementation Priority

**Week 1: Ollama Integration**
```
Priority: HIGH
Effort: LOW (1-2 days)
Value: HIGH (free AI analysis)

Tasks:
1. Add Ollama detection to backend
2. Create Ollama analyzer function
3. Add UI toggle for "Use Local AI"
4. Test with your CV
5. Document for users
```

**Week 2-3: Hugging Face Integration**
```
Priority: MEDIUM
Effort: LOW (1-2 days)
Value: MEDIUM (cheap cloud option)

Tasks:
1. Get HF API key
2. Create HF analyzer function
3. Add API key configuration UI
4. Test multiple models
5. Add usage tracking
```

**Week 4+: OpenAI/Claude for Job Analysis**
```
Priority: LOW (already have for CV Optimizer)
Effort: LOW (reuse existing code)
Value: MEDIUM (premium option)

Tasks:
1. Adapt CV Optimizer prompt for job analysis
2. Add job analysis endpoint
3. Add cost warning for users
4. Test accuracy
```

**Month 3-6: Self-Hosted GPU (Optional)**
```
Priority: LOW (only if needed)
Effort: HIGH (1-2 weeks)
Value: HIGH (if at scale)

Tasks:
1. Wait for user traction
2. Calculate actual costs
3. Decide if worth it
4. Deploy if cost-effective
```

### Technology Choices

**Recommended Stack:**

1. **Development & Testing:** Ollama
   - Free, fast iteration
   - No API key management
   - Privacy for development

2. **Production Default:** Keyword Heuristic
   - Works for everyone
   - No setup required
   - Fast

3. **Production Premium:** Hugging Face API
   - Cheap ($0.001/request)
   - Good accuracy (85-90%)
   - Scales automatically

4. **Production Ultra:** OpenAI/Claude
   - Best accuracy (95%)
   - For users who value precision
   - $0.003/request

**Model Recommendations:**

**For Ollama:**
- Llama 3.1 8B Instruct (best balance)
- Mistral 7B Instruct (faster, still good)
- Phi-3 3.8B (very fast, lighter on RAM)

**For Hugging Face:**
- meta-llama/Llama-3.1-8B-Instruct
- mistralai/Mistral-7B-Instruct-v0.2
- HuggingFaceH4/zephyr-7b-beta

**For OpenAI:**
- gpt-4-turbo (best accuracy)
- gpt-3.5-turbo (cheaper, still good)

**For Anthropic:**
- claude-3-5-sonnet-20241022 (best overall)
- claude-3-haiku-20240307 (cheaper, faster)

---

## Implementation Paths

### Path 1: Ollama Only (Simplest)

**Time to Implement:** 4-6 hours

**Steps:**

1. **Install Ollama on Dev Machine**
```bash
brew install ollama
ollama serve
ollama pull llama3.1:8b
```

2. **Create Ollama Analyzer**
```typescript
// job-research-mcp/src/tools/ollama-analyze.ts
export async function analyzeJobWithOllama(
  db: JobDatabase,
  jobId: string,
  cvId?: number,
  userId?: number
): Promise<AIAlignmentResult> {
  // Get job and CV
  const job = db.getJobById(jobId);
  const cv = cvId ? db.getCVDocument(cvId, userId) : db.getActiveCV(userId);
  
  // Call Ollama
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    body: JSON.stringify({
      model: 'llama3.1:8b',
      prompt: buildPrompt(job, cv.parsed_content),
      stream: false,
      format: 'json',
    }),
  });
  
  const data = await response.json();
  return JSON.parse(data.response);
}
```

3. **Add Backend Endpoint**
```typescript
// job-research-mcp/src/http-server-express.ts
app.post('/api/jobs/:id/analyze-ollama', authenticateUser, async (req, res) => {
  try {
    const result = await analyzeJobWithOllama(db, req.params.id, req.body.cvId, req.user!.userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

4. **Add UI Toggle**
```typescript
// job-research-ui/src/components/JobList.tsx
const [useOllama, setUseOllama] = useState(false);

<Switch
  checked={useOllama}
  onCheckedChange={setUseOllama}
  label="Use Local AI (Ollama)"
/>

<Button onClick={() => analyzeJobs(useOllama ? 'ollama' : 'heuristic')}>
  Analyze Jobs
</Button>
```

**Result:**
- ✅ Free AI analysis
- ✅ Works offline
- ✅ Private
- ✅ No vendor lock-in

**Limitations:**
- ⚠️ Users must install Ollama
- ⚠️ Slower than cloud APIs
- ⚠️ Requires local hardware

---

### Path 2: Multi-Provider Hybrid (Recommended)

**Time to Implement:** 1-2 weeks

**Steps:**

1. **Create Provider Abstraction**
```typescript
// job-research-mcp/src/tools/ai-provider.ts
export interface AIProvider {
  name: string;
  analyze(job: Job, cv: string): Promise<AIAlignmentResult>;
}

export class OllamaProvider implements AIProvider {
  name = 'ollama';
  async analyze(job, cv) { /* ... */ }
}

export class HuggingFaceProvider implements AIProvider {
  name = 'huggingface';
  async analyze(job, cv) { /* ... */ }
}

export class OpenAIProvider implements AIProvider {
  name = 'openai';
  async analyze(job, cv) { /* ... */ }
}

export class KeywordProvider implements AIProvider {
  name = 'keyword';
  async analyze(job, cv) { /* ... */ }
}
```

2. **Create Provider Router**
```typescript
// job-research-mcp/src/tools/ai-router.ts
export class AIRouter {
  private providers = new Map<string, AIProvider>();
  
  constructor() {
    this.providers.set('ollama', new OllamaProvider());
    this.providers.set('huggingface', new HuggingFaceProvider());
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('keyword', new KeywordProvider());
  }
  
  async analyze(provider: string, job: Job, cv: string) {
    const p = this.providers.get(provider) || this.providers.get('keyword');
    return p.analyze(job, cv);
  }
  
  async detectAvailable(): Promise<string[]> {
    const available = ['keyword']; // Always available
    
    // Check Ollama
    try {
      await fetch('http://localhost:11434/api/tags');
      available.push('ollama');
    } catch {}
    
    // Check API keys
    if (process.env.HUGGINGFACE_API_KEY) available.push('huggingface');
    if (process.env.OPENAI_API_KEY) available.push('openai');
    if (process.env.ANTHROPIC_API_KEY) available.push('anthropic');
    
    return available;
  }
}
```

3. **Add Unified Backend Endpoint**
```typescript
// job-research-mcp/src/http-server-express.ts
const aiRouter = new AIRouter();

app.get('/api/ai/providers', async (req, res) => {
  const available = await aiRouter.detectAvailable();
  res.json({ providers: available });
});

app.post('/api/jobs/:id/analyze-ai', authenticateUser, async (req, res) => {
  const { provider, cvId } = req.body;
  
  const job = db.getJobById(req.params.id);
  const cv = cvId ? db.getCVDocument(cvId, req.user!.userId) : db.getActiveCV(req.user!.userId);
  
  const result = await aiRouter.analyze(provider, job, cv.parsed_content);
  res.json(result);
});
```

4. **Add Provider Selection UI**
```typescript
// job-research-ui/src/components/AIProviderSelector.tsx
export function AIProviderSelector() {
  const [providers, setProviders] = useState([]);
  const [selected, setSelected] = useState('keyword');
  
  useEffect(() => {
    api.get('/ai/providers').then(res => {
      setProviders(res.data.providers);
      // Auto-select best available
      if (res.data.providers.includes('ollama')) setSelected('ollama');
    });
  }, []);
  
  return (
    <Select value={selected} onValueChange={setSelected}>
      <SelectItem value="keyword">
        ⚡ Fast (Keyword) - Free
      </SelectItem>
      {providers.includes('ollama') && (
        <SelectItem value="ollama">
          🤖 Local AI (Ollama) - Free, Private
        </SelectItem>
      )}
      {providers.includes('huggingface') && (
        <SelectItem value="huggingface">
          🤗 Hugging Face - $0.001/job
        </SelectItem>
      )}
      {providers.includes('openai') && (
        <SelectItem value="openai">
          🧠 OpenAI GPT-4 - $0.003/job, Best Accuracy
        </SelectItem>
      )}
    </Select>
  );
}
```

**Result:**
- ✅ Users choose their preference
- ✅ Graceful fallback (keyword)
- ✅ No vendor lock-in
- ✅ Works for everyone
- ✅ Scales from free to premium

---

### Path 3: Self-Hosted GPU (Advanced)

**Time to Implement:** 1-2 weeks

**When to Use:**
- You have >10,000 analyses/month
- API costs exceed $200/month
- You need complete data privacy
- You want to fine-tune models

**Steps:**

1. **Choose Infrastructure**
   - **AWS EC2 g4dn.xlarge** (~$380/month)
   - **Hetzner AX41** (~$150/month)
   - Start with AWS (easier to scale)

2. **Deploy TGI (Text Generation Inference)**
```bash
# SSH into server
ssh your-gpu-server

# Install Docker + NVIDIA drivers
curl -fsSL https://get.docker.com | sh
apt-get install nvidia-driver-535 nvidia-container-toolkit

# Pull and run TGI
docker run --gpus all --shm-size 1g -p 8080:80 \
  -v $PWD/data:/data \
  ghcr.io/huggingface/text-generation-inference:latest \
  --model-id meta-llama/Llama-3.1-8B-Instruct \
  --max-batch-prefill-tokens 4096 \
  --max-total-tokens 8192
```

3. **Setup Load Balancer**
```nginx
# /etc/nginx/sites-available/ai-api
upstream tgi_backend {
    server localhost:8080;
}

server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://tgi_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

4. **Add to Backend**
```typescript
// job-research-mcp/src/tools/self-hosted-provider.ts
export class SelfHostedProvider implements AIProvider {
  name = 'selfhosted';
  
  async analyze(job: Job, cv: string) {
    const response = await fetch('https://your-domain.com/generate', {
      method: 'POST',
      body: JSON.stringify({
        inputs: buildPrompt(job, cv),
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.3,
        },
      }),
    });
    
    const data = await response.json();
    return JSON.parse(data.generated_text);
  }
}
```

5. **Monitor & Scale**
   - Setup CloudWatch/Grafana monitoring
   - Track: requests/second, latency, GPU utilization
   - Add auto-scaling when needed

**Result:**
- ✅ Full control
- ✅ Cost-effective at scale
- ✅ Can fine-tune models
- ✅ Fast responses (2-5s)

**Ongoing Maintenance:**
- Model updates (quarterly)
- Security patches (monthly)
- Performance monitoring (daily)
- Cost optimization (monthly)

---

## Next Steps

### Immediate Actions (This Week)

1. **Review this document**
   - Understand trade-offs
   - Decide on approach
   - Consider user needs

2. **Choose initial path:**
   - **Path 1 (Ollama):** Free, simple, good for MVP
   - **Path 2 (Hybrid):** Flexible, best long-term
   - **Path 3 (Self-hosted):** Only if at scale

3. **Test Ollama locally:**
```bash
brew install ollama
ollama serve
ollama pull llama3.1:8b
ollama run llama3.1:8b "Analyze this job fit: [paste job + CV]"
```

### Short-Term (Next 2-4 Weeks)

4. **Implement chosen path**
   - Start with Ollama (easiest)
   - Or implement hybrid (most flexible)

5. **Test with your CV**
   - Compare vs keyword heuristic
   - Measure accuracy improvements
   - Check response times

6. **Deploy to production**
   - Add UI for provider selection
   - Document for users
   - Monitor usage

### Medium-Term (2-6 Months)

7. **Collect user feedback**
   - Which provider do users prefer?
   - Is accuracy good enough?
   - Are costs acceptable?

8. **Optimize based on data**
   - Improve prompts
   - Add caching
   - Consider fine-tuning if needed

9. **Scale infrastructure**
   - If >10,000 requests/month → consider GPU server
   - If costs high → optimize or self-host

### Long-Term (6-12 Months)

10. **Fine-tune model** (if needed)
    - Collect 5,000-10,000 labeled examples
    - Train custom model
    - Measure improvement vs cost

11. **Self-host** (if at scale)
    - Deploy GPU server
    - Migrate high-volume users
    - Keep API as fallback

---

## Questions to Consider

1. **What's your user base?**
   - Just you → Ollama
   - 10-100 users → Hybrid
   - 1,000+ users → Plan for scale

2. **What's your budget?**
   - $0/month → Ollama
   - $5-50/month → Hugging Face
   - $30-150/month → OpenAI/Claude
   - $200+/month → Self-hosted

3. **What's your priority?**
   - Accuracy → OpenAI/Claude
   - Cost → Ollama/Hugging Face
   - Privacy → Ollama/Self-hosted
   - Flexibility → Hybrid

4. **What's your timeline?**
   - This week → Ollama
   - This month → Hybrid
   - This quarter → Self-hosted (if needed)

---

## Conclusion

**For your job research app, I recommend:**

1. **Start with Ollama integration** (this week)
   - Free, easy, good accuracy
   - Test on your Mac
   - No API costs

2. **Add Hugging Face option** (next week)
   - Cheap cloud fallback
   - For users without Ollama
   - Scales automatically

3. **Keep keyword heuristic** (default)
   - Fast, free, works for everyone
   - Graceful fallback

4. **Wait on self-hosting** (6+ months)
   - Only if you reach scale
   - Only if API costs justify it

**This gives you:**
- ✅ Free option (Ollama)
- ✅ Cheap option (Hugging Face)
- ✅ Premium option (OpenAI/Claude)
- ✅ No vendor lock-in
- ✅ Scales with your needs

**Don't overthink it:** Start simple with Ollama, add more options as you grow!

---

**File Metadata:**
- **Document Version:** 1.0
- **Created:** November 24, 2025
- **Last Updated:** November 24, 2025
- **Author:** AI Assistant (Claude)
- **Status:** Ready for Review

