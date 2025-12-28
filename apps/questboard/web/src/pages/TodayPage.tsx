import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import QuestlineCard from '../components/QuestlineCard';

interface Quest {
  id: string;
  title: string;
  objective: string;
  state: 'locked' | 'unlocked' | 'in-progress' | 'completed';
  totalTasks?: number;
  completedTasks?: number;
  inProgressTasks?: number;
  progress?: number;
  unlockedAt?: string;
  completedAt?: string;
}

interface Questline {
  id: string;
  title: string;
  description?: string;
  epic?: string;
  owner?: string;
  assignmentReason?: string;
  quests: Quest[];
  totalTasks: number;
  completedTasks: number;
  progress: number;
}

interface RouteInfo {
  path: string;
  label: string;
  description: string;
  icon: string;
}

const ROUTES: RouteInfo[] = [
  {
    path: '/',
    label: 'Today',
    description: 'Your daily quest deck, blockers, and standup summary',
    icon: '📅',
  },
  {
    path: '/today',
    label: 'Today',
    description: 'Your daily quest deck, blockers, and standup summary',
    icon: '📅',
  },
  {
    path: '/goals',
    label: 'Goals',
    description: 'Create and manage organizational goals for decomposition',
    icon: '🎯',
  },
  {
    path: '/goals/:goalId',
    label: 'Goal Detail',
    description: 'View goal details, clarify, approve, and decompose',
    icon: '🎯',
  },
  {
    path: '/sprint',
    label: 'Sprint Planning',
    description: 'Weekly sprint plans and capacity allocation',
    icon: '📊',
  },
  {
    path: '/team',
    label: 'Team Management',
    description: 'View and manage team members, profiles, and settings',
    icon: '👥',
  },
  {
    path: '/team/intake',
    label: 'Team Intake',
    description: 'Quick assessment intake for Working Genius profiles',
    icon: '⚡',
  },
  {
    path: '/goals/:goalId/assignment-review',
    label: 'Assignment Review',
    description: 'Review task assignments and capacity after goal decomposition',
    icon: '📋',
  },
  {
    path: '/debug',
    label: 'Debug',
    description: 'System status, storage info, and debugging tools',
    icon: '🔍',
  },
];

