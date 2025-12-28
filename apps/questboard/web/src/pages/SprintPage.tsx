import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function SprintPage() {
  const location = useLocation();
  const [pathname, setPathname] = useState(location.pathname);

  useEffect(() => {
    setPathname(location.pathname);
  }, [location]);

  return (
    <div
      style={{
        background: 'white',
        padding: '40px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <h2 style={{ fontSize: '32px', marginBottom: '20px' }}>📊 SPRINT</h2>
      <div style={{ marginTop: '30px', padding: '40px', background: '#f9f9f9', borderRadius: '12px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <h3 style={{ fontSize: '20px', marginBottom: '12px', color: '#333' }}>Sprint Planning</h3>
        <p style={{ color: '#666', marginBottom: '8px' }}>
          Weekly sprint plans and capacity allocation coming soon.
        </p>
        <div style={{ marginTop: '20px', padding: '12px', background: '#fff3cd', borderRadius: '8px', display: 'inline-block' }}>
          <code style={{ fontSize: '14px', color: '#856404' }}>
            Current route: {pathname}
          </code>
        </div>
      </div>
    </div>
  );
}

