import { useState } from 'react';
import { useUserStore } from '../store/userStore';
import { useUIStore } from '../store/uiStore';
import { useJobStore } from '../store/jobStore';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { FileText, Upload, Edit, Download, Trash2, CloudUpload } from 'lucide-react';
import api, { del } from '../services/api';
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
import RichTextEditor from './RichTextEditor';

export function CVPreview() {
  const { cvDocuments, activeCVId, updateCVContent, removeCVDocument } = useUserStore();
  const { openCVUploader, setRightPanelView } = useUIStore();
  const { selectedJob } = useJobStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Ensure cvDocuments is an array before using .find()
  const activeCV = Array.isArray(cvDocuments) ? cvDocuments.find(cv => cv.id === activeCVId) : undefined;
  const targetJob = selectedJob();

  const handleEdit = () => {
    if (activeCV) {
      // Initialize edited content with current CV content
      setEditedContent(activeCV.parsed_content);
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!activeCV) return;

    try {
      await api.put('/cv/update', {
        cv_id: activeCV.id,
        parsed_content: editedContent,
      });

      updateCVContent(activeCV.id, editedContent);
      setIsEditing(false);
    } catch (error) {
      console.error('❌ Failed to save CV:', error);
      alert('Failed to save CV. Please try again.');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  const convertHTMLToMarkdown = (html: string): string => {
    // Simple HTML to Markdown conversion
    let markdown = html;

    // Convert headings
    markdown = markdown.replace(/<h1>(.*?)<\/h1>/g, '# $1\n');
    markdown = markdown.replace(/<h2>(.*?)<\/h2>/g, '## $1\n');
    markdown = markdown.replace(/<h3>(.*?)<\/h3>/g, '### $1\n');

    // Convert paragraphs
    markdown = markdown.replace(/<p>(.*?)<\/p>/g, '$1\n\n');

    // Convert line breaks
    markdown = markdown.replace(/<br\s*\/?>/g, '\n');

    // Convert bold and italic
    markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
    markdown = markdown.replace(/<b>(.*?)<\/b>/g, '**$1**');
    markdown = markdown.replace(/<em>(.*?)<\/em>/g, '*$1*');
    markdown = markdown.replace(/<i>(.*?)<\/i>/g, '*$1*');

    // Convert lists
    markdown = markdown.replace(/<ul>/g, '\n');
    markdown = markdown.replace(/<\/ul>/g, '\n');
    markdown = markdown.replace(/<ol>/g, '\n');
    markdown = markdown.replace(/<\/ol>/g, '\n');
    markdown = markdown.replace(/<li>(.*?)<\/li>/g, '- $1\n');

    // Remove any remaining HTML tags
    markdown = markdown.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = markdown;
    markdown = textarea.value;

    return markdown.trim();
  };

  const handleDownload = () => {
    if (!activeCV) return;

    // Convert HTML to Markdown for download
    const markdownContent = convertHTMLToMarkdown(activeCV.parsed_content);
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeCV.file_name.replace(/\.[^/.]+$/, '') + '.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!activeCV) return;

    try {
      await del(`/cv/${activeCV.id}`);

      removeCVDocument(activeCV.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('❌ Failed to delete CV:', error);
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
      <div className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between mb-0">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center w-8 h-8">
              <FileText size={20} strokeWidth={1.25} className="text-blue-700" />
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <h2 className="text-sm font-medium text-gray-900">
                {activeCV.file_name.replace(/\.(docx|pdf|txt|md)$/i, '')}
              </h2>
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-gray-300 text-gray-400">
                V2
              </Badge>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-blue-700 underline hover:text-gray-700 font-medium"
                onClick={openCVUploader}
              >
                Upload New CV <CloudUpload size={16} strokeWidth={1.25} className="text-blue-700 hover:text-gray-700" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && targetJob && targetJob.alignment_score && (
              <Badge className="bg-green-50 text-green-800 text-xs px-3 border border-green-300 rounded-md font-semibold">
                Match Score: {targetJob.alignment_score}%
              </Badge>
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
          {/* Target Role and Optimize Button Ribbon - Above CV page */}
          {targetJob && (
            <div className="bg-gray-100 py-3 px-4 mb-0 flex items-center justify-between rounded-lg rounded-bl-none rounded-br-none shadow-sm border border-b-0 border-gray-200 mb-0.5">
              <span className="text-xs text-gray-700 font-normal uppercase tracking-wide">
                <span className="font-semibold">Job:</span> {targetJob.title.toUpperCase()}, {targetJob.company.toUpperCase()}
              </span>
              {!isEditing && (
                <Button
                  size="sm"
                  className="gap-2 bg-gray-900 hover:bg-gray-800 text-white h-7 text-xs"
                  onClick={() => setRightPanelView('optimizer')}
                >
                  ✨ Optimise for {targetJob.company} job
                </Button>
              )}
            </div>
          )}
          {isEditing ? (
            <div className="bg-white">
              <RichTextEditor
                content={editedContent}
                onChange={(html) => setEditedContent(html)}
                editable={true}
              />
            </div>
          ) : (
            <div className="bg-white shadow-sm border border-gray-200 rounded-none">
              <RichTextEditor
                content={activeCV.parsed_content}
                editable={false}
              />
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
