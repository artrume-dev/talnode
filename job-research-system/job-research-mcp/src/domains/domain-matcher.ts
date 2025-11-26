/**
 * Domain Matcher - Detects job domains and matches against user expertise
 * 
 * This module provides domain-based job matching that:
 * 1. Detects which domains a job belongs to (keyword-based)
 * 2. Matches against user's selected domains
 * 3. Identifies transferable skills across related domains
 * 4. Calculates domain alignment scores
 * 
 * AI-Ready: The interface is designed to support both keyword matching (current)
 * and AI-based detection (future) without changing the API.
 */

import { DOMAIN_REGISTRY, Domain, getDomainById, getDomainNames } from './domain-registry.js';

export interface DomainMatchResult {
  jobDomains: string[]; // Detected domain IDs in the job
  jobDomainNames: string[]; // Human-readable names
  userDomains: string[]; // User's selected domain IDs
  userDomainNames: string[]; // Human-readable names
  isMatch: boolean; // Do any domains overlap or transfer?
  matchedDomains: string[]; // Which domains directly match
  mismatchedDomains: string[]; // Which job domains user doesn't have
  transferableSkills: string[]; // Skills/domains that could transfer
  alignmentScore: number; // 0-100 based on domain overlap
  reasoning: string; // Human-readable explanation
}

/**
 * Domain Matcher Interface - allows swapping implementations (keyword vs AI)
 */
export interface IDomainMatcher {
  detectJobDomains(jobTitle: string, jobDescription: string): string[];
  matchUserDomains(cvContent: string, userDomainIds: string[], jobDomains: string[]): DomainMatchResult;
}

/**
 * Keyword-based Domain Matcher (current implementation)
 * Uses keyword matching to detect domains
 */
export class KeywordDomainMatcher implements IDomainMatcher {
  /**
   * Detect which domains a job posting belongs to
   * Based on keyword frequency in title and description
   */
  detectJobDomains(jobTitle: string, jobDescription: string): string[] {
    const text = `${jobTitle} ${jobDescription}`.toLowerCase();
    const detectedDomains: string[] = [];

    // Check each domain in the registry
    for (const domain of Object.values(DOMAIN_REGISTRY)) {
      // Count how many keywords from this domain appear in the job
      const matchCount = domain.keywords.filter(keyword => 
        text.includes(keyword.toLowerCase())
      ).length;

      // If enough keywords match, flag this domain
      if (matchCount >= domain.requiredCount) {
        detectedDomains.push(domain.id);
      }
    }

    return detectedDomains;
  }

  /**
   * Match user's domain expertise against detected job domains
   */
  matchUserDomains(
    cvContent: string,
    userDomainIds: string[],
    jobDomainIds: string[]
  ): DomainMatchResult {
    const cvLower = cvContent.toLowerCase();
    const matchedDomains: string[] = [];
    const mismatchedDomains: string[] = [];
    const transferableSkills: string[] = [];

    // If no job domains detected, assume it's a general role
    if (jobDomainIds.length === 0) {
      return {
        jobDomains: [],
        jobDomainNames: [],
        userDomains: userDomainIds,
        userDomainNames: getDomainNames(userDomainIds),
        isMatch: true,
        matchedDomains: [],
        mismatchedDomains: [],
        transferableSkills: [],
        alignmentScore: 70, // Neutral score for undetected domains
        reasoning: 'No specific domain requirements detected. General role that may suit various backgrounds.',
      };
    }

    // Check each job domain
    for (const jobDomainId of jobDomainIds) {
      const jobDomain = getDomainById(jobDomainId);
      if (!jobDomain) continue;

      // Check if user has this domain directly
      if (userDomainIds.includes(jobDomainId)) {
        matchedDomains.push(jobDomainId);
        continue;
      }

      // Check if user has a related/transferable domain
      let hasTransferable = false;
      for (const userDomainId of userDomainIds) {
        const userDomain = getDomainById(userDomainId);
        if (!userDomain) continue;

        // Check if user's domain transfers to job domain
        if (userDomain.transferableTo.includes(jobDomainId)) {
          hasTransferable = true;
          transferableSkills.push(jobDomain.name);
          break;
        }

        // Check reverse: if job domain transfers to user domain (partial match)
        if (jobDomain.transferableTo.includes(userDomainId)) {
          hasTransferable = true;
          transferableSkills.push(jobDomain.name);
          break;
        }
      }

      // If no direct or transferable match, it's a mismatch
      if (!hasTransferable) {
        mismatchedDomains.push(jobDomainId);
      }
    }

    // Calculate alignment score
    const alignmentScore = this.calculateAlignmentScore(
      matchedDomains.length,
      transferableSkills.length,
      mismatchedDomains.length,
      jobDomainIds.length
    );

    // Generate reasoning
    const reasoning = this.generateReasoning(
      matchedDomains,
      transferableSkills,
      mismatchedDomains,
      userDomainIds,
      jobDomainIds
    );

    return {
      jobDomains: jobDomainIds,
      jobDomainNames: getDomainNames(jobDomainIds),
      userDomains: userDomainIds,
      userDomainNames: getDomainNames(userDomainIds),
      isMatch: matchedDomains.length > 0 || transferableSkills.length > 0,
      matchedDomains,
      mismatchedDomains,
      transferableSkills,
      alignmentScore,
      reasoning,
    };
  }

