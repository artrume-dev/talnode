/**
 * CV Management Page
 *
 * Displays and manages all uploaded CVs
 */

import { useEffect, useState } from 'react';
import api from '../services/api';
import { FileText, CheckCircle, Upload, Trash2, Eye } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useUserStore } from '../store/userStore';
import { useUIStore } from '../store/uiStore';

interface CVDocument {
  id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  is_active: boolean;
  uploaded_at: string;
  parsed_content?: string;
}

export function CVManagement() {
  const { cvDocuments, setCVDocuments, setActiveCV, removeCVDocument } = useUserStore();
  const { openCVUploader } = useUIStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCVs();
  }, []);

  const fetchCVs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cv/list');
      setCVDocuments(response.data.cvs || []);
    } catch (error) {
      console.error('❌ Error fetching CVs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetActive = async (id: number) => {
    try {
      await setActiveCV(id);
    } catch (error) {
      console.error('Error setting active CV:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this CV?')) return;

    try {
      await api.del(`/cv/${id}`);
      removeCVDocument(id);
    } catch (error) {
      console.error('❌ Error deleting CV:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-gray-500">Loading CVs...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CV Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage your uploaded CVs and resumes</p>
        </div>
        <Button onClick={() => openCVUploader()}>
          <Upload className="h-4 w-4 mr-2" />
          Upload New CV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total CVs</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{cvDocuments.length}</p>
            </div>
            <div className="bg-blue-50 text-blue-600 p-3 rounded-lg">
              <FileText className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active CV</p>
              <p className="text-sm font-medium text-gray-900 mt-1 truncate">
                {(cvDocuments || []).find(cv => cv.is_active)?.file_name || 'None'}
              </p>
            </div>
            <div className="bg-green-50 text-green-600 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Size</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatFileSize((cvDocuments || []).reduce((sum, cv) => sum + cv.file_size, 0))}
              </p>
            </div>
            <div className="bg-purple-50 text-purple-600 p-3 rounded-lg">
              <FileText className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* CV List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {(cvDocuments || []).length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-2">
              <FileText className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No CVs uploaded yet</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload your first CV to start optimizing for jobs!
            </p>
            <Button onClick={() => openCVUploader()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Your First CV
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {(cvDocuments || []).map((cv) => (
              <div
                key={cv.id}
                className={`p-6 hover:bg-gray-50 transition-colors ${
                  cv.is_active ? 'bg-blue-50 hover:bg-blue-100' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Icon */}
                    <div
                      className={`p-3 rounded-lg ${
                        cv.is_active
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <FileText className="h-6 w-6" />
                    </div>

                    {/* CV Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-medium text-gray-900">{cv.file_name}</h3>
                        {cv.is_active && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="uppercase">{cv.file_type}</span>
                        <span>•</span>
                        <span>{formatFileSize(cv.file_size)}</span>
                        <span>•</span>
                        <span>Uploaded {new Date(cv.uploaded_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!cv.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetActive(cv.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Set Active
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // TODO: Open preview modal
                        console.log('Preview CV:', cv.id);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(cv.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Tips for CV Management</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• The active CV is used for job analysis and optimization</li>
          <li>• You can upload multiple CV versions (technical, creative, etc.)</li>
          <li>• Supported formats: PDF, DOCX, TXT, MD</li>
          <li>• Maximum file size: 5MB per CV</li>
        </ul>
      </div>
    </div>
  );
}
