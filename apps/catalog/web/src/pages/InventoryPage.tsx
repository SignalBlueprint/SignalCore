import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  category?: string;
  inventory?: {
    quantity: number;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
  };
  images: Array<{ url: string; type: string }>;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const orgId = 'default-org';
      const response = await fetch(`/api/products?orgId=${orgId}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const updateInventory = async (productId: string, quantity: number) => {
    try {
      const response = await fetch(`/api/products/${productId}/inventory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) throw new Error('Update failed');

      const data = await response.json();
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, inventory: data.product.inventory } : p))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const filteredProducts = products.filter((product) => {
    if (filterStatus === 'all') return true;
    return product.inventory?.status === filterStatus;
  });

  const stats = {
    total: products.length,
    inStock: products.filter((p) => p.inventory?.status === 'in_stock').length,
    lowStock: products.filter((p) => p.inventory?.status === 'low_stock').length,
    outOfStock: products.filter((p) => p.inventory?.status === 'out_of_stock').length,
    totalQuantity: products.reduce((sum, p) => sum + (p.inventory?.quantity || 0), 0),
  };

  if (loading) {
    return <div className="container loading">Loading inventory...</div>;
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
      <h1 style={{ marginBottom: '30px' }}>Inventory Management</h1>

      {/* Stats */}
      <div className="grid grid-4" style={{ marginBottom: '30px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#2d3748', marginBottom: '6px' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '14px', color: '#718096' }}>Total Products</div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#48bb78', marginBottom: '6px' }}>
            {stats.inStock}
          </div>
          <div style={{ fontSize: '14px', color: '#718096' }}>In Stock</div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#ed8936', marginBottom: '6px' }}>
            {stats.lowStock}
          </div>
          <div style={{ fontSize: '14px', color: '#718096' }}>Low Stock</div>
        </div>

        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#f56565', marginBottom: '6px' }}>
            {stats.outOfStock}
          </div>
          <div style={{ fontSize: '14px', color: '#718096' }}>Out of Stock</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilterStatus('all')}
            className={filterStatus === 'all' ? 'btn btn-primary' : 'btn btn-secondary'}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilterStatus('in_stock')}
            className={filterStatus === 'in_stock' ? 'btn btn-primary' : 'btn btn-secondary'}
          >
            In Stock ({stats.inStock})
          </button>
          <button
            onClick={() => setFilterStatus('low_stock')}
            className={filterStatus === 'low_stock' ? 'btn btn-primary' : 'btn btn-secondary'}
          >
            Low Stock ({stats.lowStock})
          </button>
          <button
            onClick={() => setFilterStatus('out_of_stock')}
            className={filterStatus === 'out_of_stock' ? 'btn btn-primary' : 'btn btn-secondary'}
          >
            Out of Stock ({stats.outOfStock})
          </button>
        </div>
      </div>

      {/* Inventory List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#718096' }}>
                  Product
                </th>
                <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#718096' }}>
                  Category
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#718096' }}>
                  Quantity
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#718096' }}>
                  Status
                </th>
                <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#718096' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const mainImage = product.images[0];
                const statusColor =
                  product.inventory?.status === 'in_stock'
                    ? '#48bb78'
                    : product.inventory?.status === 'low_stock'
                    ? '#ed8936'
                    : '#f56565';

                return (
                  <tr key={product.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px' }}>
                      <Link
                        to={`/products/${product.id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', color: 'inherit' }}
                      >
                        {mainImage && (
                          <img
                            src={mainImage.url}
                            alt={product.name}
                            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }}
                          />
                        )}
                        <span style={{ fontWeight: 600 }}>{product.name}</span>
                      </Link>
                    </td>
                    <td style={{ padding: '12px', color: '#718096' }}>{product.category || '—'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <input
                        type="number"
                        value={product.inventory?.quantity || 0}
                        onChange={(e) => {
                          const newQuantity = parseInt(e.target.value) || 0;
                          updateInventory(product.id, newQuantity);
                        }}
                        style={{
                          width: '80px',
                          padding: '6px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          textAlign: 'center',
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: statusColor,
                          background: `${statusColor}20`,
                          padding: '4px 10px',
                          borderRadius: '12px',
                        }}
                      >
                        {product.inventory?.status.replace('_', ' ').toUpperCase() || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <Link to={`/products/${product.id}`} className="btn btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }}>
                        View Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
            No products match the selected filter
          </div>
        )}
      </div>
    </div>
  );
}
