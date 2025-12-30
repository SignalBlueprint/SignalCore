import { useState, useEffect } from 'react';

interface Lookbook {
  id: string;
  name: string;
  description?: string;
  productIds: string[];
  createdAt: string;
}

export default function LookbooksPage() {
  const [lookbooks, setLookbooks] = useState<Lookbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLookbooks();
  }, []);

  const fetchLookbooks = async () => {
    try {
      setLoading(true);
      const orgId = 'default-org';
      const response = await fetch(`/api/lookbooks?orgId=${orgId}`);
      if (!response.ok) throw new Error('Failed to fetch lookbooks');
      const data = await response.json();
      setLookbooks(data.lookbooks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load lookbooks');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container loading">Loading lookbooks...</div>;
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Lookbooks</h1>
        <button className="btn btn-primary">+ Create Lookbook</button>
      </div>

      {lookbooks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📚</div>
          <h2 style={{ fontSize: '20px', marginBottom: '12px', color: '#2d3748' }}>No Lookbooks Yet</h2>
          <p style={{ color: '#718096', marginBottom: '24px' }}>
            Create collections of products to organize your catalog
          </p>
          <button className="btn btn-primary">Create Your First Lookbook</button>
        </div>
      ) : (
        <div className="grid grid-3">
          {lookbooks.map((lookbook) => (
            <div key={lookbook.id} className="card">
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{lookbook.name}</h3>
              {lookbook.description && (
                <p style={{ fontSize: '14px', color: '#718096', marginBottom: '12px' }}>
                  {lookbook.description}
                </p>
              )}
              <div style={{ fontSize: '13px', color: '#718096' }}>
                {lookbook.productIds.length} products
              </div>
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                <button className="btn btn-secondary" style={{ width: '100%' }}>
                  View Lookbook
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className="card"
        style={{
          marginTop: '30px',
          background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
          border: '1px solid #667eea30',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
          💡 About Lookbooks
        </h3>
        <p style={{ color: '#4a5568', fontSize: '14px', lineHeight: '1.6' }}>
          Lookbooks are curated collections of products. Use them to organize products by season,
          collection, or any other grouping that makes sense for your business.
        </p>
      </div>
    </div>
  );
}
