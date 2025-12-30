import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface AnalyticsData {
  orgId: string;
  summary: {
    totalGoals: number;
    totalQuestlines: number;
    totalQuests: number;
    totalTasks: number;
    totalMembers: number;
    completionRate: number;
    avgCompletionTimeMinutes: number;
    teamUtilization: number;
  };
  tasksByStatus: {
    todo: number;
    inProgress: number;
    done: number;
    blocked: number;
  };
  goalsByStatus: {
    draft: number;
    clarified: number;
    approved: number;
    active: number;
    completed: number;
    paused: number;
  };
  questsByState: {
    locked: number;
    unlocked: number;
    inProgress: number;
    completed: number;
  };
  wgDistribution: {
    W: number;
    I: number;
    D: number;
    G: number;
    E: number;
    T: number;
  };
  tasksByPhase: {
    W: number;
    I: number;
    D: number;
    G: number;
    E: number;
    T: number;
    unassigned: number;
  };
  teamCapacity: Array<{
    memberId: string;
    memberEmail: string;
    capacityUsed: number;
    capacityTotal: number;
    blockersCount: number;
    activeQuestTitle?: string;
  }>;
  overloadedMembers: Array<{
    email: string;
    utilizationPercent: number;
  }>;
  atRisk: {
    overloadedMembers: number;
    blockedTasks: number;
    lockedQuests: number;
    staleGoals: number;
  };
  recentActivity: Array<{
    type: string;
    payload: any;
    createdAt: string;
  }>;
}

