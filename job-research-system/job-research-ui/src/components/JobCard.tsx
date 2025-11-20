import { Button } from './ui/button';
import { ExternalLink, Sparkles } from 'lucide-react';
import type { Job } from '../types';

interface JobCardProps {
  job: Job;
  onOptimizeCV?: (job: Job) => void;
}

export function JobCard({ job, onOptimizeCV }: JobCardProps) {
  // Get job type from location/remote field
  const jobType = job.remote ? 'Remote' : job.location || 'Unknown';

  // Format match score - handle null/undefined
  const matchScore = job.alignment_score !== null && job.alignment_score !== undefined
    ? `${job.alignment_score}%`
    : 'Not analyzed';

  return (
    <div className="border-b border-border last:border-0 py-3 px-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Job Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <h3 className="font-semibold text-base truncate">{job.title}</h3>
            <span className="text-sm text-muted-foreground shrink-0">at {job.company}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{jobType}</span>
            <span>•</span>
            <span className="font-medium">{matchScore}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(job.url, '_blank')}
            className="gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            View Job
          </Button>
          {onOptimizeCV && (
            <Button
              size="sm"
              onClick={() => onOptimizeCV(job)}
              className="gap-1"
            >
              <Sparkles className="h-3 w-3" />
              Optimize CV
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
