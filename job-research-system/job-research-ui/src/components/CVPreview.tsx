import { useState } from 'react';
import { useUserStore } from '../store/userStore';
import { useUIStore } from '../store/uiStore';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { FileText, Upload, Edit, Download, Save, X, Trash2 } from 'lucide-react';
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const activeCV = cvDocuments.find(cv => cv.id === activeCVId);

  const handleEdit = () => {
    if (activeCV) {
      setEditedContent(activeCV.parsed_content);
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!activeCV) return;

    try {
      // Save to backend
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

      // Update local store
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
      // Delete from backend
      const response = await fetch(`http://localhost:3001/api/cv/${activeCV.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete CV');
      }

      // Remove from local store
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {activeCV.file_name}
            </h2>
            <p className="text-sm text-muted-foreground">
              Uploaded {new Date(activeCV.uploaded_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleCancel}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button size="sm" className="gap-2" onClick={handleSave}>
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleEdit}>
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 text-destructive hover:text-destructive" 
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CV Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-full min-h-[600px] p-4 font-mono text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Edit your CV content here..."
            />
          ) : (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {activeCV.parsed_content}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t bg-muted/50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {cvDocuments.length} CV{cvDocuments.length !== 1 ? 's' : ''} uploaded
          </span>
          <Button variant="ghost" size="sm" onClick={openCVUploader}>
            Upload New CV
          </Button>
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
