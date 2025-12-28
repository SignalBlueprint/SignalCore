import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';

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

  useEffect(() => {
    setPathname(location.pathname);
  }, [location]);

  // Filter out duplicate routes (like / and /today)
  const uniqueRoutes = ROUTES.filter((route, index, self) =>
    index === self.findIndex(r => r.label === route.label)
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
      <h2 style={{ fontSize: '32px', marginBottom: '20px' }}>📅 TODAY</h2>
      
      {/* Route Map Section */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>🗺️ Route Map</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
        }}>
          {uniqueRoutes.map((route) => {
            // For dynamic routes, show the pattern
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

      {/* Current Path Info */}
      <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px', marginTop: '20px' }}>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
          Current pathname:
        </p>
        <code style={{ fontSize: '16px', fontWeight: 'bold', color: '#0066cc' }}>
          {pathname}
        </code>
      </div>
      
      {/* Info Section */}
      <div style={{ marginTop: '30px', padding: '20px', background: '#e8f5e9', borderRadius: '8px' }}>
        <p style={{ color: '#2e7d32' }}>
          This is the Today page. Future implementation will show your daily quest deck, blockers, and standup summary.
        </p>
      </div>
    </div>
  );
}

