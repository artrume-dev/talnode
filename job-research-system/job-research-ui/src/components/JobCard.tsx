import { useState, useEffect, useMemo } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Building2, MapPin, ExternalLink, Sparkles, Info } from 'lucide-react';
import { ScoreBreakdownDialog } from './ScoreBreakdownDialog';
import { AIJobAnalysisModal } from './AIJobAnalysisModal';
import { analyzeJobWithAI, type ReasoningStep } from '../services/api';
import type { AIJobAnalysisResult } from '../services/api';
import type { Job } from '../types';
import { useUserStore } from '../store/userStore';

interface JobCardProps {
  job: Job;
  isSelected?: boolean;
  onSelect?: (job: Job) => void;
}

// Helper to get stored analysis for a job
const getStoredAnalysis = (jobId: number, cvVersion: string): AIJobAnalysisResult | null => {
  try {
    const key = `job_analysis_${jobId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const data = JSON.parse(stored);
    // Check if analysis is for current CV version
    if (data.cvVersion !== cvVersion) {
      return null; // Analysis is stale
    }
    return data.analysis;
  } catch (error) {
    console.error('Error reading stored analysis:', error);
    return null;
  }
};

// Helper to store analysis for a job
const storeAnalysis = (jobId: number, analysis: AIJobAnalysisResult, cvVersion: string): void => {
  try {
    const key = `job_analysis_${jobId}`;
    localStorage.setItem(key, JSON.stringify({ analysis, cvVersion, timestamp: Date.now() }));
  } catch (error) {
    console.error('Error storing analysis:', error);
  }
};

// Helper to get current CV version identifier
const getCurrentCVVersion = (cvDocuments: any[], activeCVId: number | null): string => {
  if (!activeCVId) return 'no-cv';
  const activeCV = cvDocuments.find(cv => cv.id === activeCVId);
  return activeCV ? `${activeCVId}_${activeCV.uploaded_at}` : `${activeCVId}_unknown`;
};

// Helper to check if there's any stored analysis (even if stale)
const hasAnyStoredAnalysis = (jobId: number): boolean => {
  try {
    const key = `job_analysis_${jobId}`;
    const stored = localStorage.getItem(key);
    return !!stored;
  } catch (error) {
    return false;
  }
};

export function JobCard({ job, isSelected = false, onSelect }: JobCardProps) {
  const { cvDocuments, activeCVId } = useUserStore();
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [showAIAnalysisModal, setShowAIAnalysisModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIJobAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasPreviousAnalysis, setHasPreviousAnalysis] = useState(false);

  // Memoize the current CV version to prevent unnecessary re-renders
  const currentCVVersion = useMemo(() => {
    return getCurrentCVVersion(cvDocuments, activeCVId);
  }, [activeCVId, cvDocuments.find(cv => cv.id === activeCVId)?.uploaded_at]);

  // Load analysis from localStorage on mount and when CV version actually changes
  useEffect(() => {
    const stored = getStoredAnalysis(Number(job.id), currentCVVersion);
    const hasAnyAnalysis = hasAnyStoredAnalysis(Number(job.id));

    setHasPreviousAnalysis(hasAnyAnalysis);

    if (stored) {
      setAiAnalysis(stored);
      console.log(`📊 Loaded stored analysis for job ${job.id} with CV version ${currentCVVersion}`);
    } else {
      // CV version changed or no analysis exists
      setAiAnalysis(null);
      if (hasAnyAnalysis) {
        console.log(`🔄 Stale analysis detected for job ${job.id}, needs re-analysis`);
      } else {
        console.log(`🔄 No analysis for job ${job.id}`);
      }
    }
  }, [job.id, currentCVVersion]);

  // Get job type from location/remote field
  const workType = job.remote ? 'Remote' : 'Hybrid';
  const location = job.location || 'London, UK';

  // Get AI analysis score color classes
  const getAIScoreColorClasses = (score: number) => {
    if (score >= 70) return 'text-green-700 bg-green-50 border-green-300 hover:bg-green-100';
    if (score >= 50) return 'text-orange-700 bg-orange-50 border-orange-300 hover:bg-orange-100';
    return 'text-red-700 bg-red-50 border-red-300 hover:bg-red-100';
  };

  const handleClick = () => {
    if (onSelect) {
      onSelect(job);
    }
  };

  const handleViewJobClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(job.url, '_blank');
  };

  const handleAIAnalysisClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Use active CV ID from store
    const cvId = activeCVId || 1;

    setShowAIAnalysisModal(true);
    setIsAnalyzing(true);
    setReasoningSteps([]); // Clear previous steps
    setAiAnalysis(null); // Clear previous analysis
    setHasPreviousAnalysis(false); // Reset previous analysis flag

    try {
      console.log('🚀 Starting AI analysis with streaming...', { jobId: job.id, cvId });

      // Try streaming first
      try {
        const analysis = await analyzeJobWithAI(Number(job.id), cvId, (step) => {
          console.log('📊 Progress step received in JobCard:', {
            type: step.type,
            message: step.message || 'No message',
            timestamp: step.timestamp,
          });

          setReasoningSteps((prev) => {
            const updated = [...prev, step];
            console.log('📊 Updated reasoning steps array. New length:', updated.length);
            console.log('📊 Steps:', updated.map(s => ({
              type: s.type,
              msg: s.message ? s.message.substring(0, 30) : 'No message'
            })));
            return updated;
          });
        });

        console.log('✅ Analysis complete:', analysis);
        setAiAnalysis(analysis);

        // Store analysis with current CV version
        const currentCVVersion = getCurrentCVVersion(cvDocuments, cvId);
        storeAnalysis(Number(job.id), analysis, currentCVVersion);
        console.log(`💾 Stored analysis for job ${job.id} with CV version ${currentCVVersion}`);
      } catch (streamError) {
        console.warn('⚠️ Streaming failed, trying non-streaming mode:', streamError);

        // Fallback to non-streaming mode
        setReasoningSteps((prev) => [
          ...prev,
          {
            type: 'info',
            message: 'Streaming unavailable, using standard mode...',
            timestamp: Date.now(),
          },
        ]);

        const analysis = await analyzeJobWithAI(Number(job.id), cvId);
        console.log('✅ Analysis complete (non-streaming):', analysis);
        setAiAnalysis(analysis);

        // Store analysis with current CV version
        const currentCVVersion = getCurrentCVVersion(cvDocuments, cvId);
        storeAnalysis(Number(job.id), analysis, currentCVVersion);
        console.log(`💾 Stored analysis for job ${job.id} with CV version ${currentCVVersion}`);
      }
    } catch (error) {
      console.error('❌ Failed to analyze job with AI:', error);
      setAiAnalysis(null);
      setReasoningSteps((prev) => [
        ...prev,
        {
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to analyze job',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <ScoreBreakdownDialog
        job={job}
        open={showScoreDialog}
        onOpenChange={setShowScoreDialog}
      />
      <AIJobAnalysisModal
        isOpen={showAIAnalysisModal}
        onClose={() => {
          setShowAIAnalysisModal(false);
          setReasoningSteps([]); // Clear steps when closing
        }}
        job={{ id: Number(job.id), title: job.title, company: job.company }}
        analysis={aiAnalysis}
        isLoading={isAnalyzing}
        reasoningSteps={reasoningSteps}
      />
      <div
      className={`border-b border-gray-200 last:border-b-0 py-6 transition-all duration-200 cursor-pointer group relative ${
        isSelected
          ? 'bg-blue-50 border-l-4 !border-l-blue-600 pl-3 pr-4'
          : 'hover:bg-gray-50 border-l-4 border-l-transparent px-4'
      }`}
      onClick={handleClick}
    >
      <div className="">
        {/* Job Title */}
        <h3 className={`font-semibold text-base leading-tight mb-2 ${
          isSelected ? 'text-blue-700' : 'text-gray-900'
        }`}>
          {job.title}
        </h3>

        {/* Company and Location Row */}
        <div className="flex items-center gap-2 text-xs font-normal text-gray-600 mb-6">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3 w-3 text-gray-500" />
            <span>{job.company}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="h-3 w-3 text-gray-500" />
            <span>{location}</span>
          </div>
          <Badge variant="secondary" className="ml-2 font-medium bg-gray-50 border border-gray-300 text-gray-900 hover:bg-gray-100 text-[10px] px-3 py-0.5 rounded-md">
            {workType}
          </Badge>
        </div>

        {/* Employment Type and Match Score Row */}
        {/* <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 border-gray-300 text-gray-700 font-normal">
              {employmentType}
            </Badge>
            {matchScore !== null ? (
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-normal px-2.5 py-0.5 rounded-full border ${matchColorClasses}`}>
                  {matchScore}% Match
                </span>
                <button
                  onClick={handleScoreInfoClick}
                  className="text-gray-400 hover:text-blue-600 transition-colors p-0.5 rounded hover:bg-blue-50"
                  title="View match score breakdown"
                  aria-label="View match score details"
                >
                  <Info className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-gray-400 italic" title="Click 'Analyze All Jobs' to calculate match score">
                Not Analyzed
              </span>
            )}
          </div>
        </div> */}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs h-7"
            onClick={handleViewJobClick}
          >
            <ExternalLink className="h-3 w-3" />
            View Job
          </Button>
          <div className="flex items-center gap-1.5">
            {isAnalyzing ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs h-7 bg-purple-50 border border-purple-300 text-purple-900 hover:bg-purple-100"
                disabled={true}
              >
                <Sparkles className="h-3 w-3 text-purple-600" />
                Analyzing...
              </Button>
            ) : aiAnalysis ? (
              <Button
                size="sm"
                variant="outline"
                className={`gap-1 hover:text-${getAIScoreColorClasses(aiAnalysis.overall_score)} text-xs h-7 font-medium border ${getAIScoreColorClasses(aiAnalysis.overall_score)}`}
                onClick={handleAIAnalysisClick}
                title="Click to view analysis details"
              >
                <Sparkles className="h-3 w-3" />
                {Math.round(aiAnalysis.overall_score)}% Match
              </Button>
            ) : hasPreviousAnalysis ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs h-7 bg-blue-50 border border-blue-300 text-blue-900 hover:text-blue-900 hover:bg-blue-200"
                onClick={handleAIAnalysisClick}
                title="CV updated - re-analyse job with new CV"
              >
                <Sparkles className="h-3 w-3 text-blue-600" />
                Re-analyse Job
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs h-7 bg-purple-50 border border-purple-300 text-purple-900 hover:text-purple-900 hover:bg-purple-100"
                onClick={handleAIAnalysisClick}
              >
                <Sparkles className="h-3 w-3 text-purple-600" />
                AI Job Analysis
              </Button>
            )}
            {!isAnalyzing && (
              <div
                className="relative"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <Info
                  className="h-4 w-4 text-gray-400 hover:text-purple-600 cursor-help transition-colors"
                  aria-label="AI Job Analysis information"
                />
                {showTooltip && (
                  <div className="fixed px-3 py-2 bg-gray-900 text-white text-xs rounded-md shadow-xl z-[9999] w-72 pointer-events-none" style={{
                    bottom: 'auto',
                    top: `${document.querySelector('[aria-label="AI Job Analysis information"]')?.getBoundingClientRect().top - 120}px`,
                    left: `${document.querySelector('[aria-label="AI Job Analysis information"]')?.getBoundingClientRect().left - 130}px`
                  }}>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                    <p className="font-semibold mb-1.5 text-white">AI Job Analysis</p>
                    <p className="text-gray-300 leading-relaxed text-xs">
                      Get comprehensive job fit analysis powered LLM. Analyzes 5 key categories: Role Alignment, Technical Match, Company Fit, Growth Potential, and Practical Factors. Uses advanced tool calling for consistent, data-driven scoring.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
