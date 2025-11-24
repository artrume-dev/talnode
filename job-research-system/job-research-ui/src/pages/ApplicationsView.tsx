/**
 * Applications View Page
 *
 * Displays all job applications with status tracking, filtering, and updates
 */

import { useEffect, useState } from 'react';
import axios from 'axios';
import { ExternalLink, Pencil, Trash2, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';

interface Application {
  id: number;
  job: {
    id: number;
    title: string;
    company: string;
    url?: string;
  };
  appliedDate: string;
  matchScore: number;
  status: string;
  cvVariant: {
    id: number;
  } | null;
  applicationSource?: string;
  notes?: string;
  followUpDate?: string;
  interviewDate?: string;
  decision?: string;
  offerAmount?: number;
  offerCurrency?: string;
}

export function ApplicationsView() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchApplications();
  }, [filterStatus]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      const response = await axios.get('http://localhost:3001/api/dashboard/applications', {
        params
      });

      setApplications(response.data.data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this application?')) return;

    try {
      await axios.delete(`http://localhost:3001/api/applications/${id}`);
      fetchApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      applied: { label: 'Applied', className: 'bg-blue-100 text-blue-700' },
      in_review: { label: 'In Review', className: 'bg-yellow-100 text-yellow-700' },
      interview_scheduled: { label: 'Interview', className: 'bg-purple-100 text-purple-700' },
      offer_received: { label: 'Offer', className: 'bg-green-100 text-green-700' },
      rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
      withdrawn: { label: 'Withdrawn', className: 'bg-gray-100 text-gray-700' },
    };

    const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700' };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-gray-500">Loading applications...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Applications</h1>
          <p className="text-sm text-gray-600 mt-1">Track and manage your job applications</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="applied">Applied</option>
            <option value="in_review">In Review</option>
            <option value="interview_scheduled">Interview Scheduled</option>
            <option value="offer_received">Offer Received</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
          </select>
          <div className="text-sm text-gray-600">
            {applications.length} application{applications.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {applications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-2">
              <Briefcase className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No applications yet</h3>
            <p className="text-sm text-gray-600">
              Start tracking your job applications by marking jobs as applied!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Match Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-gray-900">{app.job.title}</div>
                        {app.job.url && (
                          <a
                            href={app.job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-blue-600"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{app.job.company}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {new Date(app.appliedDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-lg font-bold ${getMatchScoreColor(app.matchScore)}`}>
                        {Math.round(app.matchScore)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 capitalize">
                        {app.applicationSource?.replace('_', ' ') || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            // TODO: Open edit dialog
                            console.log('Edit application:', app.id);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes Section */}
      {applications.some(app => app.notes) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Notes</h3>
          <div className="space-y-4">
            {applications.filter(app => app.notes).map((app) => (
              <div key={app.id} className="border-l-4 border-blue-500 pl-4">
                <div className="font-medium text-gray-900">{app.job.title} - {app.job.company}</div>
                <div className="text-sm text-gray-600 mt-1">{app.notes}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
