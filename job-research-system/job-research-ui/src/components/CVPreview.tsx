import { useState } from 'react';
import { useUserStore } from '../store/userStore';
import { useUIStore } from '../store/uiStore';
import { useJobStore } from '../store/jobStore';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { FileText, Upload, Edit, Download, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

export function CVPreview() {
  const { cvDocuments, activeCVId, updateCVContent, removeCVDocument } = useUserStore();
  const { openCVUploader } = useUIStore();
  const { selectedJob } = useJobStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const activeCV = cvDocuments.find(cv => cv.id === activeCVId);
  const targetJob = selectedJob();

  const handleEdit = () => {
    if (activeCV) {
      setEditedContent(activeCV.parsed_content);
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!activeCV) return;

    try {
      const response = await fetch('http://localhost:3001/api/cv/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cv_id: activeCV.id,
          parsed_content: editedContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update CV');
      }

      updateCVContent(activeCV.id, editedContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save CV:', error);
      alert('Failed to save CV. Please try again.');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  const handleDownload = () => {
    if (!activeCV) return;

    const blob = new Blob([activeCV.parsed_content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeCV.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!activeCV) return;

    try {
      const response = await fetch(`http://localhost:3001/api/cv/${activeCV.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete CV');
      }

      removeCVDocument(activeCV.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Failed to delete CV:', error);
      alert('Failed to delete CV. Please try again.');
    }
  };

  // No CV uploaded yet
  if (cvDocuments.length === 0 || !activeCV) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>No CV Uploaded</CardTitle>
            <CardDescription>
              Upload your CV to get started with job matching and optimization
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={openCVUploader} className="gap-2">
              <Upload className="h-4 w-4" />
              Upload CV
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Display active CV
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-blue-50">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-medium text-gray-900">
                {activeCV.file_name.replace(/\.(docx|pdf|txt|md)$/i, '')}
              </h2>
              <Badge variant="outline" className="text-xs px-2 py-0.5 border-gray-300 text-gray-600">
                V2
              </Badge>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-blue-600 hover:text-blue-700"
                onClick={openCVUploader}
              >
                Upload New CV
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && targetJob && (
              <Button
                size="sm"
                className="gap-2 bg-gray-900 hover:bg-gray-800 text-white"
                onClick={() => {}}
              >
                ✨ Optimize for {targetJob.company}
              </Button>
            )}
            {!isEditing && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleEdit}
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleDownload}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteDialog(true)}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            {isEditing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                >
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CV Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-4xl mx-auto px-16 py-12">
          {/* Target Role and Match Score Ribbon - Above CV page */}
          {targetJob && (
            <div className="bg-gray-100 py-3 px-4 mb-0.5 flex items-center justify-between rounded-sm">
              <span className="text-xs text-gray-600 font-normal uppercase tracking-wide">
                TARGET: {targetJob.title.toUpperCase()}, {targetJob.company.toUpperCase()}
              </span>
              {targetJob.alignment_score && (
                <Badge className="bg-green-500 text-white hover:bg-green-500 text-sm px-3 py-1 rounded-md font-semibold">
                  Match Score: {targetJob.alignment_score}%
                </Badge>
              )}
            </div>
          )}
          {isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-full min-h-[600px] p-4 font-mono text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              placeholder="Edit your CV content here..."
            />
          ) : (
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-12">
              {/* Parse and render CV content with proper styling */}
              <div className="cv-content">
                <style>{`
                  .cv-content h1 {
                    font-size: 2.25rem;
                    font-weight: 700;
                    color: #000000;
                    margin-bottom: 0.5rem;
                    line-height: 1.2;
                  }
                  .cv-content .subtitle {
                    font-size: 1.125rem;
                    font-weight: 400;
                    color: #374151;
                    margin-bottom: 1rem;
                    line-height: 1.5;
                  }
                  .cv-content .contact-info {
                    font-size: 0.875rem;
                    color: #6B7280;
                    margin-bottom: 2rem;
                  }
                  .cv-content h2 {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #000000;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    margin-top: 2.5rem;
                    margin-bottom: 1rem;
                    border-bottom: 1px solid #D1D5DB;
                    padding-bottom: 0.5rem;
                  }
                  .cv-content h3 {
                    font-size: 1.0625rem;
                    font-weight: 600;
                    color: #000000;
                    margin-top: 1.5rem;
                    margin-bottom: 0.25rem;
                    line-height: 1.4;
                  }
                  .cv-content h4 {
                    font-size: 0.9375rem;
                    font-weight: 400;
                    color: #374151;
                    margin-bottom: 0.5rem;
                  }
                  .cv-content .date-range {
                    font-size: 0.9375rem;
                    color: #6B7280;
                    float: right;
                  }
                  .cv-content p {
                    color: #374151;
                    line-height: 1.6;
                    margin-bottom: 0.75rem;
                    font-size: 0.9375rem;
                  }
                  .cv-content ul {
                    list-style: disc;
                    margin-left: 1.25rem;
                    margin-bottom: 1rem;
                  }
                  .cv-content li {
                    color: #374151;
                    line-height: 1.6;
                    margin-bottom: 0.375rem;
                    font-size: 0.9375rem;
                  }
                  .cv-content strong {
                    font-weight: 600;
                    color: #000000;
                  }
                `}</style>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700">
                  {activeCV.parsed_content}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete CV?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{activeCV?.file_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
