import { useJobStore } from '../store/jobStore';
import { useUIStore } from '../store/uiStore';
import { JobCard } from './JobCard';
import { JobPagination } from './JobPagination';
import { Button } from './ui/button';
import { Briefcase, Filter } from 'lucide-react';
import type { Job } from '../types';

interface JobsListProps {
  onCompanySelectorOpen?: () => void;
}

export function JobsList({ onCompanySelectorOpen }: JobsListProps) {
  const { paginatedJobs, selectedCompanies, filteredJobs, setSelectedJobId } = useJobStore();
  const { setRightPanelView } = useUIStore();

  const jobs = paginatedJobs();
  const allFilteredJobs = filteredJobs();

  const handleOptimizeCV = (job: Job) => {
    console.log('🎯 Optimize CV clicked for:', job.title, 'ID:', job.id);
    // Set the selected job in the store
    setSelectedJobId(job.id);
    console.log('✅ Selected job ID set');
    // Switch right panel to optimizer view
    setRightPanelView('optimizer');
    console.log('✅ Right panel view set to optimizer');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Job Opportunities
            </h2>
            {selectedCompanies.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Showing jobs from {selectedCompanies.length} selected companies
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onCompanySelectorOpen}
          >
            <Filter className="h-4 w-4" />
            Select Companies ({selectedCompanies.length})
          </Button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="flex-1 overflow-y-auto">
        {/* Empty State - No Companies Selected */}
        {selectedCompanies.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Filter className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No Companies Selected</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Select companies to search for job opportunities. Choose from 20+ AI companies or add your own.
            </p>
            <Button onClick={onCompanySelectorOpen} className="gap-2">
              <Filter className="h-4 w-4" />
              Select Companies
            </Button>
          </div>
        )}

        {/* Empty State - No Jobs Found */}
        {selectedCompanies.length > 0 && allFilteredJobs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Briefcase className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No Jobs Found</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              No jobs found for the selected companies. Try selecting more companies or check back later.
            </p>
            <Button variant="outline" onClick={onCompanySelectorOpen}>
              Change Company Selection
            </Button>
          </div>
        )}

        {/* Jobs List */}
        {allFilteredJobs.length > 0 && (
          <div className="divide-y divide-border">
            {jobs.map((job) => (
              <JobCard
                key={job.job_id}
                job={job}
                onOptimizeCV={handleOptimizeCV}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {allFilteredJobs.length > 0 && <JobPagination />}
    </div>
  );
}
