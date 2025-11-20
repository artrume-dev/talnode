import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUserStore } from '../store/userStore';
import { useUIStore } from '../store/uiStore';
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
  const { isCVUploaderOpen, closeCVUploader } = useUIStore();
  const { addCVDocument, setActiveCV } = useUserStore();

  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [parsedContent, setParsedContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  const resetState = () => {
    setUploadState('idle');
    setUploadProgress(0);
    setError(null);
    setParsedContent('');
    setFileName('');
    setIsEditing(false);
  };

  const handleClose = () => {
    if (uploadState !== 'uploading' && uploadState !== 'parsing') {
      closeCVUploader();
      resetState();
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

      const response = await fetch('http://localhost:3001/api/cv/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload CV');
      }

      setUploadState('parsing');
      const data = await response.json();

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
      // Save to backend
      const response = await fetch('http://localhost:3001/api/cv/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_name: fileName,
          parsed_content: parsedContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save CV');
      }

      const data = await response.json();

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

      // Close modal
      closeCVUploader();
      resetState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save CV');
      setUploadState('error');
    }
  };

  return (
    <Dialog open={isCVUploaderOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload CV / Resume
          </DialogTitle>
          <DialogDescription>
            Upload your CV in PDF, DOCX, TXT, or Markdown format (max 5MB)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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

        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
