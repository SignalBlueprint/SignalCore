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
      <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px', marginTop: '20px' }}>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
          Current pathname:
        </p>
        <code style={{ fontSize: '16px', fontWeight: 'bold', color: '#0066cc' }}>
          {pathname}
        </code>
      </div>
      <div style={{ marginTop: '30px', padding: '20px', background: '#fff3cd', borderRadius: '8px' }}>
        <p style={{ color: '#856404' }}>
          This is the Sprint page. Future implementation will show sprint plans and team capacity.
        </p>
      </div>
    </div>
  );
}

