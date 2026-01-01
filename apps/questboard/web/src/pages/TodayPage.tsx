import { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { get, post } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';

interface DailyDeckItem {
  taskId: string;
  taskTitle: string;
  questId: string;
  questTitle: string;
  questlineId: string;
  questlineTitle: string;
  goalId?: string | null;
  goalPath?: Array<{ id: string; title: string }>;
  assignedToMemberId?: string;
  assignedToMemberEmail?: string;
  estimatedMinutes: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  phase?: string;
  reason: string;
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
}

interface TeamCapacity {
  memberId: string;
  memberEmail: string;
  capacityMinutes: number;
  plannedMinutes: number;
  utilizationPercent: number;
}

interface DailyDeck {
  id: string;
  orgId: string;
  date: string;
  generatedAt: string;
  items: DailyDeckItem[];
  teamCapacity: TeamCapacity[];
  summary: {
    totalTasks: number;
    totalEstimatedMinutes: number;
    tasksConsidered: number;
    warnings?: string[];
  };
}

interface JobRunSummary {
  id: string;
  orgId: string;
  jobId: string;
  startedAt: string;
  finishedAt: string;
  status: 'success' | 'failed' | 'partial';
  stats: {
    tasks?: number;
    decksGenerated?: number;
    unlockedQuests?: number;
    dailyDeckTasks?: number;
    dailyDeckWarnings?: number;
  };
}

interface DailyDeckResponse {
  exists: boolean;
  dailyDeck?: DailyDeck;
  lastQuestmasterRun?: JobRunSummary;
  counts?: {
    goals: number;
    questlines: number;
    quests: number;
    tasks: number;
    members: number;
  };
  message?: string;
  orgId: string;
}

export default function TodayPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<DailyDeckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningQuestmaster, setRunningQuestmaster] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [goalPaths, setGoalPaths] = useState<Map<string, Array<{ id: string; title: string }>>>(new Map());

  useEffect(() => {
    fetchDailyDeck();
  }, []);

  const fetchDailyDeck = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await get<DailyDeckResponse>('/api/daily-deck');
      console.log('[TodayPage] API response:', result);

      // Validate response structure
      if (result.exists && !result.dailyDeck) {
        console.warn('[TodayPage] API returned exists=true but no dailyDeck:', result);
        setError('API returned invalid data structure (exists=true but no dailyDeck)');
      }

      setData(result);

      // Fetch goal paths for quests that have goalId
      if (result.dailyDeck?.items) {
        const goalPathPromises: Promise<void>[] = [];
        const pathMap = new Map<string, Array<{ id: string; title: string }>>();

        for (const item of result.dailyDeck.items) {
          // Try to get goalId from quest
          if (item.questId) {
            goalPathPromises.push(
              get<any>(`/api/quests/${item.questId}`)
                .then(quest => {
                  if (quest?.goalId) {
                    return get<any[]>(`/api/goals/${quest.goalId}/path`)
                      .then(path => {
                        if (path && path.length > 0) {
                          pathMap.set(item.questId, path.map((g: any) => ({ id: g.id, title: g.title })));
                        }
                      })
                      .catch(() => {});
                  }
                })
                .catch(() => {})
            );
          }
        }

        await Promise.all(goalPathPromises);
        setGoalPaths(pathMap);
      }
    } catch (err) {
      console.error('[TodayPage] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch daily deck');
      setData(null); // Clear data on error
    } finally {
      setLoading(false);
    }
  };

  const runQuestmaster = async () => {
    try {
      setRunningQuestmaster(true);
      setError(null);

      await post('/api/debug/run-questmaster');

      // Refresh the deck after running
      await fetchDailyDeck();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run Questmaster');
    } finally {
      setRunningQuestmaster(false);
    }
  };

  const seedDemoData = async () => {
    try {
      setSeeding(true);
      setError(null);
      setSeedSuccess(false);

      await post('/api/seed-demo');

      setSeedSuccess(true);

      setTimeout(() => {
        window.location.href = '/today';
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed demo data');
      setSeeding(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#dc3545';
      case 'high':
        return '#fd7e14';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return '✅';
      case 'in-progress':
        return '⚙️';
      case 'blocked':
        return '🚫';
      default:
        return '⬜';
    }
  };

  const getPhaseIcon = (phase?: string) => {
    switch (phase) {
      case 'W':
        return '💭';
      case 'I':
        return '💡';
      case 'D':
        return '🔍';
      case 'G':
        return '📣';
      case 'E':
        return '🛠️';
      case 'T':
        return '🎯';
      default:
        return '';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <LoadingSpinner message="Loading your daily deck..." />
      </div>
    );
  }

  // Empty state: No data or no deck exists
  if (!data || !data.exists || !data.dailyDeck) {
    const hasNoData = data?.counts && data.counts.tasks === 0 && data.counts.quests === 0;

    return (
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h1 style={{ fontSize: '36px', margin: '0 0 8px 0' }}>📅 Today</h1>
            <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>
              {formatDate(new Date().toISOString())}
            </p>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '16px 20px',
            background: '#ffebee',
            borderRadius: '8px',
            color: '#d32f2f',
            marginBottom: '20px',
            borderLeft: '4px solid #d32f2f',
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#f0f8ff',
          borderRadius: '12px',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>
            {hasNoData ? '🎲' : '🎮'}
          </div>
          <h3 style={{ fontSize: '24px', marginBottom: '12px', color: '#333' }}>
            {hasNoData ? 'No Tasks Available' : 'No Daily Deck Yet'}
          </h3>
          <p style={{ fontSize: '16px', marginBottom: '20px', color: '#666' }}>
            {hasNoData
              ? 'Create some goals and tasks first, or try the demo!'
              : 'Run Questmaster to generate your daily deck of priority tasks.'}
          </p>

          {seedSuccess && (
            <div style={{
              marginBottom: '16px',
              padding: '12px 20px',
              background: '#d4edda',
              color: '#155724',
              borderRadius: '8px',
              fontWeight: 'bold',
            }}>
              ✓ Demo data created! Redirecting...
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {hasNoData && (
              <button
                onClick={seedDemoData}
                disabled={seeding || seedSuccess}
                style={{
                  padding: '14px 28px',
                  background: seeding || seedSuccess ? '#ccc' : '#ff6b6b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: seeding || seedSuccess ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  boxShadow: seeding || seedSuccess ? 'none' : '0 4px 6px rgba(255, 107, 107, 0.3)',
                }}
              >
                {seeding ? '🌱 Seeding...' : seedSuccess ? '✓ Success!' : '🎲 Seed Demo Data'}
              </button>
            )}
            {!hasNoData && (
              <button
                onClick={runQuestmaster}
                disabled={runningQuestmaster}
                style={{
                  padding: '14px 28px',
                  background: runningQuestmaster ? '#ccc' : '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: runningQuestmaster ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  boxShadow: runningQuestmaster ? 'none' : '0 4px 6px rgba(102, 126, 234, 0.3)',
                }}
              >
                {runningQuestmaster ? '⚙️ Running...' : '🎯 Run Questmaster'}
              </button>
            )}
            <Link
              to="/goals"
              style={{
                display: 'inline-block',
                padding: '14px 28px',
                background: '#28a745',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontSize: '16px',
                boxShadow: '0 4px 6px rgba(40, 167, 69, 0.3)',
              }}
            >
              Create Goal →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Safety check: ensure dailyDeck exists before rendering
  if (!data.dailyDeck) {
    return (
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#fff3cd',
          borderRadius: '12px',
          color: '#856404',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
          <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>Daily Deck Data Missing</h3>
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>
            The API returned exists=true but no dailyDeck data. This might be a data structure issue.
          </p>
          {error && (
            <div style={{
              marginTop: '20px',
              padding: '12px',
              background: '#ffebee',
              borderRadius: '8px',
              color: '#d32f2f',
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Safety check: ensure dailyDeck exists and has required properties
  if (!data.dailyDeck) {
    console.error('[TodayPage] Missing dailyDeck in data:', data);
    return (
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#fff3cd',
          borderRadius: '12px',
          color: '#856404',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
          <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>Daily Deck Data Missing</h3>
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>
            The API returned exists=true but no dailyDeck data.
          </p>
          <pre style={{ textAlign: 'left', background: '#f5f5f5', padding: '12px', borderRadius: '4px', fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  const { dailyDeck, lastQuestmasterRun, counts } = data;

  // Validate dailyDeck structure
  if (!dailyDeck.items || !Array.isArray(dailyDeck.items)) {
    console.error('[TodayPage] Invalid dailyDeck.items:', dailyDeck);
    return (
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#ffebee',
          borderRadius: '12px',
          color: '#d32f2f',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>❌</div>
          <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>Invalid Daily Deck Structure</h3>
          <p style={{ fontSize: '16px', marginBottom: '20px' }}>
            The dailyDeck.items property is missing or not an array.
          </p>
          <pre style={{ textAlign: 'left', background: '#f5f5f5', padding: '12px', borderRadius: '4px', fontSize: '12px', overflow: 'auto', maxHeight: '300px' }}>
            {JSON.stringify(dailyDeck, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  // Ensure summary exists with safe defaults
  const summary = dailyDeck.summary || {
    totalTasks: dailyDeck.items.length,
    totalEstimatedMinutes: dailyDeck.items.reduce((sum, item) => sum + (item.estimatedMinutes || 0), 0),
    tasksConsidered: dailyDeck.items.length,
    warnings: undefined,
  };

  // Ensure teamCapacity is an array
  const teamCapacity = Array.isArray(dailyDeck.teamCapacity) ? dailyDeck.teamCapacity : [];

  // Ensure items is an array (already validated above, but double-check)
  const items = Array.isArray(dailyDeck.items) ? dailyDeck.items : [];

  return (
    <div className="card" style={{ padding: '20px' }}>
      {/* Header */}
      <div className="page-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
          <h1 style={{ fontSize: '36px', margin: '0 0 8px 0' }}>📅 Today</h1>
          <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>
            {formatDate(dailyDeck.date || new Date().toISOString().split('T')[0])}
          </p>
        </div>
        <button
          onClick={runQuestmaster}
          disabled={runningQuestmaster}
          className="btn btn-primary"
          style={{
            background: runningQuestmaster ? '#ccc' : '#667eea',
          }}
        >
          {runningQuestmaster ? '⚙️ Running...' : '🔄 Run Questmaster'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '16px 20px',
          background: '#ffebee',
          borderRadius: '8px',
          color: '#d32f2f',
          marginBottom: '20px',
          borderLeft: '4px solid #d32f2f',
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Last Run Info */}
      {lastQuestmasterRun && (
        <div style={{
          padding: '20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          color: 'white',
          marginBottom: '30px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>🤖 Last Questmaster Run</h3>
            <span style={{ fontSize: '14px', opacity: 0.9 }}>
              {formatTime(lastQuestmasterRun.finishedAt)}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Tasks Considered</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{summary.tasksConsidered || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Tasks Selected</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{summary.totalTasks || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Quests Unlocked</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{lastQuestmasterRun?.stats?.unlockedQuests || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>Warnings</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {summary.warnings?.length || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {summary.warnings && summary.warnings.length > 0 && (
        <div style={{
          padding: '16px 20px',
          background: '#fff3cd',
          borderRadius: '8px',
          color: '#856404',
          marginBottom: '20px',
          borderLeft: '4px solid #ffc107',
        }}>
          <strong>⚠️ Warnings:</strong>
          <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
            {summary.warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Team Capacity */}
      {teamCapacity.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>👥 Team Capacity</h3>
          <div className="responsive-grid">
            {teamCapacity.map((member) => {
              const isOverCapacity = member.utilizationPercent > 100;
              const isNearCapacity = member.utilizationPercent > 80 && member.utilizationPercent <= 100;

              return (
                <div
                  key={member.memberId}
                  style={{
                    padding: '16px',
                    background: isOverCapacity ? '#ffebee' : isNearCapacity ? '#fff3e0' : '#f9f9f9',
                    borderRadius: '8px',
                    border: `2px solid ${isOverCapacity ? '#ef5350' : isNearCapacity ? '#ff9800' : '#e0e0e0'}`,
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                    {member.memberEmail}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    {formatMinutes(member.plannedMinutes)} / {formatMinutes(member.capacityMinutes)}
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: '#e0e0e0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${Math.min(member.utilizationPercent, 100)}%`,
                      height: '100%',
                      background: isOverCapacity ? '#ef5350' : isNearCapacity ? '#ff9800' : '#4caf50',
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <div style={{
                    fontSize: '12px',
                    marginTop: '4px',
                    color: isOverCapacity ? '#d32f2f' : isNearCapacity ? '#e65100' : '#666',
                    fontWeight: isOverCapacity ? 'bold' : 'normal',
                  }}>
                    {member.utilizationPercent}% {isOverCapacity && '⚠️ OVERFLOW'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily Deck */}
      <div>
        <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>
          🎯 Today's Deck ({items.length} {items.length === 1 ? 'task' : 'tasks'})
        </h3>

        {items.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            background: '#f9f9f9',
            borderRadius: '8px',
            color: '#666',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
            <p style={{ fontSize: '16px' }}>No tasks in today's deck.</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              {summary.warnings?.[0] || 'All tasks are blocked, completed, or locked.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {items.map((item, idx) => (
              <div
                key={item.taskId}
                onClick={() => navigate(`/tasks/${item.taskId}`)}
                className="card card-clickable"
                style={{
                  padding: '20px',
                  background: 'white',
                  border: '2px solid #e0e0e0',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#667eea';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '20px' }}>{getStatusIcon(item.status)}</span>
                      <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                        {item.taskTitle}
                      </h4>
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                      {goalPaths.get(item.questId) && goalPaths.get(item.questId)!.length > 0 && (
                        <span style={{ color: '#0066cc', marginRight: '8px' }}>
                          {goalPaths.get(item.questId)!.map((g, i) => (
                            <span key={g.id}>
                              {i > 0 && ' → '}
                              <Link
                                to={`/goals/${g.id}`}
                                style={{ textDecoration: 'underline', color: '#0066cc' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {g.title}
                              </Link>
                            </span>
                          ))} →
                        </span>
                      )}
                      <strong>{item.questlineTitle}</strong> → {item.questTitle}
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    background: getPriorityColor(item.priority),
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                  }}>
                    {item.priority}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '14px', color: '#666' }}>
                  {item.phase && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{getPhaseIcon(item.phase)}</span>
                      <span>Phase {item.phase}</span>
                    </div>
                  )}
                  <div>⏱️ {formatMinutes(item.estimatedMinutes)}</div>
                  {item.assignedToMemberEmail && (
                    <div>👤 {item.assignedToMemberEmail}</div>
                  )}
                </div>

                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: '#f0f8ff',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#0066cc',
                  borderLeft: '3px solid #667eea',
                }}>
                  💡 <strong>Why:</strong> {item.reason}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="responsive-grid" style={{
        marginTop: '30px',
        padding: '20px',
        background: '#f9f9f9',
        borderRadius: '8px',
      }}>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Time Estimated</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {formatMinutes(summary.totalEstimatedMinutes || 0)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>Tasks in Deck</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{summary.totalTasks || 0}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#666' }}>Generated At</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{formatTime(dailyDeck.generatedAt || new Date().toISOString())}</div>
        </div>
        {counts && (
          <div>
            <div style={{ fontSize: '12px', color: '#666' }}>Total Tasks</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{counts.tasks}</div>
          </div>
        )}
      </div>
    </div>
  );
}
