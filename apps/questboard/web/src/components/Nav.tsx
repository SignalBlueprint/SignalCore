import { Link, useLocation } from 'react-router-dom';

export default function Nav() {
  const location = useLocation();

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
      <h1 style={{ marginBottom: '16px', fontSize: '24px' }}>🎯 Questboard</h1>
      <div>
        <Link to="/today" style={linkStyle(location.pathname === '/today' || location.pathname === '/')}>
          📅 Today
        </Link>
        <Link to="/goals" style={linkStyle(location.pathname.startsWith('/goals'))}>
          🎯 Goals
        </Link>
        <Link to="/sprint" style={linkStyle(location.pathname === '/sprint')}>
          📊 Sprint
        </Link>
        <Link to="/team" style={linkStyle(location.pathname === '/team')}>
          👥 Team
        </Link>
        <Link to="/debug" style={linkStyle(location.pathname === '/debug')}>
          🔍 Debug
        </Link>
      </div>
    </nav>
  );
}

