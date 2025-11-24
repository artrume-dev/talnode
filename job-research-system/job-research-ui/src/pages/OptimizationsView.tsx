/**
 * Optimizations View Page
 *
 * Displays all CV optimizations with details and download options
 */

import { useEffect, useState } from 'react';
import axios from 'axios';
import { Download, FileText, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';

interface CVOptimization {
  id: number;
  baseCVId: number;
  baseCVName: string;
  jobId: number;
  jobTitle: string;
  company: string;
  variantType: 'conservative' | 'optimized' | 'stretch';
  matchScore: number;
  optimizedDate: string;
  changesSummary: string[];
  strongMatches: string[];
  gaps: string[];
}

export function OptimizationsView() {
  const [optimizations, setOptimizations] = useState<CVOptimization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOptimizations();
  }, []);

  const fetchOptimizations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/dashboard/cv-optimizations', {
        params: { limit: 50 }
      });

      setOptimizations(response.data.data || []);
    } catch (error) {
      console.error('Error fetching optimizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVariantBadge = (type: string) => {
    const variantMap: Record<string, { label: string; className: string }> = {
      conservative: { label: 'Conservative', className: 'bg-blue-100 text-blue-700' },
      optimized: { label: 'Optimized', className: 'bg-green-100 text-green-700' },
      stretch: { label: 'Stretch', className: 'bg-purple-100 text-purple-700' },
    };

    const config = variantMap[type] || { label: type, className: 'bg-gray-100 text-gray-700' };

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
        <div className="text-gray-500">Loading CV optimizations...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CV Optimizations</h1>
          <p className="text-sm text-gray-600 mt-1">
            All your AI-optimized CV variants for specific jobs
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Optimizations</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{optimizations.length}</p>
            </div>
            <div className="bg-purple-50 text-purple-600 p-3 rounded-lg">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Match Score</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {optimizations.length > 0
                  ? Math.round(
                      optimizations.reduce((sum, opt) => sum + opt.matchScore, 0) /
                        optimizations.length
                    )
                  : 0}
                %
              </p>
            </div>
            <div className="bg-green-50 text-green-600 p-3 rounded-lg">
              <FileText className="h-6 w-6" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Match (70%+)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {optimizations.filter((opt) => opt.matchScore >= 70).length}
              </p>
            </div>
            <div className="bg-blue-50 text-blue-600 p-3 rounded-lg">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Optimizations List */}
      <div className="space-y-4">
        {optimizations.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-gray-400 mb-2">
              <Sparkles className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No CV optimizations yet</h3>
            <p className="text-sm text-gray-600">
              Start by analyzing jobs to generate optimized CV variants!
            </p>
          </div>
        ) : (
          optimizations.map((opt) => (
            <div
              key={opt.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{opt.jobTitle}</h3>
                      {getVariantBadge(opt.variantType)}
                    </div>
                    <p className="text-sm text-gray-600">{opt.company}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Optimized on {new Date(opt.optimizedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-3xl font-bold ${getMatchScoreColor(opt.matchScore)}`}>
                      {Math.round(opt.matchScore)}%
                    </div>
                    <div className="text-xs text-gray-500">Match Score</div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* Strong Matches */}
                  {opt.strongMatches && opt.strongMatches.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Strong Matches
                      </h4>
                      <ul className="space-y-1">
                        {opt.strongMatches.slice(0, 3).map((match, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span>{match}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Gaps */}
                  {opt.gaps && opt.gaps.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Areas to Address</h4>
                      <ul className="space-y-1">
                        {opt.gaps.slice(0, 3).map((gap, idx) => (
                          <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-orange-500 mt-0.5">!</span>
                            <span>{gap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Changes Summary */}
                {opt.changesSummary && opt.changesSummary.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Key Changes</h4>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <ul className="space-y-1">
                        {opt.changesSummary.slice(0, 3).map((change, idx) => (
                          <li key={idx} className="text-sm text-gray-700">
                            • {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                  <Button size="sm" variant="outline" disabled>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    <Download className="h-4 w-4 mr-2" />
                    Download DOCX
                  </Button>
                  <div className="ml-auto text-xs text-gray-500">
                    Base CV: {opt.baseCVName}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
