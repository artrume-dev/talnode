import { useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Building2, MapPin, ExternalLink, Info, Sparkles } from 'lucide-react';
import { ScoreBreakdownDialog } from './ScoreBreakdownDialog';
import { AIJobAnalysisModal } from './AIJobAnalysisModal';
import { analyzeJobWithAI, type ReasoningStep } from '../services/api';
import type { AIJobAnalysisResult } from '../services/api';
import type { Job } from '../types';

interface JobCardProps {
  job: Job;
  isSelected?: boolean;
  onSelect?: (job: Job) => void;
}

export function JobCard({ job, isSelected = false, onSelect }: JobCardProps) {
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [showAIAnalysisModal, setShowAIAnalysisModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIJobAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]);

  // Get job type from location/remote field
  const workType = job.remote ? 'Remote' : 'Hybrid';
  const location = job.location || 'London, UK';

  // Format match score - handle null/undefined
  const matchScore = job.alignment_score !== null && job.alignment_score !== undefined
    ? job.alignment_score
    : null;

  // Determine employment type (default to Full-time if not specified)
  const employmentType = 'Full-time'; // Could be extracted from job data if available

  // Determine match score color based on value
  const getMatchColorClasses = (score: number | null) => {
    if (score === null) return 'text-gray-400 bg-transparent border-transparent';
    if (score >= 70) return 'text-green-700 bg-green-50 border-green-300';
    if (score >= 50) return 'text-orange-700 bg-orange-50 border-orange-300';
    return 'text-red-700 bg-red-50 border-red-300';
  };

  const matchColorClasses = getMatchColorClasses(matchScore);

  const handleClick = () => {
    if (onSelect) {
      onSelect(job);
    }
  };

  const handleViewJobClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(job.url, '_blank');
  };

  const handleScoreInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowScoreDialog(true);
  };

  const handleAIAnalysisClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Get active CV ID from localStorage or default to 1
    const activeCVId = parseInt(localStorage.getItem('active_cv_id') || '1');

    setShowAIAnalysisModal(true);
    setIsAnalyzing(true);
    setReasoningSteps([]); // Clear previous steps
    setAiAnalysis(null); // Clear previous analysis

    try {
      console.log('🚀 Starting AI analysis with streaming...', { jobId: job.id, cvId: activeCVId });
      
      // Try streaming first
      try {
        const analysis = await analyzeJobWithAI(Number(job.id), activeCVId, (step) => {
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
        
        const analysis = await analyzeJobWithAI(Number(job.id), activeCVId);
        console.log('✅ Analysis complete (non-streaming):', analysis);
        setAiAnalysis(analysis);
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
      className={`border-b border-gray-200 last:border-b-0 py-4 transition-all duration-200 cursor-pointer group relative ${
        isSelected
          ? 'bg-blue-50 border-l-4 !border-l-blue-600 pl-3 pr-4'
          : 'hover:bg-gray-50 border-l-4 border-l-transparent px-4'
      }`}
      onClick={handleClick}
    >
      <div className="space-y-2">
        {/* Job Title */}
        <h3 className={`font-semibold text-base leading-tight ${
          isSelected ? 'text-blue-600' : 'text-gray-900'
        }`}>
          {job.title}
        </h3>

        {/* Company and Location Row */}
        <div className="flex items-center gap-2 text-xs font-normal text-gray-600">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-gray-400" />
            <span>{job.company}</span>
          </div>
          <span className="text-gray-300">•</span>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span>{location}</span>
          </div>
          <Badge variant="secondary" className="ml-1 bg-gray-100 text-gray-700 hover:bg-gray-100 text-xs px-2 py-0">
            {workType}
          </Badge>
        </div>

        {/* Employment Type and Match Score Row */}
        <div className="flex items-center justify-between">
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
        </div>

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
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs h-7 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border-purple-200"
            onClick={handleAIAnalysisClick}
            disabled={isAnalyzing}
          >
            <Sparkles className="h-3 w-3 text-purple-600" />
            {isAnalyzing ? 'Analyzing...' : 'AI Job Analysis'}
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}
