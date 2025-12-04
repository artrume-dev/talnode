/**
 * AI Job Analysis Modal Component
 *
 * Displays detailed 5-category AI analysis of job fit
 * Uses GPT-4o Mini to provide strategic insights
 */

import { useEffect, useRef } from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Lightbulb, Target, Star, Wrench, Zap, Info, CheckCircle2 } from 'lucide-react';
import { CategoryCard } from './CategoryCard';
import type { AIJobAnalysisResult, ReasoningStep } from '../services/api';

interface AIJobAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    id: number;
    title: string;
    company: string;
  };
  analysis: AIJobAnalysisResult | null;
  isLoading: boolean;
  reasoningSteps?: ReasoningStep[];
}

export function AIJobAnalysisModal({
  isOpen,
  onClose,
  job,
  analysis,
  isLoading,
  reasoningSteps = [],
}: AIJobAnalysisModalProps) {
  if (!isOpen) return null;

  // Auto-scroll to latest step
  const stepsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reasoningSteps.length > 0 && stepsEndRef.current) {
      stepsEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [reasoningSteps]);

  const getStepIcon = (type: ReasoningStep['type']) => {
    switch (type) {
      case 'tool_call':
        return <Wrench className="w-4 h-4 text-blue-500" />;
      case 'tool_result':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'analysis':
        return <Zap className="w-4 h-4 text-purple-500" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStepColor = (type: ReasoningStep['type']) => {
    switch (type) {
      case 'tool_call':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'tool_result':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'analysis':
        return 'bg-purple-50 border-purple-200 text-purple-900';
      case 'complete':
        return 'bg-green-100 border-green-300 text-green-900';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'pass':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {job.title} at {job.company}
              </h2>
              <p className="text-sm text-gray-500 mt-1">AI Job Fit Analysis</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="space-y-6">
                {/* Loading Animation */}
                <div className="flex items-center justify-center py-4">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Analyzing job fit with AI...</p>
                    <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
                  </div>
                </div>

                {/* Reasoning Steps */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-600" />
                    Reasoning Steps
                    {reasoningSteps.length > 0 && (
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        ({reasoningSteps.length} steps)
                      </span>
                    )}
                  </h3>
                  {reasoningSteps.length === 0 ? (
                    <div className="text-sm text-gray-500 italic py-4">
                      Waiting for analysis to start...
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {reasoningSteps.map((step, index) => (
                        <div
                          key={index}
                          className={`flex items-start gap-3 p-3 rounded-lg border ${getStepColor(step.type)} transition-all`}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {getStepIcon(step.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{step.message || 'No message'}</p>
                            {step.data && (
                              <div className="mt-2 text-xs opacity-75">
                                {step.type === 'tool_result' && step.data.tool === 'extract_skills' && (
                                  <div>
                                    <span className="font-semibold">Skills found:</span>{' '}
                                    {step.data.skills?.slice(0, 5).join(', ')}
                                    {step.data.skills?.length > 5 && ` +${step.data.skills.length - 5} more`}
                                  </div>
                                )}
                                {step.type === 'tool_result' && step.data.tool === 'calculate_similarity' && (
                                  <div>
                                    <span className="font-semibold">Score:</span> {step.data.score?.toFixed(1)}% •{' '}
                                    <span className="font-semibold">Type:</span> {step.data.comparison_type}
                                  </div>
                                )}
                                {step.type === 'analysis' && step.data.overall_score && (
                                  <div>
                                    <span className="font-semibold">Overall Score:</span> {step.data.overall_score}% •{' '}
                                    <span className="font-semibold">Recommendation:</span> {step.data.recommendation}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-xs text-gray-500">
                            {new Date(step.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                      <div ref={stepsEndRef} />
                    </div>
                  )}
                </div>
              </div>
            ) : analysis ? (
              <div className="space-y-6">
                {/* Overall Summary */}
                <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-shrink-0">
                    <div className="text-4xl font-bold text-gray-900">
                      {analysis.overall_score}%
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < analysis.overall_stars
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'fill-gray-200 text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div
                      className={`inline-flex items-center px-4 py-2 rounded-full border font-semibold ${getRecommendationColor(
                        analysis.recommendation
                      )}`}
                    >
                      {analysis.recommendation.toUpperCase()} PRIORITY
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Overall job fit based on 5-category weighted analysis
                    </p>
                  </div>
                </div>

                {/* 5 Category Breakdown */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Detailed Analysis
                  </h3>
                  <div className="space-y-4">
                    <CategoryCard
                      title="Role Alignment"
                      weight="30%"
                      score={analysis.role_alignment.score}
                      stars={analysis.role_alignment.stars}
                      reasoning={analysis.role_alignment.reasoning}
                    />
                    <CategoryCard
                      title="Technical Match"
                      weight="25%"
                      score={analysis.technical_match.score}
                      stars={analysis.technical_match.stars}
                      reasoning={analysis.technical_match.reasoning}
                    />
                    <CategoryCard
                      title="Company Fit"
                      weight="20%"
                      score={analysis.company_fit.score}
                      stars={analysis.company_fit.stars}
                      reasoning={analysis.company_fit.reasoning}
                    />
                    <CategoryCard
                      title="Growth Potential"
                      weight="15%"
                      score={analysis.growth_potential.score}
                      stars={analysis.growth_potential.stars}
                      reasoning={analysis.growth_potential.reasoning}
                    />
                    <CategoryCard
                      title="Practical Factors"
                      weight="10%"
                      score={analysis.practical_factors.score}
                      stars={analysis.practical_factors.stars}
                      reasoning={analysis.practical_factors.reasoning}
                    />
                  </div>
                </div>

                {/* Strong Matches & Gaps */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Strong Matches
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.strong_matches.map((match, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                        >
                          {match}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      Gaps to Address
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.gaps.map((gap, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800"
                        >
                          {gap}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Red Flags */}
                {analysis.red_flags && analysis.red_flags.length > 0 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-900 mb-2">Red Flags</h4>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-red-800">
                          {analysis.red_flags.map((flag, i) => (
                            <li key={i}>{flag}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Application Strategy */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-2">
                        Application Strategy
                      </h4>
                      <p className="text-sm text-blue-800">{analysis.application_strategy}</p>
                    </div>
                  </div>
                </div>

                {/* Talking Points */}
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900 mb-2">
                        Key Talking Points
                      </h4>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-purple-800">
                        {analysis.talking_points.map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-200">
                  Analysis powered by GPT-4o Mini • Results cached for performance
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600">Failed to load analysis</p>
                <p className="text-sm text-gray-500 mt-2">Please try again</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
