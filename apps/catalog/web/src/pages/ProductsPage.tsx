import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Product {
  id: string;
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
  createdAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

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
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...new Set(products.map((p) => p.category).filter(Boolean))];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      searchQuery === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="container loading">Loading products...</div>;
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
      <div style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>Products</h1>
          <Link to="/upload" className="btn btn-primary">
            + Upload Product
          </Link>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: '250px',
              padding: '10px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              padding: '10px 16px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'white',
            }}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        <p style={{ color: '#718096', fontSize: '14px' }}>
          Showing {filteredProducts.length} of {products.length} products
        </p>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: '18px', color: '#718096', marginBottom: '20px' }}>
            {searchQuery || filterCategory !== 'all' ? 'No products match your filters' : 'No products yet'}
          </p>
          <Link to="/upload" className="btn btn-primary">
            Upload Your First Product
          </Link>
        </div>
      ) : (
        <div className="grid grid-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const mainImage = product.images.find((img) => img.type === 'clean') || product.images[0];
  const stockColor =
    product.inventory?.status === 'in_stock'
      ? '#48bb78'
      : product.inventory?.status === 'low_stock'
      ? '#ed8936'
      : '#f56565';

  return (
    <Link
      to={`/products/${product.id}`}
      style={{
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden',
          transition: 'transform 0.2s, box-shadow 0.2s',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        }}
      >
        {mainImage && (
          <div
            style={{
              width: '100%',
              paddingTop: '100%',
              position: 'relative',
              background: '#f7fafc',
            }}
          >
            <img
              src={mainImage.url}
              alt={product.name}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>
        )}
        <div style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{product.name}</h3>
          {product.description && (
            <p
              style={{
                fontSize: '14px',
                color: '#718096',
                marginBottom: '12px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {product.description}
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {product.price !== undefined && (
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#2d3748' }}>
                ${product.price.toFixed(2)}
              </p>
            )}
            {product.inventory && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: stockColor,
                  background: `${stockColor}20`,
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                {product.inventory.quantity} in stock
              </span>
            )}
          </div>
          {product.tags && product.tags.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {product.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: '11px',
                    background: '#edf2f7',
                    color: '#4a5568',
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
