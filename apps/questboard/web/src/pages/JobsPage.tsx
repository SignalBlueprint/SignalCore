import React, { useEffect, useState } from 'react';
import { get } from '../lib/api';

interface JobRunSummary {
  id: string;
  orgId: string;
  jobId: string;
  startedAt: string;
  finishedAt: string;
  status: 'success' | 'failed' | 'partial';
  error?: string;
  stats: {
    goals?: number;
    questlines?: number;
    quests?: number;
    tasks?: number;
    decksGenerated?: number;
    unlockedQuests?: number;
    staleTasks?: number;
    sprintPlansGenerated?: number;
    memberPlansGenerated?: number;
    dailyDeckTasks?: number;
    dailyDeckWarnings?: number;
  };
  createdAt: string;
}

interface JobStats {
  jobId: string;
  totalRuns: number;
  successCount: number;
  failedCount: number;
  partialCount: number;
  successRate: number;
  avgDuration: number;
  lastRun?: JobRunSummary;
}

interface JobsData {
  summaries: JobRunSummary[];
  statistics: JobStats[];
}

export default function JobsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobsData, setJobsData] = useState<JobsData | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobRunSummary | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterJobId, setFilterJobId] = useState<string>('all');

  useEffect(() => {
    const fetchJobsData = async () => {
      try {
        setLoading(true);
        const data = await get<JobsData>('/api/jobs');
        setJobsData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchJobsData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchJobsData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !jobsData) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!jobsData) return null;

  const { summaries, statistics } = jobsData;

  // Filter summaries
  const filteredSummaries = summaries.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterJobId !== 'all' && s.jobId !== filterJobId) return false;
    return true;
  });

  // Get unique job IDs
  const uniqueJobIds = Array.from(new Set(summaries.map(s => s.jobId))).sort();

  const formatDuration = (start: string, finish: string) => {
    const duration = new Date(finish).getTime() - new Date(start).getTime();
    const seconds = Math.floor(duration / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-700 bg-green-100';
      case 'failed': return 'text-red-700 bg-red-100';
      case 'partial': return 'text-yellow-700 bg-yellow-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✓';
      case 'failed': return '✗';
      case 'partial': return '⚠';
      default: return '•';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Job Monitoring Dashboard</h1>
        <p className="text-gray-600">Monitor worker job executions, performance, and status</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statistics.map(stat => (
          <div key={stat.jobId} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">{stat.jobId}</h3>
            <div className="flex items-baseline justify-between mb-4">
              <div className="text-3xl font-bold text-gray-900">{stat.totalRuns}</div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                stat.lastRun ? getStatusColor(stat.lastRun.status) : 'text-gray-500 bg-gray-100'
              }`}>
                {stat.lastRun ? getStatusIcon(stat.lastRun.status) : '—'}
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Success Rate:</span>
                <span className="font-medium">{stat.successRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Duration:</span>
                <span className="font-medium">{stat.avgDuration.toFixed(1)}s</span>
              </div>
              {stat.lastRun && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Run:</span>
                  <span className="font-medium">{formatRelativeTime(stat.lastRun.finishedAt)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6 border border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
            <select
              value={filterJobId}
              onChange={(e) => setFilterJobId(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Jobs</option>
              {uniqueJobIds.map(jobId => (
                <option key={jobId} value={jobId}>{jobId}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="partial">Partial</option>
            </select>
          </div>
          <div className="flex items-end ml-auto">
            <div className="text-sm text-gray-600">
              Showing {filteredSummaries.length} of {summaries.length} runs
            </div>
          </div>
        </div>
      </div>

      {/* Job History Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Job Execution History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key Stats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No job runs found matching the current filters
                  </td>
                </tr>
              ) : (
                filteredSummaries.map(job => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{job.jobId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(job.status)}`}>
                        {getStatusIcon(job.status)} {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDateTime(job.startedAt)}</div>
                      <div className="text-xs text-gray-500">{formatRelativeTime(job.startedAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(job.startedAt, job.finishedAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {Object.entries(job.stats)
                          .filter(([_, value]) => typeof value === 'number' && value > 0)
                          .slice(0, 3)
                          .map(([key, value]) => (
                            <span key={key} className="inline-block mr-2 text-xs">
                              {key}: <span className="font-medium">{value}</span>
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-xl font-semibold text-gray-900">Job Run Details</h3>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-4">
              {/* Job Info */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">Job Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Job ID</p>
                    <p className="text-sm font-medium text-gray-900">{selectedJob.jobId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedJob.status)}`}>
                      {getStatusIcon(selectedJob.status)} {selectedJob.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Started At</p>
                    <p className="text-sm font-medium text-gray-900">{formatDateTime(selectedJob.startedAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Finished At</p>
                    <p className="text-sm font-medium text-gray-900">{formatDateTime(selectedJob.finishedAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDuration(selectedJob.startedAt, selectedJob.finishedAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Run ID</p>
                    <p className="text-sm font-mono text-gray-700 truncate" title={selectedJob.id}>
                      {selectedJob.id}
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {selectedJob.error && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Error Details</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800 font-mono">{selectedJob.error}</p>
                  </div>
                </div>
              )}

              {/* Statistics */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-3">Execution Statistics</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(selectedJob.stats)
                      .filter(([_, value]) => value !== undefined && value !== null)
                      .map(([key, value]) => (
                        <div key={key} className="flex flex-col">
                          <span className="text-xs text-gray-500 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className="text-lg font-semibold text-gray-900">{value}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Raw Data */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Raw Data</h4>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs text-gray-100">
                    {JSON.stringify(selectedJob, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
