import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { Job } from '../types';

interface ScoreBreakdownDialogProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScoreBreakdownDialog({ job, open, onOpenChange }: ScoreBreakdownDialogProps) {
  if (!job) return null;

  const matchScore = job.alignment_score ?? 0;
  const strongMatches = job.strong_matches || [];
  const gaps = job.gaps || [];

  // Determine score color and recommendation
  const getScoreInfo = (score: number) => {
    if (score >= 70) {
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        recommendation: 'High Match',
        message: 'Strong alignment with your experience',
      };
    } else if (score >= 50) {
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        recommendation: 'Medium Match',
        message: 'Good alignment with some gaps',
      };
    } else {
      return {
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        recommendation: 'Low Match',
        message: 'Limited alignment with requirements',
      };
    }
  };

  const scoreInfo = getScoreInfo(matchScore);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Match Score Breakdown
          </DialogTitle>
          <DialogDescription>
            {job.company} • {job.title}
          </DialogDescription>
        </DialogHeader>

        {/* Score Summary */}
        <div className={`p-4 rounded-lg border ${scoreInfo.bgColor} ${scoreInfo.borderColor}`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className={`text-3xl font-bold ${scoreInfo.color}`}>
                {matchScore}%
              </div>
              <div className="text-sm font-medium text-gray-700 mt-1">
                {scoreInfo.recommendation}
              </div>
            </div>
            <Badge variant="secondary" className={`${scoreInfo.bgColor} ${scoreInfo.color} border-0`}>
              {scoreInfo.message}
            </Badge>
          </div>
        </div>

        {/* Strong Matches */}
        {strongMatches.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">
                Strong Matches ({strongMatches.length})
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {strongMatches.map((match, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                >
                  ✓ {match}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              These keywords appear in both the job requirements and your CV
            </p>
          </div>
        )}

        {/* Gaps */}
        {gaps.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="h-5 w-5 text-orange-600" />
              <h3 className="font-semibold text-gray-900">
                Skill Gaps ({gaps.length})
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {gaps.map((gap, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100"
                >
                  ! {gap}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              These keywords appear in the job requirements but not in your CV
            </p>
          </div>
        )}

        {/* No Analysis Yet */}
        {matchScore === 0 && strongMatches.length === 0 && gaps.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">
              This job hasn't been analyzed yet. Click "Analyze All Jobs" to calculate the match score.
            </p>
          </div>
        )}

        {/* Strategic Advice */}
        {matchScore > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <h4 className="font-semibold text-gray-900 text-sm mb-2">
              💡 Strategic Advice
            </h4>
            <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
              {matchScore >= 70 && (
                <>
                  <li>Your experience aligns well with this role</li>
                  <li>Emphasize your strong matches in your application</li>
                  <li>Mention transferable skills for any gaps</li>
                </>
              )}
              {matchScore >= 50 && matchScore < 70 && (
                <>
                  <li>Focus on your transferable skills and relevant experience</li>
                  <li>Address skill gaps by highlighting quick learning ability</li>
                  <li>Tailor your CV to emphasize the strong matches</li>
                </>
              )}
              {matchScore < 50 && (
                <>
                  <li>Consider if this role aligns with your career goals</li>
                  <li>Upskill in the gap areas if you're serious about this domain</li>
                  <li>Look for junior or transitional roles in this field</li>
                </>
              )}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
