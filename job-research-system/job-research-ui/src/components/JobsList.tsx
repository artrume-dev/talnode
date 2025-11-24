import { useState } from 'react';
import { useJobStore } from '../store/jobStore';
import { useUIStore } from '../store/uiStore';
import { useUserStore } from '../store/userStore';
import { JobCard } from './JobCard';
import { JobPagination } from './JobPagination';
import { FilterModal } from './FilterModal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Briefcase, X, Search, AlertCircle, Filter as FilterIcon, RefreshCw, SlidersHorizontal } from 'lucide-react';
import type { Job } from '../types';
import api from '../services/api';

interface JobsListProps {
  onCompanySelectorOpen?: () => void;
}

export function JobsList({ onCompanySelectorOpen }: JobsListProps) {
  const {
    paginatedJobs,
    selectedCompanies,
    filteredJobs,
    setSelectedJobId,
    jobs: allJobs,
    clearFilters,
    setSearchQuery,
    deselectAllCompanies,
    setUsePreferences,
    usePreferences,
    searchQuery,
    selectedJobId,
    loadJobs,
    isLoading
  } = useJobStore();
  const { setRightPanelView, openEditProfile, showAlert } = useUIStore();
  const { profile, activeCVId, updateProfile } = useUserStore();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const jobs = paginatedJobs();
  const allFilteredJobs = filteredJobs();
  
  // Calculate filtering breakdown
  const userProfile = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('user-storage') || '{}')?.state?.profile 
    : null;
  
  const activeFilters: Array<{label: string; type: string}> = [];
  
  // Only show preference filters if usePreferences is true
  if (usePreferences && userProfile) {
    if (userProfile?.preferred_locations) {
      try {
        const locs = JSON.parse(userProfile.preferred_locations);
        if (locs.length > 0) activeFilters.push({label: locs.join(', '), type: 'location'});
      } catch (e) {}
    }
    if (userProfile?.preferred_industries) {
      try {
        const inds = JSON.parse(userProfile.preferred_industries);
        if (inds.length > 0) activeFilters.push({label: inds.join(', '), type: 'industries'});
      } catch (e) {}
    }
    if (userProfile?.preferred_job_types) {
      try {
        const types = JSON.parse(userProfile.preferred_job_types);
        if (types.length > 0) activeFilters.push({label: types.join(', '), type: 'types'});
      } catch (e) {}
    }
  }
  
  if (selectedCompanies.length > 0) {
    activeFilters.push({label: `${selectedCompanies.length} selected`, type: 'companies'});
  }
  if (searchQuery) {
    activeFilters.push({label: `"${searchQuery}"`, type: 'search'});
  }
  
  console.log('🏷️ Active filters:', activeFilters);
  
  const hasActiveFilters = activeFilters.length > 0 || selectedCompanies.length > 0 || !usePreferences;
  const hasPreferences = profile?.preferred_locations || profile?.preferred_industries || profile?.preferred_job_types;

  const handleClearAllFilters = () => {
    clearFilters();
    setSearchQuery('');
    deselectAllCompanies();
    setUsePreferences(false); // Disable preference-based filtering
  };

  const handleRemoveFilter = (filterType: string) => {
    console.log('🗑️ Removing filter:', filterType);
    if (filterType === 'search') {
      setSearchQuery('');
    } else if (filterType === 'companies') {
      deselectAllCompanies();
    } else if (filterType === 'location') {
      // Clear location preference
      updateProfile({ preferred_locations: '[]' });
      // If all preferences are now empty, disable preference filtering
      checkAndDisablePreferences('location');
    } else if (filterType === 'industries') {
      // Clear industries preference
      updateProfile({ preferred_industries: '[]' });
      checkAndDisablePreferences('industries');
    } else if (filterType === 'types') {
      // Clear job types preference
      updateProfile({ preferred_job_types: '[]' });
      checkAndDisablePreferences('types');
    }
  };

  const checkAndDisablePreferences = (clearedType: string) => {
    // Check if all other preference types are also empty
    const userProfile = typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('user-storage') || '{}')?.state?.profile 
      : null;
    
    if (!userProfile) return;

    const hasLocation = clearedType !== 'location' && userProfile.preferred_locations && 
                        JSON.parse(userProfile.preferred_locations || '[]').length > 0;
    const hasIndustries = clearedType !== 'industries' && userProfile.preferred_industries && 
                          JSON.parse(userProfile.preferred_industries || '[]').length > 0;
    const hasTypes = clearedType !== 'types' && userProfile.preferred_job_types && 
                     JSON.parse(userProfile.preferred_job_types || '[]').length > 0;

    // If no preferences remain, disable preference filtering
    if (!hasLocation && !hasIndustries && !hasTypes) {
      setUsePreferences(false);
    }
  };

  const handleShowAllJobs = () => {
    setUsePreferences(false);
    clearFilters();
    setSearchQuery('');
    deselectAllCompanies();
  };
  
  // Debug logging
  console.log('📊 Jobs Stats:', {
    total: allJobs.length,
    filtered: allFilteredJobs.length,
    paginated: jobs.length,
    selectedCompanies: selectedCompanies.length
  });

  const handleAnalyzeAllJobs = async () => {
    if (!activeCVId) {
      showAlert({
        title: 'No CV Available',
        description: 'Please upload a CV first to analyze jobs',
        confirmText: 'OK',
        variant: 'default',
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await api.post('/jobs/analyze-all', {
        cv_id: activeCVId,
      });

      const data = response.data;
      console.log(`✅ Analyzed ${data.analyzed_count} jobs`);
      if (data.failed_count > 0) {
        console.warn(`⚠️ Failed to analyze ${data.failed_count} jobs`);
      }

      // Reload jobs to get updated scores from database
      await loadJobs();
      showAlert({
        title: 'Analysis Complete',
        description: `Successfully analyzed ${data.analyzed_count} jobs!`,
        confirmText: 'OK',
        variant: 'success',
      });
    } catch (error) {
      console.error('Job analysis failed:', error);
      showAlert({
        title: 'Analysis Failed',
        description: 'Failed to analyze jobs. Please try again.',
        confirmText: 'OK',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectJob = (job: Job) => {
    console.log('🎯 Job selected:', job.title, 'ID:', job.id);
    // Set the selected job in the store but keep showing CV preview
    setSelectedJobId(job.id);
    console.log('✅ Selected job ID set');
  };

  const handleOptimizeCV = (job: Job) => {
    console.log('🎯 Optimize CV clicked for:', job.title, 'ID:', job.id);
    // Set the selected job in the store
    setSelectedJobId(job.id);
    console.log('✅ Selected job ID set');
    // Switch right panel to optimizer view
    setRightPanelView('optimizer');
    console.log('✅ Right panel view set to optimizer');
  };

  const handleApplyFilters = (filters: { locations: string[]; jobTypes: string[] }) => {
    console.log('🔍 Applying filters:', filters);

    // Update user profile with new filter preferences
    updateProfile({
      preferred_locations: JSON.stringify(filters.locations),
      preferred_job_types: JSON.stringify(filters.jobTypes),
    });

    // Enable preference-based filtering
    setUsePreferences(true);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Ribbon Alert for Filtered Jobs */}
      {hasActiveFilters && allFilteredJobs.length > 0 && allFilteredJobs.length < allJobs.length && (
        <div className="bg-white border-b border-gray-200 px-5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-800">
            <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-md">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="font-medium text-xs text-green-800">AI Analysis Ready</span>
            </div>
            <span className="text-xs">
              {allFilteredJobs.length} of {allJobs.length} jobs matched.
            </span>
            <button
              onClick={openEditProfile}
              className="text-blue-800 underline hover:text-gray-700 font-medium text-xs"
            >
              Update preferences
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-700 hover:text-gray-900 h-6"
            onClick={handleShowAllJobs}
          >
            Show All Jobs
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50/90 px-5 py-2">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">Opportunities</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyzeAllJobs}
                disabled={isAnalyzing || !activeCVId}
                className="gap-1.5 text-xs h-7"
              >
                <RefreshCw className={`h-3 w-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                {isAnalyzing ? 'Analyzing...' : 'Analyze All Jobs'}
              </Button>
              <span className="text-xs font-normal text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
                {allFilteredJobs.length} found
              </span>
            </div>
          </div>

          {/* Filter Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Filter by role or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 border-gray-300 bg-white"
            />
          </div>

          {/* Active Filter Tags */}
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            {/* Filter Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterModalOpen(true)}
              className="h-6 p-2 gap-2 text-xs border-gray-300 rounded-md shadow-xs"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </Button>

            {/* Show only first 2 active filters */}
            {activeFilters.slice(0, 2).map((filter, idx) => {
              console.log('🎨 Rendering filter tag:', filter);
              return (
                <Badge
                  key={`${filter.type}-${idx}`}
                  variant="outline"
                  className="rounded-sm bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 text-[10px] flex items-center gap-2 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => {
                    console.log('🗑️ Removing filter:', filter.type);
                    handleRemoveFilter(filter.type);
                  }}
                >
                  <span>{filter.label}</span>
                  <X className="h-3 w-3" />
                </Badge>
              );
            })}

            {/* Show "+X more" badge if there are more than 2 filters */}
            {activeFilters.length > 2 && (
              <Badge
                variant="outline"
                className="text-blue-700 px-3 py-1 text-[10px] cursor-pointer border-none"
                onClick={() => setIsFilterModalOpen(true)}
              >
                +{activeFilters.length - 2} more
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="flex-1 overflow-y-auto">
        {/* Empty State - No Jobs Found */}
        {allFilteredJobs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="mb-4 h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="font-semibold mb-2 text-lg">No Matching Jobs Found</h3>

            {hasActiveFilters && allJobs.length > 0 ? (
              <>
                <p className="text-xs text-gray-600 mb-4 max-w-md">
                  No jobs match your current filters and preferences. {allJobs.length} total jobs available.
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleShowAllJobs} className="gap-2">
                    <FilterIcon className="h-4 w-4" />
                    Show All {allJobs.length} Jobs
                  </Button>
                  {hasPreferences && (
                    <Button variant="outline" onClick={openEditProfile} className="gap-2">
                      <FilterIcon className="h-4 w-4" />
                      Update Preferences
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4 max-w-md">
                  No jobs found. Try selecting companies or adjusting your preferences.
                </p>
                <div className="flex gap-2">
                  <Button onClick={onCompanySelectorOpen} className="gap-2">
                    <FilterIcon className="h-4 w-4" />
                    Select Companies
                  </Button>
                  <Button variant="outline" onClick={openEditProfile}>
                    Update Preferences
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="h-12 w-12 text-black animate-spin mb-4" />
            <p className="text-gray-600 font-medium">Analyzing jobs with domain-aware scoring...</p>
            <p className="text-gray-500 text-sm mt-2">This may take a moment</p>
          </div>
        )}

        {/* Jobs List */}
        {!isLoading && allFilteredJobs.length > 0 && (
          <div className="divide-y divide-border">
            {jobs.map((job) => (
              <JobCard
                key={job.job_id}
                job={job}
                isSelected={selectedJobId === job.id}
                onSelect={handleSelectJob}
                onOptimizeCV={handleOptimizeCV}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && allFilteredJobs.length > 0 && <JobPagination />}

      {/* Filter Modal */}
      <FilterModal
        open={isFilterModalOpen}
        onOpenChange={setIsFilterModalOpen}
        activeFilters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAllFilters}
        onApplyFilters={handleApplyFilters}
      />
    </div>
  );
}
