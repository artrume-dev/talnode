import { useEffect } from 'react';
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
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Briefcase, Upload, User, Settings } from 'lucide-react';

function App() {
  const { isOnboarded, profile, activeCVId } = useUserStore();
  const { jobs, setJobs, selectedCompanies, selectedJob } = useJobStore();
  const {
    isCompanySelectorOpen,
    openCompanySelector,
    isCVUploaderOpen,
    openCVUploader,
    isLinkedInImportOpen,
    openLinkedInImport,
    rightPanelView,
    setRightPanelView,
  } = useUIStore();

  // Load initial data
  useEffect(() => {
    loadJobs();
  }, [selectedCompanies]);

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

  // Check onboarding status and show modals
  useEffect(() => {
    if (!isOnboarded && !profile) {
      // Show LinkedIn import on first load
      openLinkedInImport();
    }
  }, [isOnboarded, profile]);

  const hasUploadedCV = activeCVId !== null;
  const hasSelectedCompanies = selectedCompanies.length > 0;

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
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Briefcase className="h-6 w-6 text-primary" />
                  AI Job Research System
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Find, analyze, and optimize your perfect AI role
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={openLinkedInImport}
              >
                <User className="h-4 w-4" />
                {profile ? 'Edit Profile' : 'Add Profile'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={openCVUploader}
              >
                <Upload className="h-4 w-4" />
                {hasUploadedCV ? 'Upload New CV' : 'Upload CV'}
              </Button>

              <Button
                variant="default"
                size="sm"
                className="gap-2"
                onClick={openCompanySelector}
              >
                <Settings className="h-4 w-4" />
                Select Companies ({selectedCompanies.length})
              </Button>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-2 mt-4">
            <Badge variant={profile ? 'default' : 'outline'}>
              {profile ? `Profile: ${profile.full_name}` : 'No Profile'}
            </Badge>
            <Badge variant={hasUploadedCV ? 'default' : 'outline'}>
              {hasUploadedCV ? 'CV Uploaded' : 'No CV'}
            </Badge>
            <Badge variant={hasSelectedCompanies ? 'default' : 'outline'}>
              {hasSelectedCompanies
                ? `${selectedCompanies.length} Companies Selected`
                : 'No Companies'}
            </Badge>
            <Badge variant="outline" className="ml-auto">
              {jobs.length} Jobs Found
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content - Split Panel Layout */}
      <div className="flex-1 overflow-hidden">
        <SplitPanelLayout
          leftPanel={<JobsList onCompanySelectorOpen={openCompanySelector} />}
          rightPanel={renderRightPanel()}
          defaultLeftSize={50}
          minLeftSize={30}
          minRightSize={30}
        />
      </div>

      {/* Footer */}
      <footer className="border-t py-3 bg-card shrink-0">
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
      </footer>

      {/* Modals */}
      {isCompanySelectorOpen && <CompanySelector />}
      <AddCompanyModal onCompanyAdded={loadJobs} />
      {isCVUploaderOpen && <CVUploader />}
      {isLinkedInImportOpen && <LinkedInImport />}
    </div>
  );
}

export default App;