export default function AnalyticsPage() {
  const [searchParams] = useSearchParams();
  const orgId = searchParams.get('orgId') || 'default-org';
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [orgId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/analytics?orgId=${orgId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h`;
    return `${mins}m`;
  };

  const getWGLabel = (phase: string) => {
    const labels: Record<string, string> = {
      W: 'Wonder',
      I: 'Invention',
      D: 'Discernment',
      G: 'Galvanizing',
      E: 'Enablement',
      T: 'Tenacity',
    };
    return labels[phase] || phase;
  };

  const getWGIcon = (phase: string) => {
    const icons: Record<string, string> = {
      W: '💭',
      I: '💡',
      D: '🔍',
      G: '📣',
      E: '🛠️',
      T: '🎯',
    };
    return icons[phase] || '';
  };

  const getActivityIcon = (type: string) => {
    if (type.includes('task.completed')) return '✅';
    if (type.includes('quest.unlocked')) return '🔓';
    if (type.includes('goal.created')) return '🎯';
    if (type.includes('member.created')) return '👤';
    if (type.includes('assignment')) return '📋';
    return '📌';
  };

  const formatActivityMessage = (activity: AnalyticsData['recentActivity'][0]) => {
    const payload = activity.payload;
    switch (activity.type) {
      case 'task.completed':
        return `Task completed: ${payload.title || payload.taskTitle || 'Unknown'}`;
      case 'quest.unlocked':
        return `Quest unlocked: ${payload.title || 'Unknown'}`;
      case 'quest.goal.created':
        return `Goal created: ${payload.title || 'Unknown'}`;
      case 'member.created':
        return `Member joined: ${payload.email || 'Unknown'}`;
      case 'audit.assignment.changed':
        return `Task assigned: ${payload.taskTitle || 'Unknown'}`;
      default:
        return activity.type;
    }
  };

  if (loading) {
    return (
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        textAlign: 'center',
      }}>
        <p style={{ color: '#666', fontSize: '18px' }}>Loading analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          padding: '16px 20px',
          background: '#ffebee',
          borderRadius: '8px',
          color: '#d32f2f',
          borderLeft: '4px solid #d32f2f',
        }}>
          <strong>Error:</strong> {error || 'Failed to load analytics'}
        </div>
      </div>
    );
  }

  const { summary, tasksByStatus, goalsByStatus, questsByState, wgDistribution, tasksByPhase, atRisk } = data;

  return (
    <div style={{
      background: 'white',
      padding: '40px',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '36px', margin: '0 0 8px 0' }}>📊 Analytics Dashboard</h1>
        <p style={{ margin: 0, color: '#666', fontSize: '16px' }}>
          Organization: {orgId}
        </p>
      </div>

      {/* At-Risk Alerts */}
      {(atRisk.overloadedMembers > 0 || atRisk.blockedTasks > 0 || atRisk.staleGoals > 0) && (
        <div style={{
          marginBottom: '30px',
          padding: '20px',
          background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
          borderRadius: '12px',
          color: 'white',
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>⚠️ Attention Required</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {atRisk.overloadedMembers > 0 && (
              <div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Overloaded Members</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{atRisk.overloadedMembers}</div>
              </div>
            )}
            {atRisk.blockedTasks > 0 && (
              <div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Blocked Tasks</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{atRisk.blockedTasks}</div>
              </div>
            )}
            {atRisk.staleGoals > 0 && (
              <div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Stale Goals (7+ days)</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{atRisk.staleGoals}</div>
              </div>
            )}
            {atRisk.lockedQuests > 0 && (
              <div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Locked Quests</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{atRisk.lockedQuests}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>📈 Key Metrics</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
        }}>
          <MetricCard
            icon="🎯"
            title="Goals"
            value={summary.totalGoals}
            color="#667eea"
          />
          <MetricCard
            icon="🗺️"
            title="Questlines"
            value={summary.totalQuestlines}
            color="#764ba2"
          />
          <MetricCard
            icon="⚔️"
            title="Quests"
            value={summary.totalQuests}
            color="#f093fb"
          />
          <MetricCard
            icon="✅"
            title="Tasks"
            value={summary.totalTasks}
            color="#4facfe"
          />
          <MetricCard
            icon="👥"
            title="Team Members"
            value={summary.totalMembers}
            color="#43e97b"
          />
          <MetricCard
            icon="📊"
            title="Completion Rate"
            value={`${summary.completionRate}%`}
            color="#fa709a"
          />
          <MetricCard
            icon="⏱️"
            title="Avg Completion Time"
            value={formatMinutes(summary.avgCompletionTimeMinutes)}
            color="#fee140"
          />
          <MetricCard
            icon="📈"
            title="Team Utilization"
            value={`${summary.teamUtilization}%`}
            color="#30cfd0"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '30px',
        marginBottom: '40px',
      }}>
        {/* Tasks by Status */}
        <ChartCard title="📋 Tasks by Status">
          <BarChart
            data={[
              { label: 'To Do', value: tasksByStatus.todo, color: '#ffc107' },
              { label: 'In Progress', value: tasksByStatus.inProgress, color: '#2196f3' },
              { label: 'Done', value: tasksByStatus.done, color: '#4caf50' },
              { label: 'Blocked', value: tasksByStatus.blocked, color: '#f44336' },
            ]}
          />
        </ChartCard>

        {/* Quests by State */}
        <ChartCard title="⚔️ Quests by State">
          <BarChart
            data={[
              { label: 'Locked', value: questsByState.locked, color: '#9e9e9e' },
              { label: 'Unlocked', value: questsByState.unlocked, color: '#ffc107' },
              { label: 'In Progress', value: questsByState.inProgress, color: '#2196f3' },
              { label: 'Completed', value: questsByState.completed, color: '#4caf50' },
            ]}
          />
        </ChartCard>

        {/* Goals by Status */}
        <ChartCard title="🎯 Goals by Status">
          <BarChart
            data={[
              { label: 'Draft', value: goalsByStatus.draft, color: '#9e9e9e' },
              { label: 'Clarified', value: goalsByStatus.clarified, color: '#ff9800' },
              { label: 'Approved', value: goalsByStatus.approved, color: '#2196f3' },
              { label: 'Active', value: goalsByStatus.active, color: '#4caf50' },
              { label: 'Completed', value: goalsByStatus.completed, color: '#8bc34a' },
              { label: 'Paused', value: goalsByStatus.paused, color: '#ffc107' },
            ]}
          />
        </ChartCard>

        {/* Working Genius Distribution */}
        <ChartCard title="🧠 Working Genius Distribution">
          <BarChart
            data={[
              { label: `${getWGIcon('W')} Wonder`, value: wgDistribution.W, color: '#e91e63' },
              { label: `${getWGIcon('I')} Invention`, value: wgDistribution.I, color: '#9c27b0' },
              { label: `${getWGIcon('D')} Discernment`, value: wgDistribution.D, color: '#3f51b5' },
              { label: `${getWGIcon('G')} Galvanizing`, value: wgDistribution.G, color: '#00bcd4' },
              { label: `${getWGIcon('E')} Enablement`, value: wgDistribution.E, color: '#4caf50' },
              { label: `${getWGIcon('T')} Tenacity`, value: wgDistribution.T, color: '#ff9800' },
            ]}
          />
        </ChartCard>
      </div>

      {/* Team Capacity */}
      {data.teamCapacity.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>👥 Team Capacity</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '16px',
          }}>
            {data.teamCapacity.map((member) => {
              const utilizationPercent = Math.round((member.capacityUsed / member.capacityTotal) * 100);
              const isOverloaded = utilizationPercent > 100;
              const isNearCapacity = utilizationPercent > 80 && utilizationPercent <= 100;

              return (
                <div
                  key={member.memberId}
                  style={{
                    padding: '16px',
                    background: isOverloaded ? '#ffebee' : isNearCapacity ? '#fff3e0' : '#f9f9f9',
                    borderRadius: '8px',
                    border: `2px solid ${isOverloaded ? '#ef5350' : isNearCapacity ? '#ff9800' : '#e0e0e0'}`,
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
                    {member.memberEmail}
                  </div>
                  {member.activeQuestTitle && (
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      📍 {member.activeQuestTitle}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    {formatMinutes(member.capacityUsed)} / {formatMinutes(member.capacityTotal)}
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: '#e0e0e0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${Math.min(utilizationPercent, 100)}%`,
                      height: '100%',
                      background: isOverloaded ? '#ef5350' : isNearCapacity ? '#ff9800' : '#4caf50',
                    }} />
                  </div>
                  <div style={{
                    fontSize: '12px',
                    marginTop: '4px',
                    color: isOverloaded ? '#d32f2f' : isNearCapacity ? '#e65100' : '#666',
                    fontWeight: isOverloaded ? 'bold' : 'normal',
                  }}>
                    {utilizationPercent}% {isOverloaded && '⚠️ OVERLOADED'}
                  </div>
                  {member.blockersCount > 0 && (
                    <div style={{
                      marginTop: '8px',
                      padding: '4px 8px',
                      background: '#ffebee',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#d32f2f',
                    }}>
                      🚫 {member.blockersCount} blocked task{member.blockersCount !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>🔔 Recent Activity</h2>
        <div style={{
          background: '#f9f9f9',
          borderRadius: '8px',
          padding: '20px',
        }}>
          {data.recentActivity.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center' }}>No recent activity</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.recentActivity.slice(0, 15).map((activity, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    background: 'white',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{ fontSize: '20px' }}>{getActivityIcon(activity.type)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', color: '#333' }}>
                      {formatActivityMessage(activity)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      {new Date(activity.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Components

function MetricCard({ icon, title, value, color }: { icon: string; title: string; value: string | number; color: string }) {
  return (
    <div style={{
      padding: '24px',
      background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
      borderRadius: '12px',
      color: 'white',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    }}>
      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: '24px',
      background: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '12px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>{title}</h3>
      {children}
    </div>
  );
}

function BarChart({ data }: { data: Array<{ label: string; value: number; color: string }> }) {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {data.map((item, idx) => (
        <div key={idx}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '4px',
            fontSize: '14px',
          }}>
            <span>{item.label}</span>
            <span style={{ fontWeight: 'bold' }}>{item.value}</span>
          </div>
          <div style={{
            width: '100%',
            height: '24px',
            background: '#f0f0f0',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${(item.value / maxValue) * 100}%`,
              height: '100%',
              background: item.color,
              transition: 'width 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingRight: '8px',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
            }}>
              {item.value > 0 && item.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
