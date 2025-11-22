import { useState, useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { useUIStore } from '../store/uiStore';
import { useJobStore } from '../store/jobStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowRight, ArrowLeft, Check, Briefcase, MapPin, Clock, User, Upload, Building2, CheckCircle2, Linkedin, RefreshCw } from 'lucide-react';

const INDUSTRIES = [
  'AI/ML',
  'Product Management',
  'Design Systems',
  'Enterprise Software',
  'Developer Tools',
  'Cloud Infrastructure',
  'Data Engineering',
  'Security',
  'Healthcare Tech',
  'FinTech',
  'EdTech',
  'SaaS',
  'Marketing Tech',
  'E-commerce',
];

const LOCATIONS = [
  'Remote',
  'San Francisco, CA',
  'New York, NY',
  'Seattle, WA',
  'Austin, TX',
  'Boston, MA',
  'Los Angeles, CA',
  'Chicago, IL',
  'Denver, CO',
  'Portland, OR',
  'London, UK',
  'Toronto, Canada',
  'Berlin, Germany',
  'Singapore',
];

const JOB_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Remote',
  'Hybrid',
  'On-site',
];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [isSearchingJobs, setIsSearchingJobs] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchMessage, setSearchMessage] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [linkedinLoading, setLinkedinLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    headline: '',
    summary: '',
    current_position: '',
    years_of_experience: 0,
    linkedin_url: '',
  });

  const { updateProfile, setOnboarded, cvDocuments, activeCVId, setCVDocuments, setActiveCVId, profile } = useUserStore();
  const { openCVUploader } = useUIStore();

  const totalSteps = 7;
  
  // Get the active CV or the most recently uploaded one
  const activeCV = cvDocuments.find(cv => cv.id === activeCVId) || cvDocuments[cvDocuments.length - 1];
  
  // Pre-fill profile data from existing profile when wizard opens
  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || '',
        headline: profile.headline || '',
        summary: profile.summary || '',
        current_position: profile.current_position || '',
        years_of_experience: profile.years_of_experience || 0,
        linkedin_url: profile.linkedin_url || '',
      });
      
      // Also pre-fill preferences if they exist
      if (profile.preferred_industries) {
        try {
          const industries = JSON.parse(profile.preferred_industries);
          setSelectedIndustries(industries);
        } catch (e) {
          console.error('Failed to parse industries:', e);
        }
      }
      
      if (profile.preferred_locations) {
        try {
          const locations = JSON.parse(profile.preferred_locations);
          setSelectedLocations(locations);
        } catch (e) {
          console.error('Failed to parse locations:', e);
        }
      }
      
      if (profile.preferred_job_types) {
        try {
          const jobTypes = JSON.parse(profile.preferred_job_types);
          setSelectedJobTypes(jobTypes);
        } catch (e) {
          console.error('Failed to parse job types:', e);
        }
      }
    }
  }, [profile]);
  
  // Reload CVs from backend when reaching step 5 (CV upload step)
  useEffect(() => {
    const loadCVs = async () => {
      if (step !== 5) return; // Only reload on step 5
      
      try {
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
          
          console.log(`📄 Reloaded ${cvs.length} CV documents in wizard, active: ${activeCV?.id || 'none'}`);
        }
      } catch (err) {
        console.error('Failed to reload CVs in wizard:', err);
      }
    };
    
    loadCVs();
  }, [step, setCVDocuments, setActiveCVId]);

  const toggleSelection = (item: string, list: string[], setter: (list: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    // Save preferences and profile to backend
    try {
      setIsSearchingJobs(true);
      setSearchProgress(10);
      setSearchMessage('Saving your preferences...');

      const profileUpdate = {
        ...profileData,
        preferred_industries: JSON.stringify(selectedIndustries),
        preferred_locations: JSON.stringify(selectedLocations),
        preferred_job_types: JSON.stringify(selectedJobTypes),
      };

      const response = await fetch('http://localhost:3001/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileUpdate),
      });

      if (response.ok) {
        const savedProfile = await response.json();
        updateProfile(savedProfile);
        
        setSearchProgress(30);
        setSearchMessage('Profile saved successfully!');
        
        // Save selected companies to jobStore
        const { selectAllCompanies } = useJobStore.getState();
        selectAllCompanies(selectedCompanies);
        
        setSearchProgress(50);
        setSearchMessage(`AI is searching ${selectedCompanies.length} companies for relevant jobs...`);
        
        // Trigger job search based on selected companies
        console.log('🔍 Searching for jobs from selected companies...');
        try {
          const searchResponse = await fetch('http://localhost:3001/api/tools/search_ai_jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companies: selectedCompanies }),
          });
          
          setSearchProgress(80);
          setSearchMessage('Analyzing job matches based on your preferences...');
          
          if (searchResponse.ok) {
            const searchResults = await searchResponse.json();
            console.log(`✅ Found ${searchResults.length} new jobs from ${selectedCompanies.length} companies`);
            
            setSearchProgress(100);
            setSearchMessage(`Found ${searchResults.length} relevant jobs! Preparing your dashboard...`);
            
            // Wait a moment to show completion
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (searchError) {
          console.error('Job search failed:', searchError);
          setSearchMessage('Completing setup...');
        }
        
        setOnboarded(true);
        onComplete();
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const response = await fetch('http://localhost:3001/api/companies');
        if (response.ok) {
          const data = await response.json();
          console.log('📦 Fetched companies:', data);
          console.log('📊 Companies count:', data.length);
          setCompanies(data);
        } else {
          console.error('Failed to fetch companies:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Failed to load companies:', error);
      } finally {
        setLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, []);

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedIndustries.length > 0;
      case 2:
        return selectedCompanies.length > 0;
      case 3:
        return selectedLocations.length > 0;
      case 4:
        return selectedJobTypes.length > 0;
      case 5:
        return true; // CV upload is optional
      case 6:
        return true; // LinkedIn is optional
      case 7:
        return profileData.full_name.trim() !== '';
      default:
        return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Loading State - AI Fetching Jobs */}
        {isSearchingJobs ? (
          <>
            <CardHeader>
              <div className="text-center">
                <CardTitle className="text-2xl mb-2">🤖 AI is Working Its Magic</CardTitle>
                <CardDescription>{searchMessage}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pb-8">
              <div className="space-y-4">
                {/* Animated Progress Bar */}
                <div className="relative w-full bg-secondary rounded-full h-3 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${searchProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                  </div>
                </div>
                
                {/* Progress Percentage */}
                <div className="text-center">
                  <span className="text-3xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    {searchProgress}%
                  </span>
                </div>

                {/* Animated Loading Icons */}
                <div className="flex items-center justify-center gap-3 py-8">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>

                {/* What's Happening */}
                <div className="bg-muted/50 rounded-lg p-6 space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <span className="text-primary">✨</span>
                    What's happening behind the scenes:
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className={searchProgress >= 30 ? 'text-green-500' : 'text-muted-foreground'}>
                        {searchProgress >= 30 ? '✓' : '○'}
                      </span>
                      <span>Saving your preferences and profile</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={searchProgress >= 50 ? 'text-green-500' : 'text-muted-foreground'}>
                        {searchProgress >= 50 ? '✓' : '○'}
                      </span>
                      <span>Scanning {selectedCompanies.length} companies for job openings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={searchProgress >= 80 ? 'text-green-500' : 'text-muted-foreground'}>
                        {searchProgress >= 80 ? '✓' : '○'}
                      </span>
                      <span>AI analyzing jobs matching your criteria</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={searchProgress >= 100 ? 'text-green-500' : 'text-muted-foreground'}>
                        {searchProgress >= 100 ? '✓' : '○'}
                      </span>
                      <span>Preparing your personalized job dashboard</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <CardTitle className="text-2xl">Welcome to AI Job Research System</CardTitle>
                  <CardDescription>Let's personalize your job search experience</CardDescription>
                </div>
                <Badge variant="outline">
                  Step {step} of {totalSteps}
                </Badge>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
          {/* Step 1: Industries */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Briefcase className="h-5 w-5 text-primary" />
                <h3>Which industries interest you?</h3>
              </div>
              <p className="text-sm text-muted-foreground">Select all that apply</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {INDUSTRIES.map((industry) => (
                  <div
                    key={industry}
                    onClick={() => toggleSelection(industry, selectedIndustries, setSelectedIndustries)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedIndustries.includes(industry)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox checked={selectedIndustries.includes(industry)} />
                      <span className="text-sm">{industry}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedIndustries.map((industry) => (
                  <Badge key={industry} variant="default">
                    {industry}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Companies */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3>Which companies interest you?</h3>
                </div>
                {!loadingCompanies && companies.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedCompanies.length === companies.length) {
                        setSelectedCompanies([]);
                      } else {
                        setSelectedCompanies([...companies]);
                      }
                    }}
                  >
                    {selectedCompanies.length === companies.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Select companies to search for jobs</p>
              {loadingCompanies ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : companies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No companies found. Please check your connection.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
                    {companies.map((company) => (
                      <div
                        key={company}
                        onClick={() => toggleSelection(company, selectedCompanies, setSelectedCompanies)}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedCompanies.includes(company)
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox checked={selectedCompanies.includes(company)} />
                          <span className="text-sm">{company}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedCompanies.map((company) => (
                      <Badge key={company} variant="default">
                        {company}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Locations */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3>Where would you like to work?</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedLocations.length === LOCATIONS.length) {
                      setSelectedLocations([]);
                    } else {
                      setSelectedLocations([...LOCATIONS]);
                    }
                  }}
                >
                  {selectedLocations.length === LOCATIONS.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Select your preferred locations</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {LOCATIONS.map((location) => (
                  <div
                    key={location}
                    onClick={() => toggleSelection(location, selectedLocations, setSelectedLocations)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedLocations.includes(location)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox checked={selectedLocations.includes(location)} />
                      <span className="text-sm">{location}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedLocations.map((location) => (
                  <Badge key={location} variant="default">
                    {location}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Job Types */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3>What type of work are you looking for?</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedJobTypes.length === JOB_TYPES.length) {
                      setSelectedJobTypes([]);
                    } else {
                      setSelectedJobTypes([...JOB_TYPES]);
                    }
                  }}
                >
                  {selectedJobTypes.length === JOB_TYPES.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">Select your preferred job types</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {JOB_TYPES.map((type) => (
                  <div
                    key={type}
                    onClick={() => toggleSelection(type, selectedJobTypes, setSelectedJobTypes)}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedJobTypes.includes(type)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox checked={selectedJobTypes.includes(type)} />
                      <span className="text-sm font-medium">{type}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedJobTypes.map((type) => (
                  <Badge key={type} variant="default">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: CV Upload */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Upload className="h-5 w-5 text-primary" />
                <h3>Upload your CV (Optional)</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload your CV to get personalized job matching and AI-powered CV optimization
              </p>
              
              {cvDocuments.length > 0 && activeCV ? (
                // Success State - CV Uploaded
                <div className="border-2 border-green-500 bg-green-50 dark:bg-green-950/20 rounded-lg p-8 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-green-500 p-3">
                      <CheckCircle2 className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-green-700 dark:text-green-400 text-lg">CV Uploaded Successfully!</p>
                    <p className="text-sm text-green-600 dark:text-green-500 mt-2">
                      {activeCV.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(activeCV.file_size / 1024).toFixed(1)} KB • Uploaded {new Date(activeCV.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button onClick={() => openCVUploader()} variant="outline" size="sm">
                    Upload Different CV
                  </Button>
                </div>
              ) : (
                // Upload State - No CV Yet
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center space-y-4">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground">PDF, DOC, DOCX up to 10MB</p>
                  </div>
                  <Button onClick={() => openCVUploader()} variant="outline">
                    Choose File
                  </Button>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground text-center">
                You can skip this step and upload your CV later
              </p>
            </div>
          )}

          {/* Step 6: LinkedIn Profile */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Linkedin className="h-5 w-5 text-primary" />
                <h3>Connect Your LinkedIn Profile (Optional)</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Import your professional information from LinkedIn to help AI better match jobs
              </p>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="linkedin_url">LinkedIn Profile URL</Label>
                  <Input
                    id="linkedin_url"
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Example: https://linkedin.com/in/john-doe
                  </p>
                </div>

                <Button
                  onClick={async () => {
                    if (!linkedinUrl) return;
                    setLinkedinLoading(true);
                    try {
                      const response = await fetch('http://localhost:3001/api/profile/linkedin-import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ linkedin_url: linkedinUrl }),
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        setProfileData({
                          ...profileData,
                          full_name: data.full_name || profileData.full_name,
                          headline: data.headline || profileData.headline,
                          summary: data.summary || profileData.summary,
                          current_position: data.current_position || profileData.current_position,
                          years_of_experience: data.years_of_experience || profileData.years_of_experience,
                          linkedin_url: linkedinUrl,
                        });
                      }
                    } catch (error) {
                      console.error('LinkedIn import failed:', error);
                    } finally {
                      setLinkedinLoading(false);
                    }
                  }}
                  disabled={!linkedinUrl || linkedinLoading}
                  variant="outline"
                  className="w-full"
                >
                  {linkedinLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Linkedin className="h-4 w-4 mr-2" />
                      Import from LinkedIn
                    </>
                  )}
                </Button>

                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold mb-2">Why connect LinkedIn?</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Auto-fill your job title and experience</li>
                    <li>• Extract skills and professional summary</li>
                    <li>• Better AI job matching based on your background</li>
                    <li>• Save time on manual data entry</li>
                  </ul>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                You can skip this and enter details manually in the next step
              </p>
            </div>
          )}

          {/* Step 7: Profile Details */}
          {step === 7 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <User className="h-5 w-5 text-primary" />
                <h3>Tell us about yourself</h3>
              </div>
              <p className="text-sm text-muted-foreground">Basic information to complete your profile</p>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label htmlFor="headline">Professional Headline</Label>
                  <Input
                    id="headline"
                    value={profileData.headline}
                    onChange={(e) => setProfileData({ ...profileData, headline: e.target.value })}
                    placeholder="Senior Product Manager"
                  />
                </div>
                <div>
                  <Label htmlFor="current_position">Current Position</Label>
                  <Input
                    id="current_position"
                    value={profileData.current_position}
                    onChange={(e) => setProfileData({ ...profileData, current_position: e.target.value })}
                    placeholder="Product Manager at Acme Corp"
                  />
                </div>
                <div>
                  <Label htmlFor="years_of_experience">Years of Experience</Label>
                  <Input
                    id="years_of_experience"
                    type="number"
                    value={profileData.years_of_experience}
                    onChange={(e) =>
                      setProfileData({ ...profileData, years_of_experience: parseInt(e.target.value) || 0 })
                    }
                    placeholder="5"
                  />
                </div>
                <div>
                  <Label htmlFor="summary">Professional Summary</Label>
                  <textarea
                    id="summary"
                    className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                    value={profileData.summary}
                    onChange={(e) => setProfileData({ ...profileData, summary: e.target.value })}
                    placeholder="Brief overview of your experience and career goals..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <Button onClick={handleBack} variant="outline" disabled={step === 1}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {step < totalSteps ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={!canProceed()}>
                <Check className="h-4 w-4 mr-2" />
                Complete Setup
              </Button>
            )}
          </div>
        </CardContent>
        </>
        )}
      </Card>
    </div>
  );
}