export default function TodayPage() {
  const location = useLocation();
  const [pathname, setPathname] = useState(location.pathname);
  const [questlines, setQuestlines] = useState<Questline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRouteMap, setShowRouteMap] = useState(false);

  useEffect(() => {
    setPathname(location.pathname);
  }, [location]);

  useEffect(() => {
    fetchActiveQuests();
  }, []);

  const fetchActiveQuests = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all questlines with progress info
      const response = await fetch('/api/questlines?orgId=default-org');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const allQuestlines = await response.json();

      // Fetch quests and tasks for each questline
      const questlinesWithProgress = await Promise.all(
        allQuestlines.map(async (ql: any) => {
          const questsResponse = await fetch(`/api/questlines/${ql.id}/quests`);
          const quests = questsResponse.ok ? await questsResponse.json() : [];

          const questsWithTasks = await Promise.all(
            quests.map(async (quest: any) => {
              const tasksResponse = await fetch(`/api/quests/${quest.id}/tasks`);
              const tasks = tasksResponse.ok ? await tasksResponse.json() : [];

              const totalTasks = tasks.length;
              const completedTasks = tasks.filter((t: any) => t.status === 'done').length;
              const inProgressTasks = tasks.filter((t: any) => t.status === 'in-progress').length;

              return {
                ...quest,
                totalTasks,
                completedTasks,
                inProgressTasks,
                progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
              };
            })
          );

          const totalTasks = questsWithTasks.reduce((sum, q) => sum + (q.totalTasks || 0), 0);
          const completedTasks = questsWithTasks.reduce((sum, q) => sum + (q.completedTasks || 0), 0);

          return {
            ...ql,
            quests: questsWithTasks,
            totalTasks,
            completedTasks,
            progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          };
        })
      );

      setQuestlines(questlinesWithProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch quests');
    } finally {
      setLoading(false);
    }
  };

  // Filter out duplicate routes (like / and /today)
  const uniqueRoutes = ROUTES.filter((route, index, self) =>
    index === self.findIndex(r => r.label === route.label)
  );

  // Filter questlines with active or in-progress quests
  const activeQuestlines = questlines.filter(ql =>
    ql.quests.some(q => q.state === 'unlocked' || q.state === 'in-progress')
  );

  return (
    <div
      style={{
        background: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '32px', margin: 0 }}>📅 TODAY - Your Active Quests</h2>
        <button
          onClick={() => setShowRouteMap(!showRouteMap)}
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
          {showRouteMap ? '🎮 Show Quests' : '🗺️ Show Route Map'}
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>Loading your quest deck...</p>
        </div>
      )}

      {error && (
        <div style={{ padding: '20px', background: '#ffebee', borderRadius: '8px', color: '#d32f2f', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && !showRouteMap && (
        <>
          {/* Quest Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '30px'
          }}>
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              color: 'white',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{activeQuestlines.length}</div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Active Questlines</div>
            </div>
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '12px',
              color: 'white',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                {questlines.reduce((sum, ql) => sum + ql.quests.filter(q => q.state === 'unlocked' || q.state === 'in-progress').length, 0)}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Active Quests</div>
            </div>
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              borderRadius: '12px',
              color: 'white',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                {questlines.reduce((sum, ql) => sum + ql.completedTasks, 0)}/{questlines.reduce((sum, ql) => sum + ql.totalTasks, 0)}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Tasks Completed</div>
            </div>
          </div>

          {/* Active Questlines */}
          {activeQuestlines.length > 0 ? (
            <div>
              <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>⚔️ Active Quest Lines</h3>
              <div style={{ display: 'grid', gap: '20px' }}>
                {activeQuestlines.map((questline) => (
                  <QuestlineCard
                    key={questline.id}
                    {...questline}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              background: '#f9f9f9',
              borderRadius: '12px',
              color: '#666'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎮</div>
              <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>No Active Quests</h3>
              <p style={{ fontSize: '16px', marginBottom: '20px' }}>
                Start by creating and decomposing a goal to generate quest lines!
              </p>
              <Link
                to="/goals"
                style={{
                  display: 'inline-block',
                  padding: '12px 24px',
                  background: '#667eea',
                  color: 'white',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                }}
              >
                Go to Goals →
              </Link>
            </div>
          )}

          {/* Completed Questlines (if any) */}
          {questlines.filter(ql => ql.quests.every(q => q.state === 'completed')).length > 0 && (
            <div style={{ marginTop: '40px' }}>
              <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>🏆 Completed Quest Lines</h3>
              <div style={{ display: 'grid', gap: '20px' }}>
                {questlines
                  .filter(ql => ql.quests.every(q => q.state === 'completed'))
                  .map((questline) => (
                    <QuestlineCard
                      key={questline.id}
                      {...questline}
                    />
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Route Map Section (toggled) */}
      {showRouteMap && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>🗺️ Route Map</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
          }}>
            {uniqueRoutes.map((route) => {
              const displayPath = route.path.includes(':')
                ? route.path.replace(':goalId', '[goalId]')
                : route.path;

              return (
                <Link
                  key={route.path}
                  to={route.path.includes(':') ? '#' : route.path}
                  onClick={(e) => {
                    if (route.path.includes(':')) {
                      e.preventDefault();
                    }
                  }}
                  style={{
                    display: 'block',
                    padding: '16px',
                    background: '#f9f9f9',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0f8ff';
                    e.currentTarget.style.borderColor = '#0066cc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f9f9f9';
                    e.currentTarget.style.borderColor = '#ddd';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px', marginRight: '8px' }}>{route.icon}</span>
                    <strong style={{ fontSize: '16px' }}>{route.label}</strong>
                  </div>
                  <code style={{
                    display: 'block',
                    fontSize: '12px',
                    color: '#0066cc',
                    marginBottom: '8px',
                    padding: '4px 8px',
                    background: 'white',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                  }}>
                    {displayPath}
                  </code>
                  <p style={{
                    fontSize: '14px',
                    color: '#666',
                    margin: 0,
                  }}>
                    {route.description}
                  </p>
                  {route.path.includes(':') && (
                    <div style={{
                      marginTop: '8px',
                      padding: '4px 8px',
                      background: '#fff3cd',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#856404',
                    }}>
                      ⚠️ Dynamic route - requires parameter
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

