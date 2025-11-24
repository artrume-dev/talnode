/**
 * MainApp Component
 *
 * The main application interface (formerly App.tsx)
 * Now wrapped in ProtectedRoute for authentication
 */

import { useEffect, useState } from 'react';
import { useUserStore } from '../store/userStore';
import { useJobStore } from '../store/jobStore';
import { useUIStore } from '../store/uiStore';
import { SplitPanelLayout } from './SplitPanelLayout';
import { JobsList } from './JobsList';
import { CVPreview } from './CVPreview';
import { CVOptimizer } from './CVOptimizer';
import { CompanySelector } from './CompanySelector';
import { AddCompanyModal } from './AddCompanyModal';
import { CVUploader } from './CVUploader';
import { LinkedInImport } from './LinkedInImport';
import { OnboardingWizard } from './OnboardingWizard';
import { CustomAlert, AnalyzeJobsAlert } from './ui/alert-dialog-custom';
import { Button } from './ui/button';
import { Briefcase, Search, Bell, Plus, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

export function MainApp() {
  const { user, logout } = useAuth();
  const { isOnboarded, profile, setOnboarded, setCVDocuments, setActiveCVId } = useUserStore();
  const { jobs, setJobs, selectedCompanies, selectedJob } = useJobStore();
  const {
    isCompanySelectorOpen,
    openCompanySelector,
    isCVUploaderOpen,
    isLinkedInImportOpen,
    openLinkedInImport,
    isEditProfileOpen,
    closeEditProfile,
    rightPanelView,
    setRightPanelView,
    customAlert,
    closeAlert,
    analyzeJobsAlert,
    closeAnalyzeJobsAlert,
  } = useUIStore();

  const [showOnboarding, setShowOnboarding] = useState(!isOnboarded);

  // Load initial data
  useEffect(() => {
    loadJobs();
    loadCVs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanies]);

  // Update onboarding state
  useEffect(() => {
    setShowOnboarding(!isOnboarded);
  }, [isOnboarded]);

  // Reload jobs after onboarding completes
  useEffect(() => {
    if (isOnboarded && jobs.length === 0) {
      console.log('🔄 Onboarding complete, reloading jobs...');
      setTimeout(() => loadJobs(), 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnboarded]);

  const loadJobs = async () => {
    try {
      // Fetch jobs from API
      const response = await api.post('/tools/get_jobs', {});
      const data = response.data;
      setJobs(data || []);
    } catch (err) {
      console.error('❌ Failed to load jobs:', err);
    }
  };

  const loadCVs = async () => {
    try {
      // Fetch CV list from API
      const response = await api.get('/cv/list');
      const data = response.data;
      const cvs = data.cvs || [];
      setCVDocuments(cvs);

      // Set active CV if one exists
      const activeCV = cvs.find((cv: any) => cv.is_active);
      if (activeCV) {
        setActiveCVId(activeCV.id);
      }

      console.log(`📄 Loaded ${cvs.length} CV documents, active: ${activeCV?.id || 'none'}`);
    } catch (err) {
      console.error('❌ Failed to load CVs:', err);
    }
  };

  // Check onboarding status and show modals
  useEffect(() => {
    // Only auto-show LinkedIn import if user hasn't completed onboarding and has no profile
    if (!isOnboarded && !profile && !showOnboarding) {
      openLinkedInImport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnboarded, profile, showOnboarding]);

  // Render right panel based on current view
  const renderRightPanel = () => {
    console.log('📱 Rendering right panel, view:', rightPanelView);

    switch (rightPanelView) {
      case 'optimizer':
        const job = selectedJob();
        console.log('🔍 Selected job for optimizer:', job?.title || 'No job selected');
        if (!job) {
          console.log('⚠️ No job selected, showing CV preview instead');
          return <CVPreview />;
        }
        console.log('✅ Rendering CVOptimizer for job:', job.title);
        return (
          <CVOptimizer
            job={job}
            onClose={() => setRightPanelView('preview')}
          />
        );
      case 'preview':
      default:
        console.log('📄 Showing CV preview');
        return <CVPreview />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Show onboarding wizard for new users */}
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}

      {/* Header */}
      <header className="bg-white shrink-0 border-b border-gray-200">
        <div className="mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo and Navigation */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-black" />
                <span className="text-lg font-semibold text-black">TalentNode</span>
              </div>

              <nav className="flex items-center gap-6 text-sm">
                <button className="text-gray-700 hover:text-black transition-colors">Research</button>
                <button className="text-gray-700 hover:text-black transition-colors">Applications</button>
                <button className="text-gray-700 hover:text-black transition-colors">Resume Base</button>
              </nav>
            </div>

            {/* Search and Actions */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search jobs, skills, or companies..."
                  className="bg-gray-50 text-gray-900 pl-10 pr-12 py-2 rounded-md text-sm w-96 focus:outline-none focus:ring-2 focus:ring-gray-300 border border-gray-200"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-gray-400 text-xs font-medium">
                  <span>⌘K</span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-gray-700 hover:text-black hover:bg-gray-100"
                onClick={() => {}}
              >
                <Bell className="h-5 w-5" />
              </Button>

              <Button
                variant="default"
                size="sm"
                className="gap-2 bg-black text-white hover:bg-gray-800"
                onClick={() => {
                  setOnboarded(false);
                  setShowOnboarding(true);
                }}
              >
                <Plus className="h-4 w-4" />
                New Project
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{profile?.full_name || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await logout();
                    }}
                    className="cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Split Panel Layout */}
      <div className="flex-1 overflow-hidden">
        <SplitPanelLayout
          leftPanel={<JobsList onCompanySelectorOpen={openCompanySelector} />}
          rightPanel={renderRightPanel()}
          defaultLeftSize={38}
          minLeftSize={30}
          minRightSize={40}
        />
      </div>

      {/* Modals */}
      {isCompanySelectorOpen && <CompanySelector />}
      <AddCompanyModal onCompanyAdded={loadJobs} />
      {isCVUploaderOpen && <CVUploader />}
      {isLinkedInImportOpen && <LinkedInImport />}
      {isEditProfileOpen && (
        <OnboardingWizard
          onComplete={() => {
            closeEditProfile();
            loadJobs();
          }}
        />
      )}

      {/* Custom Alerts */}
      <CustomAlert
        open={customAlert.isOpen}
        onOpenChange={closeAlert}
        title={customAlert.title}
        description={customAlert.description}
        confirmText={customAlert.confirmText}
        cancelText={customAlert.cancelText}
        onConfirm={customAlert.onConfirm}
        onCancel={customAlert.onCancel}
        variant={customAlert.variant}
        showCancel={customAlert.showCancel}
      />

      <AnalyzeJobsAlert
        open={analyzeJobsAlert.isOpen}
        onOpenChange={closeAnalyzeJobsAlert}
        filteredJobsCount={analyzeJobsAlert.filteredJobsCount}
        totalJobsCount={analyzeJobsAlert.totalJobsCount}
        onAnalyzeFiltered={analyzeJobsAlert.onAnalyzeFiltered || (() => {})}
        onAnalyzeAll={analyzeJobsAlert.onAnalyzeAll || (() => {})}
      />
    </div>
  );
}
