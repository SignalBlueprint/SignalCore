import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Nav() {
  const location = useLocation();
  const { user, org, logout } = useAuth();
  const [currentOrg, setCurrentOrg] = useState('default-org');
  const [availableOrgs, setAvailableOrgs] = useState<string[]>(['default-org']);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    // Use org from auth context if available
    if (org) {
      setCurrentOrg(org.id);
    } else {
      // Fallback to URL param
      const params = new URLSearchParams(window.location.search);
      const orgId = params.get('orgId') || 'default-org';
      setCurrentOrg(orgId);
    }

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
  }, [location, org]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
    display: 'inline-block',
  });

  const mobileLinkStyle = (isActive: boolean) => ({
    display: 'block',
    padding: '14px 16px',
    color: isActive ? '#fff' : '#0066cc',
    textDecoration: 'none',
    borderRadius: '4px',
    background: isActive ? '#0066cc' : 'transparent',
    fontWeight: isActive ? 'bold' : 'normal',
    marginBottom: '8px',
  });

  return (
    <nav className="nav-container">
      <div className="nav-header">
        <h1 style={{ margin: 0, fontSize: '24px' }}>🎯 Questboard</h1>

        <div className="nav-header-right">
          {availableOrgs.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="org-label" style={{ fontSize: '14px', color: '#666' }}>Org:</span>
              <select
                value={currentOrg}
                onChange={(e) => handleOrgChange(e.target.value)}
                className="org-select"
              >
                {availableOrgs.map(orgId => (
                  <option key={orgId} value={orgId}>
                    {orgId}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User menu */}
          {user && (
            <div style={{ position: 'relative', marginRight: '16px' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  padding: '8px 12px',
                  background: '#f5f5f5',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>👤</span>
                <span className="user-email">{user.email}</span>
              </button>

              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  minWidth: '200px',
                  zIndex: 1000
                }}>
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #eee',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#333', marginBottom: '4px' }}>
                      {org?.name || 'No Organization'}
                    </div>
                    <div>{user.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: '#d32f2f',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            className="mobile-menu-button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <div className={`hamburger ${mobileMenuOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
        </div>
      </div>

      {/* Desktop navigation */}
      <div className="nav-links-desktop">
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
        <Link to={`/jobs${currentOrg !== 'default-org' ? `?orgId=${currentOrg}` : ''}`} style={linkStyle(location.pathname === '/jobs')}>
          ⚙️ Jobs
        </Link>
        <Link to={`/team${currentOrg !== 'default-org' ? `?orgId=${currentOrg}` : ''}`} style={linkStyle(location.pathname === '/team')}>
          👥 Team
        </Link>
        <Link to={`/debug${currentOrg !== 'default-org' ? `?orgId=${currentOrg}` : ''}`} style={linkStyle(location.pathname === '/debug')}>
          🔍 Debug
        </Link>
      </div>

      {/* Mobile navigation */}
      <div className={`nav-links-mobile ${mobileMenuOpen ? 'open' : ''}`}>
        <Link to={`/today${currentOrg !== 'default-org' ? `?orgId=${currentOrg}` : ''}`} style={mobileLinkStyle(location.pathname === '/today' || location.pathname === '/')}>
          📅 Today
        </Link>
        <Link to={`/goals${currentOrg !== 'default-org' ? `?orgId=${currentOrg}` : ''}`} style={mobileLinkStyle(location.pathname.startsWith('/goals'))}>
          🎯 Goals
        </Link>
        <Link to={`/sprint${currentOrg !== 'default-org' ? `?orgId=${currentOrg}` : ''}`} style={mobileLinkStyle(location.pathname === '/sprint')}>
          📊 Sprint
        </Link>
        <Link to={`/analytics${currentOrg !== 'default-org' ? `?orgId=${currentOrg}` : ''}`} style={mobileLinkStyle(location.pathname === '/analytics')}>
          📈 Analytics
        </Link>
        <Link to={`/jobs${currentOrg !== 'default-org' ? `?orgId=${currentOrg}` : ''}`} style={mobileLinkStyle(location.pathname === '/jobs')}>
          ⚙️ Jobs
        </Link>
        <Link to={`/team${currentOrg !== 'default-org' ? `?orgId=${currentOrg}` : ''}`} style={mobileLinkStyle(location.pathname === '/team')}>
          👥 Team
        </Link>
        <Link to={`/debug${currentOrg !== 'default-org' ? `?orgId=${currentOrg}` : ''}`} style={mobileLinkStyle(location.pathname === '/debug')}>
          🔍 Debug
        </Link>
      </div>
    </nav>
  );
}

