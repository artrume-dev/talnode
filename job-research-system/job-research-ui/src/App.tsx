import { useEffect, useState } from 'react';
import { useUserStore } from './store/userStore';
import { useJobStore } from './store/jobStore';
import { useUIStore } from './store/uiStore';
import { SplitPanelLayout } from './components/SplitPanelLayout';
import { JobsList } from './components/JobsList';
import { CVPreview } from './components/CVPreview';
import { CVOptimizer } from './components/CVOptimizer';
import { CompanySelector } from './components/CompanySelector';
import { AddCompanyModal } from './components/AddCompanyModal';
import { CVUploader } from './components/CVUploader';
import { LinkedInImport } from './components/LinkedInImport';
import { OnboardingWizard } from './components/OnboardingWizard';
import { CustomAlert, AnalyzeJobsAlert } from './components/ui/alert-dialog-custom';
// import { ChatInterface } from './components/ChatInterface'; // TODO: Re-enable after LLM integration
import { Button } from './components/ui/button';
import { Briefcase, Search, Bell, Plus, Command } from 'lucide-react';

function App() {
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
  // const [showChat, setShowChat] = useState(false); // TODO: Re-enable after LLM integration

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
      const response = await fetch('http://localhost:3001/api/tools/get_jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data || []);
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
    }
  };

  const loadCVs = async () => {
    try {
      // Fetch CV list from API
      const response = await fetch('http://localhost:3001/api/cv/list');

      if (response.ok) {
        const data = await response.json();
        const cvs = data.cvs || [];
        setCVDocuments(cvs);
        
        // Set active CV if one exists
        const activeCV = cvs.find((cv: any) => cv.is_active);
        if (activeCV) {
          setActiveCVId(activeCV.id);
        }
        
        console.log(`📄 Loaded ${cvs.length} CV documents, active: ${activeCV?.id || 'none'}`);
      }
    } catch (err) {
      console.error('Failed to load CVs:', err);
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
    
    // Show chat if enabled
    // TODO: Re-enable after LLM integration
    // if (showChat) {
    //   return <ChatInterface onClose={() => setShowChat(false)} />;
    // }
    
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
      <header className="bg-header text-header-foreground shrink-0 border-b border-gray-800">
        <div className="mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo and Navigation */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                <span className="text-lg font-semibold">TalentNode</span>
              </div>

              <nav className="flex items-center gap-6 text-sm">
                <button className="hover:text-gray-300 transition-colors">Research</button>
                <button className="hover:text-gray-300 transition-colors">Applications</button>
                <button className="hover:text-gray-300 transition-colors">Resume Base</button>
              </nav>
            </div>

            {/* Search and Actions */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search jobs, skills, or companies..."
                  className="bg-gray-900 text-white pl-10 pr-12 py-1.5 rounded-md text-sm w-80 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-500 text-xs">
                  <Command className="h-3 w-3" />
                  <span>K</span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-header-foreground hover:text-gray-300 hover:bg-gray-900"
                onClick={() => {}}
              >
                <Bell className="h-5 w-5" />
              </Button>

              <Button
                variant="default"
                size="sm"
                className="gap-2 bg-white text-black hover:bg-gray-100"
                onClick={() => {
                  setOnboarded(false);
                  setShowOnboarding(true);
                }}
              >
                <Plus className="h-4 w-4" />
                New Project
              </Button>

              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-semibold text-sm">
                SM
              </div>
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

      {/* Footer - Hidden for TalentNode design */}
      {/* <footer className="border-t py-3 bg-card shrink-0">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-4">
            <span>Powered by MCP Server</span>
            <span>•</span>
            <span>Built with React + Tailwind + shadcn/ui</span>
            <span>•</span>
            <Badge variant="outline" className="text-xs">
              API: http://localhost:3001
            </Badge>
          </div>
        </div>
      </footer> */}

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

export default App;