  /**
   * Calculate domain alignment score (0-100)
   */
  private calculateAlignmentScore(
    matchedCount: number,
    transferableCount: number,
    mismatchCount: number,
    totalJobDomains: number
  ): number {
    if (totalJobDomains === 0) return 70; // Neutral score

    // Perfect match = 100, transferable = 60, mismatch = 20
    const matchRatio = matchedCount / totalJobDomains;
    const transferableRatio = transferableCount / totalJobDomains;
    const mismatchRatio = mismatchCount / totalJobDomains;

    // Weighted score
    const score = (matchRatio * 100) + (transferableRatio * 60) + (mismatchRatio * 20);

    // Cap at 100
    return Math.min(Math.round(score), 100);
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    matchedDomains: string[],
    transferableSkills: string[],
    mismatchedDomains: string[],
    userDomainIds: string[],
    jobDomainIds: string[]
  ): string {
    const reasons: string[] = [];

    // Perfect match
    if (matchedDomains.length === jobDomainIds.length && mismatchedDomains.length === 0) {
      const domainNames = getDomainNames(matchedDomains);
      return `🎯 Perfect domain match! Your ${domainNames.join(' and ')} expertise aligns exactly with this role's requirements.`;
    }

    // Strong match
    if (matchedDomains.length > 0) {
      const domainNames = getDomainNames(matchedDomains);
      reasons.push(`✅ Your ${domainNames.join(', ')} experience matches the core requirements`);
    }

    // Transferable skills
    if (transferableSkills.length > 0) {
      reasons.push(`🔄 Transferable skills: ${transferableSkills.join(', ')}`);
    }

    // Mismatches
    if (mismatchedDomains.length > 0) {
      const mismatchNames = getDomainNames(mismatchedDomains);
      const userNames = getDomainNames(userDomainIds);
      
      if (matchedDomains.length === 0 && transferableSkills.length === 0) {
        // Major mismatch
        reasons.push(
          `❌ Significant domain mismatch: This role requires ${mismatchNames.join(', ')} experience, ` +
          `but your expertise is in ${userNames.join(', ')}`
        );
      } else {
        // Partial mismatch
        reasons.push(
          `⚠️ Gap in ${mismatchNames.join(', ')} - consider highlighting transferable skills in your application`
        );
      }
    }

    return reasons.join('. ');
  }
}

/**
 * Default domain matcher instance (keyword-based)
 * Can be swapped for AI-based matcher in the future
 */
export const domainMatcher: IDomainMatcher = new KeywordDomainMatcher();

/**
 * Convenience function for quick domain detection
 */
export function detectJobDomains(jobTitle: string, jobDescription: string): string[] {
  return domainMatcher.detectJobDomains(jobTitle, jobDescription);
}

/**
 * Convenience function for quick domain matching
 */
export function matchDomains(
  cvContent: string,
  userDomains: string[],
  jobDomains: string[]
): DomainMatchResult {
  return domainMatcher.matchUserDomains(cvContent, userDomains, jobDomains);
}

