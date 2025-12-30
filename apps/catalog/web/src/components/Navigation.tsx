import { Link, useLocation } from 'react-router-dom';

export default function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const linkStyle = (path: string): React.CSSProperties => ({
    padding: '10px 16px',
    fontWeight: 600,
    borderRadius: '6px',
    background: isActive(path) ? '#667eea' : 'transparent',
    color: isActive(path) ? 'white' : '#4a5568',
    textDecoration: 'none',
    transition: 'all 0.2s',
  });

  return (
    <nav
      style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          height: '64px',
        }}
      >
        <Link to="/" style={{ marginRight: '20px', textDecoration: 'none' }}>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            📦 Catalog
          </h1>
        </Link>
        <Link to="/products" style={linkStyle('/products')}>
          Products
        </Link>
        <Link to="/upload" style={linkStyle('/upload')}>
          Upload
        </Link>
        <Link to="/inventory" style={linkStyle('/inventory')}>
          Inventory
        </Link>
        <Link to="/lookbooks" style={linkStyle('/lookbooks')}>
          Lookbooks
        </Link>
      </div>
    </nav>
  );
}
