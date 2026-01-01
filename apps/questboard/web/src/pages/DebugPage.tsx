import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { get, post } from '../lib/api';

interface DebugResponse {
  storage: {
    mode: string;
    path?: string;
    url?: string;
  };
  orgId: string;
  currentUser: string;
  counts: {
    orgs: number;
    members: number;
    goals: number;
    questlines: number;
    quests: number;
    tasks: number;
  };
  jobSummaries: Array<{
    id: string;
    jobType: string;
    status: string;
    startedAt: string;
    finishedAt?: string;
    output?: any;
  }>;
  recentEvents: Array<{
    id: string;
    type: string;
    entityType: string;
    entityId: string;
    timestamp: string;
  }>;
  orgContext?: {
    raw: any;
    formatted: string;
    error?: string;
  } | null;
}

export default function DebugPage() {
  const location = useLocation();
  const [debugInfo, setDebugInfo] = useState<DebugResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningQuestmaster, setRunningQuestmaster] = useState(false);
  const [questmasterResult, setQuestmasterResult] = useState<any>(null);

  useEffect(() => {
    fetchDebugInfo();
  }, [location]);

  const fetchDebugInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await get<DebugResponse>('/api/debug');
      // Debug: Log orgContext to console
      console.log('Debug API Response - orgContext:', data.orgContext);
      setDebugInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch debug info');
    } finally {
      setLoading(false);
    }
  };

  const runQuestmaster = async () => {
    try {
      setRunningQuestmaster(true);
      setQuestmasterResult(null);
      setError(null);

      const result = await post<any>('/api/debug/run-questmaster');

      setQuestmasterResult(result);
      // Refresh debug info after running
      setTimeout(fetchDebugInfo, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run Questmaster');
    } finally {
      setRunningQuestmaster(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading debug info...</p>
      </div>
    );
  }

  if (error && !debugInfo) {
    return (
      <div style={{ padding: '40px' }}>
        <div style={{ padding: '20px', background: '#ffebee', borderRadius: '8px' }}>
          <p style={{ color: '#d32f2f', fontWeight: 'bold' }}>Error:</p>
          <p style={{ color: '#d32f2f' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!debugInfo) return null;

  return (
    <div
      style={{
        background: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '32px', margin: 0 }}>🔍 DEBUG</h2>
        <button
          onClick={fetchDebugInfo}
          style={{
            padding: '8px 16px',
            background: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ padding: '16px', background: '#ffebee', borderRadius: '8px', marginBottom: '20px' }}>
          <p style={{ color: '#d32f2f', fontWeight: 'bold', margin: '0 0 4px 0' }}>Error:</p>
          <p style={{ color: '#d32f2f', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Questmaster Result */}
      {questmasterResult && (
        <div style={{ padding: '16px', background: '#d4edda', borderRadius: '8px', marginBottom: '20px', border: '1px solid #c3e6cb' }}>
          <p style={{ color: '#155724', fontWeight: 'bold', margin: '0 0 8px 0' }}>✓ Questmaster Run Complete</p>
          <div style={{ fontSize: '14px', color: '#155724' }}>
            <div>Timestamp: {new Date(questmasterResult.timestamp).toLocaleString()}</div>
            {questmasterResult.stats && (
              <pre style={{
                marginTop: '8px',
                padding: '8px',
                background: 'white',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto'
              }}>
                {JSON.stringify(questmasterResult.stats, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* System Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', background: '#e3f2fd', borderRadius: '8px', border: '1px solid #90caf9' }}>
          <div style={{ fontSize: '14px', color: '#1976d2', marginBottom: '4px' }}>Storage Mode</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0d47a1' }}>{debugInfo.storage.mode}</div>
          {debugInfo.storage.path && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', wordBreak: 'break-all' }}>
              {debugInfo.storage.path}
            </div>
          )}
        </div>

        <div style={{ padding: '20px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
          <div style={{ fontSize: '14px', color: '#856404', marginBottom: '4px' }}>Current Org</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#856404' }}>{debugInfo.orgId}</div>
        </div>

        <div style={{ padding: '20px', background: '#d1ecf1', borderRadius: '8px', border: '1px solid #17a2b8' }}>
          <div style={{ fontSize: '14px', color: '#0c5460', marginBottom: '4px' }}>Current User</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0c5460' }}>{debugInfo.currentUser}</div>
        </div>
      </div>

      {/* Entity Counts */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>📊 Entity Counts</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
          {Object.entries(debugInfo.counts).map(([key, value]) => (
            <div
              key={key}
              style={{
                padding: '16px',
                background: '#f9f9f9',
                borderRadius: '8px',
                textAlign: 'center',
                border: '1px solid #ddd',
              }}
            >
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#667eea' }}>{value}</div>
              <div style={{ fontSize: '14px', color: '#666', textTransform: 'capitalize' }}>{key}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>⚡ Actions</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={runQuestmaster}
            disabled={runningQuestmaster}
            style={{
              padding: '12px 24px',
              background: runningQuestmaster ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: runningQuestmaster ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '16px',
            }}
          >
            {runningQuestmaster ? '⏳ Running...' : '🎮 Run Questmaster Now'}
          </button>
        </div>
        <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
          Runs the Questmaster job to generate daily deck and assign tasks
        </p>
      </div>

      {/* Last Job Runs */}
      {debugInfo.jobSummaries && debugInfo.jobSummaries.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>📋 Last Job Runs</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Job Type</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Started</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Finished</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Output</th>
                </tr>
              </thead>
              <tbody>
                {debugInfo.jobSummaries.map((job, idx) => (
                  <tr key={job.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>
                      <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '3px' }}>
                        {job.jobType}
                      </code>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          background: job.status === 'completed' ? '#d4edda' : '#fff3cd',
                          color: job.status === 'completed' ? '#155724' : '#856404',
                        }}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      {new Date(job.startedAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      {job.finishedAt ? new Date(job.finishedAt).toLocaleString() : '-'}
                    </td>
                    <td style={{ padding: '12px', fontSize: '12px', maxWidth: '200px' }}>
                      {job.output ? (
                        <details>
                          <summary style={{ cursor: 'pointer', color: '#0066cc' }}>View</summary>
                          <pre style={{
                            marginTop: '8px',
                            padding: '8px',
                            background: '#f5f5f5',
                            borderRadius: '4px',
                            fontSize: '11px',
                            overflow: 'auto',
                            maxHeight: '150px'
                          }}>
                            {JSON.stringify(job.output, null, 2)}
                          </pre>
                        </details>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Organizational Knowledge Base Context */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>🧠 Organizational Knowledge Base Context</h3>
        {!debugInfo.orgContext ? (
          <div style={{ padding: '16px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
            <p style={{ color: '#856404', fontWeight: 'bold', margin: '0 0 4px 0' }}>⚠️ Context not available</p>
            <p style={{ color: '#856404', margin: 0, fontSize: '14px' }}>
              The organizational context could not be built. This might be because:
              <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                <li>The org has no goals or quests yet</li>
                <li>There was an error building the context (check server logs)</li>
                <li>The context builder encountered an issue</li>
              </ul>
            </p>
          </div>
        ) : debugInfo.orgContext.error ? (
          <div style={{ padding: '16px', background: '#ffebee', borderRadius: '8px', border: '1px solid #f44336' }}>
            <p style={{ color: '#d32f2f', fontWeight: 'bold', margin: '0 0 4px 0' }}>❌ Error building context:</p>
            <p style={{ color: '#d32f2f', margin: 0, fontSize: '14px' }}>{debugInfo.orgContext.error}</p>
          </div>
        ) : (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>Formatted Context (for AI prompts):</h4>
                <pre style={{
                  padding: '16px',
                  background: '#f5f5f5',
                  borderRadius: '8px',
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '400px',
                  border: '1px solid #ddd',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {debugInfo.orgContext.formatted || '(empty)'}
                </pre>
              </div>
              <details style={{ marginTop: '16px' }}>
                <summary style={{ cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', color: '#0066cc', marginBottom: '8px' }}>
                  View Raw Context Data
                </summary>
                <pre style={{
                  padding: '16px',
                  background: '#f9f9f9',
                  borderRadius: '8px',
                  fontSize: '11px',
                  overflow: 'auto',
                  maxHeight: '300px',
                  border: '1px solid #ddd',
                }}>
                  {JSON.stringify(debugInfo.orgContext.raw, null, 2)}
                </pre>
              </details>
              <div style={{ marginTop: '12px', padding: '12px', background: '#e3f2fd', borderRadius: '8px', fontSize: '14px', color: '#1976d2' }}>
                <strong>💡 What this is:</strong> This context is automatically included in AI prompts (clarify, decompose, level-up) to give the AI awareness of your organization's current goals, quests, outputs, and knowledge patterns.
                <div style={{ marginTop: '8px', fontSize: '13px' }}>
                  <strong>To test:</strong> Create or clarify a goal - the AI will use this context to make organization-specific recommendations.
                </div>
              </div>
              {debugInfo.orgContext && debugInfo.orgContext.raw && (
                <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '12px', background: '#f0f0f0', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                      {debugInfo.orgContext.raw.activeGoals?.length || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Active Goals</div>
                  </div>
                  <div style={{ padding: '12px', background: '#f0f0f0', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                      {debugInfo.orgContext.raw.completedGoals?.length || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Completed Goals</div>
                  </div>
                  <div style={{ padding: '12px', background: '#f0f0f0', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                      {debugInfo.orgContext.raw.activeQuests?.length || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Active Quests</div>
                  </div>
                  <div style={{ padding: '12px', background: '#f0f0f0', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                      {debugInfo.orgContext.raw.recentOutputs?.length || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Recent Outputs</div>
                  </div>
                  <div style={{ padding: '12px', background: '#f0f0f0', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>
                      {debugInfo.orgContext.raw.knowledgeCards?.length || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Knowledge Cards</div>
                  </div>
                </div>
              )}
            </div>
        )}
      </div>

      {/* Recent Events */}
      {debugInfo.recentEvents && debugInfo.recentEvents.length > 0 && (
        <div>
          <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>📡 Recent Events (Last 10)</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Entity</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Entity ID</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {debugInfo.recentEvents.slice(0, 10).map((event, idx) => (
                  <tr key={event.id || idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>
                      <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>
                        {event.type}
                      </code>
                    </td>
                    <td style={{ padding: '12px' }}>{event.entityType}</td>
                    <td style={{ padding: '12px' }}>
                      <code style={{ fontSize: '12px', color: '#666' }}>{event.entityId}</code>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
