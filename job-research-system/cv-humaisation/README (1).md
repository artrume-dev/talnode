# CV Optimiser Agent - Project Overview

## Purpose
An AI-powered CV optimization system that transforms job application documents into ATS-optimized, achievement-focused, and human-sounding professional CVs while avoiding AI detection patterns.

## Core Objectives
1. **ATS Optimization** - Ensure maximum compatibility with Applicant Tracking Systems
2. **Content Enhancement** - Transform duties into quantifiable achievements
3. **Human Voice Preservation** - Avoid robotic AI-detected writing patterns
4. **Industry Alignment** - Match terminology and expectations for target roles
5. **Quality Assurance** - Maintain accuracy and truthfulness

## Key Features
- Multi-stage processing pipeline with specialized agents
- Job description matching and gap analysis
- Achievement quantification and impact scoring
- AI detection resistance through humanisation techniques
- Multiple export formats (ATS-friendly PDF, DOCX, plain text)
- Version control and A/B variant generation

## Technology Stack
- **Primary LLM**: Claude Sonnet 4.5 (humanisation, nuanced rewriting)
- **Secondary LLM**: GPT-4-turbo (content generation, quantification)
- **Orchestration**: Sequential pipeline or multi-agent coordination
- **Input Formats**: PDF, DOCX, TXT
- **Output Formats**: PDF (ATS-optimized), DOCX, TXT, LaTeX

## Architecture Philosophy
Rather than creating a single monolithic prompt, this system uses specialized agents that each handle a specific aspect of CV optimization. This modular approach ensures:
- Better quality control at each stage
- Easier debugging and improvement
- Flexibility to swap components
- Transparent processing pipeline

## Quick Start Workflow
1. **Input** → Upload CV + Job Description (optional)
2. **Analysis** → ATS scan + content quality assessment
3. **Enhancement** → Transform duties into achievements
4. **Humanisation** → Remove AI fingerprints
5. **Validation** → Quality checks + AI detection testing
6. **Output** → Export optimized CV in desired format

## Success Metrics
- ATS compatibility score: >85%
- AI detection score: <15%
- Achievement quantification: >80% of bullets
- Industry keyword match: >90% for target role
- Processing time: <3 minutes per CV

## Related Documentation
- `ARCHITECTURE.md` - Detailed agent architecture and data flow
- `PROMPTS.md` - All LLM prompts and prompt engineering strategies
- `HUMANISATION.md` - Techniques for creating natural-sounding content
- `QUALITY_ASSURANCE.md` - Validation checklists and testing procedures
- `GRAMMARLY_INSIGHTS.md` - Research findings on AI humanisation techniques

## Development Roadmap
- [ ] Phase 1: Core pipeline implementation
- [ ] Phase 2: Agent specialization and optimization
- [ ] Phase 3: Job description matching engine
- [ ] Phase 4: Multi-variant generation (A/B testing)
- [ ] Phase 5: Industry-specific customization
- [ ] Phase 6: Integration with job boards and ATS systems

## Ethical Considerations
- All enhancements must be truthful and verifiable
- No fabrication of experience, skills, or achievements
- Quantification suggestions require human validation
- Transparency about AI assistance when required by application process
- Privacy-first approach to candidate data handling
