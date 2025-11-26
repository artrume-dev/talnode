import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Download, Sparkles, TrendingUp, AlertCircle, Check, X } from 'lucide-react';
import type { Job } from '../types';
import { aiService } from '../services/ai';
import { useUserStore } from '../store/userStore';
import api from '../services/api';

interface CVOptimizerProps {
  job: Job;
  onClose: () => void;
}

interface CVVersion {
  type: 'conservative' | 'optimized' | 'stretch';
  alignment: number;
  changes: string[];
  content: string;
}

export function CVOptimizer({ job, onClose }: CVOptimizerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCV, setIsLoadingCV] = useState(false);
  const [versions, setVersions] = useState<CVVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<'conservative' | 'optimized' | 'stretch'>('optimized');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [baselineAlignment, setBaselineAlignment] = useState<number>(0);
  const [strongMatches, setStrongMatches] = useState<string[]>([]);
  const [gaps, setGaps] = useState<string[]>([]);
  const [cvContent, setCVContent] = useState<string>('');

  const { activeCVId, cvDocuments, updateCVContent } = useUserStore();

  // Load CV content when component mounts
  useState(() => {
    const loadCVContent = async () => {
      if (!activeCVId) {
        setError('No active CV selected. Please upload a CV first.');
        return;
      }

      setIsLoadingCV(true);
      setError(null);

      try {
        // Try to get CV from local store first
        const localCV = (cvDocuments || []).find(cv => cv.id === activeCVId);
        if (localCV?.parsed_content) {
          setCVContent(localCV.parsed_content);
          setIsLoadingCV(false);
          return;
        }

        // If not in store, fetch from API
        const response = await api.get(`/cv/${activeCVId}`);
        setCVContent(response.data.parsed_content || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load CV content');
        console.error('CV loading error:', err);
      } finally {
        setIsLoadingCV(false);
      }
    };

    loadCVContent();
  });

  const handleOptimize = async () => {
    if (!cvContent) {
      setError('No CV content available. Please upload a CV first.');
      return;
    }

    // Safety check: Warn if alignment score is too low
    const alignmentScore = job.alignment_score ?? 0;
    if (alignmentScore < 50) {
      const warningMessage = alignmentScore < 30
        ? `⚠️ CRITICAL WARNING: This job has a very low match score (${alignmentScore}%).\n\n` +
          `This indicates a fundamental domain mismatch between your experience and the job requirements. ` +
          `Optimizing your CV for this role is likely to result in fabricated content, which will be automatically rejected.\n\n` +
          `❌ We strongly recommend NOT applying to this job.\n` +
          `✅ Instead, focus on jobs with 50%+ alignment that match your actual background.\n\n` +
          `Do you still want to proceed?`
        : `⚠️ WARNING: This job has a low match score (${alignmentScore}%).\n\n` +
          `This job has significant gaps from your actual experience. The CV optimizer may struggle to create a ` +
          `truthful optimized version without fabricating content.\n\n` +
          `Consider focusing on jobs with better alignment (50%+).\n\n` +
          `Do you want to proceed anyway?`;

      const proceed = window.confirm(warningMessage);
      if (!proceed) {
        return;
      }
    }

    setIsOptimizing(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await aiService.optimizeCV(job, cvContent);

      setVersions(result.versions);
      setBaselineAlignment(result.baseline_alignment);
      setStrongMatches(result.strong_matches);
      setGaps(result.gaps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to optimize CV. Please check your API configuration.');
      console.error('CV optimization error:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleUpdateCV = async () => {
    if (!selectedVersionData || !activeCVId) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Save optimized CV content to the database
      await api.put('/cv/update', {
        cv_id: activeCVId,
        parsed_content: selectedVersionData.content,
      });

      // Update local store using store action
      updateCVContent(activeCVId, selectedVersionData.content);

      setSuccess(`CV updated successfully with ${selectedVersionData.type} version!`);

      // Close optimizer after 1.5 seconds to show CV preview
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update CV');
      console.error('CV update error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = (version: CVVersion) => {
    const blob = new Blob([version.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CV-${job.company}-${job.title.replace(/\s+/g, '-')}-${version.type}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedVersionData = versions.find(v => v.type === selectedVersion);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              CV Optimizer
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Optimize for: {job.title} at {job.company}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Alerts */}
        {error && (
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-destructive font-semibold mb-1">Error</p>
              <p className="text-sm text-destructive/90 break-words">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-2">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
            <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}

        {isLoadingCV ? (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary opacity-50 animate-pulse" />
            <p className="text-muted-foreground mb-2">Loading your CV...</p>
          </div>
        ) : !cvContent ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-50" />
            <p className="text-muted-foreground mb-2">
              No CV content available
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Please upload a CV before optimizing
            </p>
            <Button variant="outline" onClick={onClose}>
              Go Back
            </Button>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary opacity-50" />
            <p className="text-muted-foreground mb-2">
              Click the button below to generate 3 optimized CV versions tailored for this role
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Using {import.meta.env.VITE_AI_PROVIDER || 'OpenAI'} API
            </p>
            <Button onClick={handleOptimize} disabled={isOptimizing}>
              {isOptimizing ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin mr-2" />
                  Optimizing CV...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Optimized CVs
                </>
              )}
            </Button>
          </div>
        ) : (
          <>
            {/* Version Selector */}
            <div className="flex gap-2">
              {versions.map((version) => (
                <button
                  key={version.type}
                  onClick={() => setSelectedVersion(version.type)}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    selectedVersion === version.type
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-sm font-semibold capitalize mb-1">
                    {version.type}
                    {version.type === 'optimized' && (
                      <Badge variant="default" className="ml-2 text-xs">Recommended</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    {version.alignment}% match
                  </div>
                </button>
              ))}
            </div>

            {/* Selected Version Details */}
            {selectedVersionData && (
              <>
                <div>
                  <h3 className="font-semibold mb-2">Key Changes:</h3>
                  <ul className="space-y-1">
                    {selectedVersionData.changes.map((change, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary shrink-0">✓</span>
                        <span className="break-words">{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Alignment Improvement:</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Baseline</span>
                        <span className="font-semibold">{baselineAlignment || job.alignment_score || 45}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-muted-foreground"
                          style={{ width: `${baselineAlignment || job.alignment_score || 45}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-muted-foreground">→</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize">{selectedVersionData.type}</span>
                        <span className="font-semibold text-primary">{selectedVersionData.alignment}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${selectedVersionData.alignment}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strong Matches */}
                {strongMatches.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Strong Matches:</h3>
                    <ul className="space-y-1">
                      {strongMatches.map((match, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-green-600 shrink-0">✓</span>
                          <span className="break-words">{match}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Gaps */}
                {gaps.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Gaps to Address:</h3>
                    <ul className="space-y-1">
                      {gaps.map((gap, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-yellow-600 shrink-0">⚠</span>
                          <span className="break-words">{gap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Preview:</h3>
                  <div className="bg-secondary/50 rounded-lg p-4 font-mono text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">
                    {selectedVersionData.content}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={handleUpdateCV}
                    className="flex-1"
                    disabled={isSaving || !activeCVId}
                  >
                    {isSaving ? (
                      <>
                        <Sparkles className="h-4 w-4 animate-spin mr-2" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Update CV
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleDownload(selectedVersionData)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
