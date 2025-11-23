/**
 * Dashboard Overview Page
 *
 * Shows key statistics, recent CV optimizations, and recent applications
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Sparkles, Briefcase, TrendingUp } from 'lucide-react';
import axios from 'axios';

interface DashboardStats {
  cvsUploaded: number;
  cvsOptimized: number;
  jobsApplied: number;
  averageMatchScore: number;
  applicationCounts: {
    total: number;
    applied: number;
    inReview: number;
    interview: number;
    accepted: number;
    rejected: number;
  };
}

interface RecentActivity {
  recentOptimizations: Array<{
    type: string;
    jobTitle: string;
    company: string;
    matchScore: number;
    date: string;
  }>;
  recentApplications: Array<{
    type: string;
    jobTitle: string;
    company: string;
    matchScore: number;
    date: string;
    status: string;
  }>;
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<RecentActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, activityRes] = await Promise.all([
        axios.get('http://localhost:3001/api/dashboard/stats'),
        axios.get('http://localhost:3001/api/dashboard/recent-activity')
      ]);

      setStats(statsRes.data);
      setActivity(activityRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="CVs Uploaded"
          value={stats?.cvsUploaded || 0}
          icon={<FileText className="h-6 w-6" />}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          title="CVs Optimized"
          value={stats?.cvsOptimized || 0}
          icon={<Sparkles className="h-6 w-6" />}
          iconBgColor="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          title="Jobs Applied"
          value={stats?.jobsApplied || 0}
          icon={<Briefcase className="h-6 w-6" />}
          iconBgColor="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          title="Avg Match Score"
          value={`${Math.round(stats?.averageMatchScore || 0)}%`}
          icon={<TrendingUp className="h-6 w-6" />}
          iconBgColor="bg-orange-50"
          iconColor="text-orange-600"
        />
      </div>

      {/* Recent CV Optimizations */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent CV Optimizations</h3>
          <Link
            to="/dashboard/optimizations"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All
          </Link>
        </div>
        <div className="divide-y divide-gray-200">
          {activity?.recentOptimizations.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No CV optimizations yet. Start by analyzing a job!
            </div>
          ) : (
            activity?.recentOptimizations.map((opt, index) => (
              <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{opt.jobTitle}</h4>
                    <p className="text-sm text-gray-600 mt-1">{opt.company}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(opt.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        opt.matchScore >= 70 ? 'text-green-600' :
                        opt.matchScore >= 50 ? 'text-orange-600' :
                        'text-red-600'
                      }`}>
                        {Math.round(opt.matchScore)}%
                      </div>
                      <div className="text-xs text-gray-500">Match</div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Applications */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Applications</h3>
          <Link
            to="/dashboard/applications"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All
          </Link>
        </div>
        <div className="divide-y divide-gray-200">
          {activity?.recentApplications.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No applications yet. Mark a job as applied to track it here!
            </div>
          ) : (
            activity?.recentApplications.map((app, index) => (
              <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{app.jobTitle}</h4>
                    <p className="text-sm text-gray-600 mt-1">{app.company}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-500">
                        Applied {new Date(app.date).toLocaleDateString()}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        app.status === 'applied' ? 'bg-blue-100 text-blue-700' :
                        app.status === 'in_review' ? 'bg-yellow-100 text-yellow-700' :
                        app.status === 'interview_scheduled' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {app.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      app.matchScore >= 70 ? 'text-green-600' :
                      app.matchScore >= 50 ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {Math.round(app.matchScore)}%
                    </div>
                    <div className="text-xs text-gray-500">Match</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
}

function StatCard({ title, value, icon, iconBgColor, iconColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`${iconBgColor} ${iconColor} p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
