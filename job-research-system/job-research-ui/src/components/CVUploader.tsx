import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUserStore } from '../store/userStore';
import { useUIStore } from '../store/uiStore';
import { useJobStore } from '../store/jobStore';
import api from '../services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { AlertCircle, Upload, FileText, CheckCircle2} from 'lucide-react';

const ALLOWED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function CVUploader() {
  const { isCVUploaderOpen, closeCVUploader, showAnalyzeJobsAlert } = useUIStore();
  const { addCVDocument, setActiveCV, cvDocuments, setCVDocuments } = useUserStore();
  const { filteredJobs, jobs: allJobs, loadJobs } = useJobStore();

  console.log('🔍 CVUploader render - cvDocuments:', cvDocuments, 'length:', cvDocuments?.length, 'isArray:', Array.isArray(cvDocuments));

  const [view, setView] = useState<'select' | 'upload'>('select');
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [parsedContent, setParsedContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileMetadata, setFileMetadata] = useState<{ file_path: string; file_type: string; file_size: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [, setSavingState] = useState<'idle' | 'saving' | 'analyzing' | 'success'>('idle');
  const [loadingCVs, setLoadingCVs] = useState(false);

  // Fetch CVs when modal opens
  useEffect(() => {
    if (isCVUploaderOpen) {
      fetchCVDocuments();
    }
  }, [isCVUploaderOpen]);

  const fetchCVDocuments = async () => {
    try {
      setLoadingCVs(true);
      console.log('🔄 Fetching CVs from /cv/list...');
      const response = await api.get('/cv/list');
      console.log('📦 Raw API response:', response.data);
      const cvs = response.data.cvs || [];
      console.log(`📄 Extracted ${cvs.length} CVs:`, cvs);
      setCVDocuments(cvs);
      console.log('✅ CVs set in store');
    } catch (error) {
      console.error('❌ Failed to fetch CV documents:', error);
    } finally {
      setLoadingCVs(false);
    }
  };

  const resetState = () => {
    setView('select');
    setUploadState('idle');
    setUploadProgress(0);
    setError(null);
    setParsedContent('');
    setFileName('');
    setFileMetadata(null);
    setIsEditing(false);
    setSavingState('idle');
  };

  const handleClose = () => {
    if (uploadState !== 'uploading' && uploadState !== 'parsing') {
      closeCVUploader();
      resetState();
    }
  };

  const handleSelectExistingCV = async (cvId: number) => {
    try {
      // Set the selected CV as active
      setActiveCV(cvId);

      // Close modal
      closeCVUploader();
      resetState();

      // Show analyze jobs alert
      const filteredCount = filteredJobs().length;
      const totalCount = allJobs.length;

      showAnalyzeJobsAlert({
        filteredJobsCount: filteredCount,
        totalJobsCount: totalCount,
        onAnalyzeFiltered: async () => {
          await analyzeJobs(cvId);
        },
        onAnalyzeAll: async () => {
          await analyzeJobs(cvId);
        },
      });
    } catch (error) {
      console.error('Failed to switch CV:', error);
      setError('Failed to switch CV. Please try again.');
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setFileName(file.name);
    setError(null);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 5MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      setUploadState('error');
      return;
    }

    try {
      setUploadState('uploading');
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('cv', file);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await api.post('/cv/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setUploadState('parsing');
      const data = response.data;

      // Store file metadata from upload response
      setFileMetadata({
        file_path: data.file_path,
        file_type: data.file_type,
        file_size: data.file_size,
      });
      setParsedContent(data.parsed_content || '');
      setUploadState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload CV');
      setUploadState('error');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ALLOWED_FILE_TYPES,
    maxFiles: 1,
    disabled: uploadState === 'uploading' || uploadState === 'parsing',
  });

  const handleSave = async () => {
    try {
      setSavingState('saving');

      // Save to backend
      const response = await api.post('/cv/save', {
        file_name: fileName,
        file_path: fileMetadata?.file_path || '',
        file_type: fileMetadata?.file_type || '',
        file_size: fileMetadata?.file_size || 0,
        parsed_content: parsedContent,
      });

      const data = response.data;
      console.log('📦 CV save response:', data);

      // Check if response has the expected structure
      if (!data.cv || !data.cv.id) {
        console.error('❌ Invalid response structure:', data);
        throw new Error('Invalid response from server');
      }

      // Update local store
      addCVDocument({
        id: data.cv.id,
        user_profile_id: data.cv.user_profile_id,
        file_name: data.cv.file_name,
        file_type: data.cv.file_type,
        file_size: data.cv.file_size,
        file_path: data.cv.file_path,
        parsed_content: data.cv.parsed_content,
        is_active: data.cv.is_active,
        uploaded_at: data.cv.uploaded_at,
      });

      // Set as active CV
      setActiveCV(data.cv.id);
      
      setSavingState('success');
      
      // Close modal after a short delay to show success state
      setTimeout(() => {
        closeCVUploader();
        resetState();
      }, 500);

      // Show analyze jobs alert
      const filteredCount = filteredJobs().length;
      const totalCount = allJobs.length;
      
      showAnalyzeJobsAlert({
        filteredJobsCount: filteredCount,
        totalJobsCount: totalCount,
        onAnalyzeFiltered: async () => {
          await analyzeJobs(data.cv.id);
        },
        onAnalyzeAll: async () => {
          await analyzeJobs(data.cv.id);
        },
      });
    } catch (err) {
      console.error('❌ Failed to save CV:', err);
      setError(err instanceof Error ? err.message : 'Failed to save CV');
      setSavingState('idle');
    }
  };

  const analyzeJobs = async (cvId: number) => {
    try {
      const analyzeResponse = await api.post('/jobs/analyze-all', {
        cv_id: cvId,
      });

      const analyzeData = analyzeResponse.data;
      console.log(`✅ Successfully analyzed ${analyzeData.analyzed_count} jobs!`);

      // Reload jobs to get updated scores
      await loadJobs();
    } catch (analyzeError) {
      console.error('❌ Job analysis failed:', analyzeError);
    }
  };

  return (
    <Dialog open={isCVUploaderOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {view === 'select' ? 'Select or Upload CV' : 'Upload CV / Resume'}
          </DialogTitle>
          <DialogDescription>
            {view === 'select' 
              ? 'Choose from your previously uploaded CVs or upload a new one'
              : 'Upload your CV in PDF, DOCX, TXT, or Markdown format (max 5MB)'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* CV Selection View */}
          {view === 'select' && (
            <div className="space-y-4">
              {/* Upload New CV Button */}
              <Button
                onClick={() => setView('upload')}
                className="w-full h-auto py-4"
                variant="outline"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Upload New CV</p>
                    <p className="text-xs text-muted-foreground">Add a new version to your collection</p>
                  </div>
                </div>
              </Button>

              {/* Loading State */}
              {loadingCVs && (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                  <p className="text-sm">Loading your CVs...</p>
                </div>
              )}

              {/* Existing CVs List */}
              {!loadingCVs && Array.isArray(cvDocuments) && cvDocuments.length > 0 && (
                <>
                  {console.log('🎨 Rendering CV list, count:', cvDocuments.length, 'docs:', cvDocuments)}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        or choose from previous versions
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {(cvDocuments || []).map((cv) => (
                      <button
                        key={cv.id}
                        onClick={() => handleSelectExistingCV(cv.id)}
                        className="w-full p-4 rounded-lg border hover:border-primary hover:bg-accent transition-colors text-left"
                      >
                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{cv.file_name}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{cv.file_size > 0 ? (cv.file_size / 1024).toFixed(1) : '-'} KB</span>
                              <span>•</span>
                              <span>{new Date(cv.uploaded_at).toLocaleDateString()}</span>
                              {cv.is_active && (
                                <>
                                  <span>•</span>
                                  <span className="text-green-600 font-medium">Active</span>
                                </>
                              )}
                            </div>
                          </div>
                          {cv.is_active && (
                            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {!loadingCVs && (!Array.isArray(cvDocuments) || cvDocuments.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No CVs uploaded yet</p>
                  <p className="text-xs">Upload your first CV to get started</p>
                </div>
              )}
            </div>
          )}

          {/* Upload View */}
          {view === 'upload' && (
            <div className="space-y-4">
              {/* Back Button */}
              {cvDocuments.length > 0 && uploadState === 'idle' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView('select')}
                  className="mb-2"
                >
                  ← Back to CV list
                </Button>
              )}

              {/* Upload Area */}
              {uploadState === 'idle' && (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors
                ${isDragActive && !isDragReject ? 'border-primary bg-accent' : 'border-border'}
                ${isDragReject ? 'border-red-500 bg-red-50' : ''}
                hover:border-primary hover:bg-accent
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive && !isDragReject ? (
                <p className="text-sm">Drop your CV here...</p>
              ) : isDragReject ? (
                <p className="text-sm text-red-500">File type not supported</p>
              ) : (
                <>
                  <p className="text-sm font-medium mb-2">
                    Drag and drop your CV here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supported formats: PDF, DOCX, TXT, MD
                  </p>
                </>
              )}
            </div>
          )}

          {/* Uploading Progress */}
          {(uploadState === 'uploading' || uploadState === 'parsing') && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {uploadState === 'uploading' ? 'Uploading...' : 'Parsing content...'}
                  </p>
                </div>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Success - Show Parsed Content */}
          {uploadState === 'success' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">CV uploaded successfully!</p>
                  <p className="text-xs">Review and edit the parsed content below</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Parsed Content</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? 'Preview' : 'Edit'}
                  </Button>
                </div>

                {isEditing ? (
                  <Textarea
                    value={parsedContent}
                    onChange={(e) => setParsedContent(e.target.value)}
                    className="min-h-[300px] font-mono text-sm"
                    placeholder="CV content will appear here..."
                  />
                ) : (
                  <div className="border rounded-lg p-4 bg-muted/50 max-h-[300px] overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap font-sans">
                      {parsedContent || 'No content parsed'}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error State */}
          {uploadState === 'error' && error && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Upload failed</p>
                  <p className="text-xs">{error}</p>
                </div>
              </div>
              <Button variant="outline" onClick={resetState} className="w-full">
                Try Again
              </Button>
            </div>
          )}
            </div>
          )}
        </div>

        <DialogFooter>
          {view === 'upload' && (
            <>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={uploadState === 'uploading' || uploadState === 'parsing'}
              >
                Cancel
              </Button>
              {uploadState === 'success' && (
                <Button onClick={handleSave}>
                  Save CV
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
