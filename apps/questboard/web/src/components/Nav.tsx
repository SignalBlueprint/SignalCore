import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Nav() {
  const location = useLocation();
  const [currentOrg, setCurrentOrg] = useState('default-org');
  const [availableOrgs, setAvailableOrgs] = useState<string[]>(['default-org']);

  useEffect(() => {
    // Get orgId from URL
    const params = new URLSearchParams(window.location.search);
    const orgId = params.get('orgId') || 'default-org';
    setCurrentOrg(orgId);

    // Fetch available orgs
    fetch('/api/orgs')
      .then(res => res.json())
      .then(orgs => {
        const orgIds = orgs.map((org: any) => org.id);
        setAvailableOrgs(orgIds.length > 0 ? orgIds : ['default-org']);
      })
      .catch(() => {
        // Fallback to default
        setAvailableOrgs(['default-org']);
      });
  }, [location]);

  const handleOrgChange = (newOrgId: string) => {
    const currentPath = location.pathname;
    window.location.href = `${currentPath}?orgId=${newOrgId}`;
  };

  const linkStyle = (isActive: boolean) => ({
    marginRight: '20px',
    padding: '10px 16px',
    color: isActive ? '#fff' : '#0066cc',
    textDecoration: 'none',
    borderRadius: '4px',
    background: isActive ? '#0066cc' : 'transparent',
    fontWeight: isActive ? 'bold' : 'normal',
  });

  return (
    <nav
      style={{
        marginBottom: '30px',
        padding: '16px',
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>🎯 Questboard</h1>
        {availableOrgs.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: '#666' }}>Org:</span>
            <select
              value={currentOrg}
              onChange={(e) => handleOrgChange(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                background: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: 'bold',
                color: '#0066cc',
              }}
            >
              {availableOrgs.map(orgId => (
                <option key={orgId} value={orgId}>
                  {orgId}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div>
        <Link to={`/today${currentOrg !== 'default-org' ? `?orgId=${currentOrg}` : ''}`} style={linkStyle(location.pathname === '/today' || location.pathname === '/')}>
          📅 Today
        </Link>
        <Link to={`/goals${currentOrg !== 'default-org' ? `?orgId=${currentOrg}` : ''}`} style={linkStyle(location.pathname.startsWith('/goals'))}>
          🎯 Goals
        </Link>
        <Link to={`/sprint${currentOrg !== 'default-org' ? `?orgId=${currentOrg}` : ''}`} style={linkStyle(location.pathname === '/sprint')}>
          📊 Sprint
        </Link>
        <Link to={`/analytics${currentOrg !== 'default-org' ? `?orgId=${currentOrg}` : ''}`} style={linkStyle(location.pathname === '/analytics')}>
          📈 Analytics
        </Link>
        <Link to={`/team${currentOrg !== 'default-org' ? `?orgId=${currentOrg}` : ''}`} style={linkStyle(location.pathname === '/team')}>
          👥 Team
        </Link>
        <Link to={`/debug${currentOrg !== 'default-org' ? `?orgId=${currentOrg}` : ''}`} style={linkStyle(location.pathname === '/debug')}>
          🔍 Debug
        </Link>
      </div>
    </nav>
  );
}

