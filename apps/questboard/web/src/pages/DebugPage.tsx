import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface StatusResponse {
  ok: boolean;
  path: string;
  method: string;
  storageMode: string;
  orgCount: number;
  goalCount: number;
  lastJobRuns: Array<{
    jobId: string;
    status: string;
    finishedAt: string;
  }>;
}

export default function DebugPage() {
  const location = useLocation();
  const [pathname, setPathname] = useState(location.pathname);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPathname(location.pathname);
    
    // Fetch status from API
    const fetchStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/status');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        setStatus(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
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
      <h2 style={{ fontSize: '32px', marginBottom: '20px' }}>🔍 DEBUG</h2>
      
      <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px', marginTop: '20px', marginBottom: '20px' }}>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
          Current pathname:
        </p>
        <code style={{ fontSize: '16px', fontWeight: 'bold', color: '#0066cc' }}>
          {pathname}
        </code>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3 style={{ fontSize: '20px', marginBottom: '16px' }}>API Status Response</h3>
        
        {loading && (
          <div style={{ padding: '20px', background: '#e3f2fd', borderRadius: '8px' }}>
            <p style={{ color: '#1976d2' }}>Loading...</p>
          </div>
        )}
        
        {error && (
          <div style={{ padding: '20px', background: '#ffebee', borderRadius: '8px', marginBottom: '20px' }}>
            <p style={{ color: '#d32f2f', fontWeight: 'bold' }}>Error:</p>
            <p style={{ color: '#d32f2f' }}>{error}</p>
          </div>
        )}
        
        {status && (
          <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
            <pre
              style={{
                background: '#fff',
                padding: '16px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '14px',
                lineHeight: '1.5',
                border: '1px solid #ddd',
              }}
            >
              {JSON.stringify(status, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

