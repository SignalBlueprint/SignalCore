import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

interface Product {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  tags?: string[];
  images: Array<{ url: string; type: 'original' | 'clean' }>;
  inventory?: {
    quantity: number;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
  };
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    tags: '',
  });

  useEffect(() => {
    if (id) fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) throw new Error('Product not found');
      const data = await response.json();
      setProduct(data.product);
      setEditForm({
        name: data.product.name || '',
        description: data.product.description || '',
        price: data.product.price?.toString() || '',
        category: data.product.category || '',
        tags: data.product.tags?.join(', ') || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!product) return;

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          price: editForm.price ? parseFloat(editForm.price) : undefined,
          category: editForm.category,
          tags: editForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });

      if (!response.ok) throw new Error('Update failed');

      const data = await response.json();
      setProduct(data.product);
      setEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleDelete = async () => {
    if (!product || !confirm('Are you sure you want to delete this product?')) return;

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Delete failed');

      navigate('/products');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  if (loading) {
    return <div className="container loading">Loading product...</div>;
  }

  if (error || !product) {
    return (
      <div className="container">
        <div className="error">{error || 'Product not found'}</div>
        <Link to="/products" className="btn btn-secondary">
          ← Back to Products
        </Link>
      </div>
    );
  }

  const originalImage = product.images.find((img) => img.type === 'original');
  const cleanImage = product.images.find((img) => img.type === 'clean');

  return (
    <div className="container">
      <div style={{ marginBottom: '20px' }}>
        <Link to="/products" style={{ color: '#667eea', fontSize: '14px' }}>
          ← Back to Products
        </Link>
      </div>

      <div className="grid grid-2">
        {/* Images */}
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '20px' }}>
            <img
              src={(cleanImage || originalImage)?.url}
              alt={product.name}
              style={{ width: '100%', display: 'block' }}
            />
          </div>

          {cleanImage && originalImage && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#718096', marginBottom: '6px', fontWeight: 600 }}>
                  Original Photo
                </p>
                <img
                  src={originalImage.url}
                  alt="Original"
                  style={{ width: '100%', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#718096', marginBottom: '6px', fontWeight: 600 }}>
                  AI-Generated Clean Shot
                </p>
                <img
                  src={cleanImage.url}
                  alt="Clean"
                  style={{ width: '100%', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="card">
            {editing ? (
              <div>
                <h2 style={{ marginBottom: '20px' }}>Edit Product</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '14px' }}>
                      Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '14px' }}>
                      Description
                    </label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '14px',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '14px' }}>
                        Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '14px' }}>
                        Category
                      </label>
                      <input
                        type="text"
                        value={editForm.category}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '14px' }}>
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={editForm.tags}
                      onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                      placeholder="e.g. red, cotton, summer"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button onClick={handleUpdate} className="btn btn-primary" style={{ flex: 1 }}>
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>{product.name}</h1>

                {product.price !== undefined && (
                  <p style={{ fontSize: '32px', fontWeight: 700, color: '#2d3748', marginBottom: '20px' }}>
                    ${product.price.toFixed(2)}
                  </p>
                )}

                {product.description && (
                  <p style={{ fontSize: '16px', color: '#4a5568', lineHeight: '1.6', marginBottom: '20px' }}>
                    {product.description}
                  </p>
                )}

                {product.category && (
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '12px', color: '#718096', fontWeight: 600 }}>Category</span>
                    <p style={{ fontSize: '14px', marginTop: '4px' }}>{product.category}</p>
                  </div>
                )}

                {product.tags && product.tags.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ fontSize: '12px', color: '#718096', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                      Tags
                    </span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {product.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: '13px',
                            background: '#edf2f7',
                            color: '#4a5568',
                            padding: '6px 12px',
                            borderRadius: '16px',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {product.inventory && (
                  <div
                    style={{
                      padding: '16px',
                      background: '#f7fafc',
                      borderRadius: '8px',
                      marginBottom: '20px',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#718096', fontWeight: 600, marginBottom: '6px' }}>
                      Inventory
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '18px', fontWeight: 600 }}>
                        {product.inventory.quantity} units
                      </span>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color:
                            product.inventory.status === 'in_stock'
                              ? '#48bb78'
                              : product.inventory.status === 'low_stock'
                              ? '#ed8936'
                              : '#f56565',
                        }}
                      >
                        {product.inventory.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
                  <button onClick={() => setEditing(true)} className="btn btn-primary" style={{ flex: 1 }}>
                    Edit Product
                  </button>
                  <button onClick={handleDelete} className="btn btn-danger">
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: '20px', fontSize: '12px', color: '#718096' }}>
            <p>
              <strong>Created:</strong> {new Date(product.createdAt).toLocaleDateString()}
            </p>
            <p style={{ marginTop: '6px' }}>
              <strong>Updated:</strong> {new Date(product.updatedAt).toLocaleDateString()}
            </p>
            <p style={{ marginTop: '6px' }}>
              <strong>ID:</strong> {product.id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
