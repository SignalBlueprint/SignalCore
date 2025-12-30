// Storefront App
const API_BASE = '/api';
const ORG_ID = 'default-org';

// State
let allProducts = [];
let filteredProducts = [];
let cart = null;
let sessionId = getOrCreateSessionId();
let lastOrderNumber = null;
let useSemanticSearch = false;
let lastSearchQuery = '';
let searchDebounceTimer = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  loadCart();
  setupEventListeners();
});

// Get or create session ID
function getOrCreateSessionId() {
  let id = localStorage.getItem('sessionId');
  if (!id) {
    id = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('sessionId', id);
  }
  return id;
}

// Setup event listeners
function setupEventListeners() {
  const searchInput = document.getElementById('searchInput');

  // Use debouncing for search input
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      applyFilters();
    }, 300); // 300ms debounce
  });

  // Allow immediate search on Enter key
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(searchDebounceTimer);
      applyFilters();
    }
  });

  document.getElementById('filterCategory').addEventListener('change', applyFilters);
  document.getElementById('minPrice').addEventListener('input', applyFilters);
  document.getElementById('maxPrice').addEventListener('input', applyFilters);
  document.getElementById('sortBy').addEventListener('change', applyFilters);
}

// Load products
async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/store/${ORG_ID}/products`);
    if (!response.ok) throw new Error('Failed to load products');

    allProducts = await response.json();
    filteredProducts = [...allProducts];

    updateCategoryFilter();
    applyFilters();
  } catch (error) {
    console.error('Load products error:', error);
    showError('Failed to load products. Please try again later.');
  }
}

// Update category filter
function updateCategoryFilter() {
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
  const select = document.getElementById('filterCategory');

  select.innerHTML = '<option value="">All Categories</option>';

  categories.sort().forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  });
}

// Apply filters
async function applyFilters() {
  const searchTerm = document.getElementById('searchInput').value.trim();
  const category = document.getElementById('filterCategory').value;
  const minPrice = parseFloat(document.getElementById('minPrice').value) || undefined;
  const maxPrice = parseFloat(document.getElementById('maxPrice').value) || undefined;
  const sortBy = document.getElementById('sortBy').value;

  // If search term is provided and is different from last query, check if we should use semantic search
  if (searchTerm && searchTerm !== lastSearchQuery && searchTerm.split(' ').length >= 2) {
    // Automatically enable semantic search for multi-word queries
    useSemanticSearch = true;
    lastSearchQuery = searchTerm;
  } else if (!searchTerm) {
    useSemanticSearch = false;
    lastSearchQuery = '';
  }

  // Use semantic search if enabled and search term is provided
  if (useSemanticSearch && searchTerm) {
    await performSemanticSearch(searchTerm, category, minPrice, maxPrice);
  } else {
    // Use client-side text filtering
    performTextSearch(searchTerm.toLowerCase(), category, minPrice, maxPrice);
  }

  // Sort (only for text search; semantic search is already sorted by relevance)
  if (!useSemanticSearch || !searchTerm) {
    filteredProducts.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return (a.price || 0) - (b.price || 0);
        case 'price-desc':
          return (b.price || 0) - (a.price || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
  }

  renderProducts();
}

// Perform text-based search (client-side)
function performTextSearch(searchTerm, category, minPrice, maxPrice) {
  filteredProducts = allProducts.filter(product => {
    const matchesSearch = !searchTerm ||
      product.name.toLowerCase().includes(searchTerm) ||
      (product.description || '').toLowerCase().includes(searchTerm) ||
      (product.tags || []).some(tag => tag.toLowerCase().includes(searchTerm));

    const matchesCategory = !category || product.category === category;

    const price = product.price || 0;
    const matchesPrice =
      (minPrice === undefined || price >= minPrice) &&
      (maxPrice === undefined || price <= maxPrice);

    return matchesSearch && matchesCategory && matchesPrice;
  });
}

// Perform semantic search (server-side with embeddings)
async function performSemanticSearch(query, category, minPrice, maxPrice) {
  try {
    showSearchLoading();

    const response = await fetch(`${API_BASE}/products/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        orgId: ORG_ID,
        limit: 50,
        threshold: 0.4, // Lower threshold for more results
        category: category || undefined,
        minPrice,
        maxPrice,
        includeOutOfStock: false,
      }),
    });

    if (!response.ok) {
      throw new Error('Semantic search failed');
    }

    const data = await response.json();
    filteredProducts = data.results || [];

    // Show search mode indicator
    updateSearchModeIndicator(true, data.total);
  } catch (error) {
    console.error('Semantic search error:', error);
    // Fallback to text search
    useSemanticSearch = false;
    performTextSearch(query.toLowerCase(), category, minPrice, maxPrice);
    updateSearchModeIndicator(false, filteredProducts.length);
  }
}

// Show loading indicator for search
function showSearchLoading() {
  const container = document.getElementById('productsGrid');
  container.innerHTML = `
    <div class="loading">
      <div class="loading-spinner">🔍</div>
      <p>Searching with AI...</p>
    </div>
  `;
}

// Update search mode indicator
function updateSearchModeIndicator(isSemanticSearch, resultCount) {
  const header = document.querySelector('.products-header');
  let indicator = document.getElementById('searchModeIndicator');

  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'searchModeIndicator';
    indicator.style.cssText = `
      display: inline-block;
      margin-left: 10px;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    `;
    header.querySelector('h2').appendChild(indicator);
  }

  if (isSemanticSearch) {
    indicator.textContent = `✨ AI Search (${resultCount} matches)`;
    indicator.style.background = '#dbeafe';
    indicator.style.color = '#1e40af';
  } else if (lastSearchQuery) {
    indicator.textContent = '📝 Text Search';
    indicator.style.background = '#f3f4f6';
    indicator.style.color = '#4b5563';
  } else {
    indicator.textContent = '';
    indicator.style.background = 'transparent';
  }
}

// Clear filters
function clearFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('filterCategory').value = '';
  document.getElementById('minPrice').value = '';
  document.getElementById('maxPrice').value = '';
  document.getElementById('sortBy').value = 'newest';
  applyFilters();
}

// Render products
function renderProducts() {
  const container = document.getElementById('productsGrid');
  const countElement = document.getElementById('productCount');

  countElement.textContent = filteredProducts.length;

  if (filteredProducts.length === 0) {
    container.innerHTML = `
      <div class="loading">
        <p style="font-size: 48px;">🔍</p>
        <p>No products found</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredProducts.map(product => createProductCard(product)).join('');
}

// Create product card
function createProductCard(product) {
  const image = product.images && product.images.length > 0
    ? product.images[0].url
    : 'https://via.placeholder.com/280x280?text=No+Image';

  const price = product.price
    ? `$${product.price.toFixed(2)}`
    : 'Price not set';

  const stockLevel = product.inventory?.stockLevel || 0;
  const stockStatus = stockLevel === 0
    ? '<span class="product-stock out">Out of Stock</span>'
    : stockLevel < (product.inventory?.lowStockThreshold || 10)
    ? `<span class="product-stock low">Only ${stockLevel} left</span>`
    : `<span class="product-stock">In Stock</span>`;

  const isOutOfStock = stockLevel === 0 || product.status === 'out_of_stock';

  // Show relevance score if available (from semantic search)
  const relevanceScore = product._relevanceScore
    ? `<div class="relevance-badge" title="AI Relevance Score">${product._relevanceScore}% match</div>`
    : '';

  return `
    <div class="product-card" onclick="showProductDetail('${product.id}')">
      ${relevanceScore}
      <img src="${image}" alt="${product.name}" class="product-image" />
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <p class="product-description">${product.description || 'No description available'}</p>
        <div class="product-footer">
          <span class="product-price">${price}</span>
          ${stockStatus}
        </div>
        <div class="product-card-actions">
          <button
            class="add-to-cart-btn"
            onclick="addToCart(event, '${product.id}')"
            ${isOutOfStock ? 'disabled' : ''}
          >
            ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  `;
}

// Show product detail
async function showProductDetail(productId) {
  const product = allProducts.find(p => p.id === productId) ||
                  filteredProducts.find(p => p.id === productId);
  if (!product) return;

  const modal = document.getElementById('productModal');
  const detailContainer = document.getElementById('productDetail');

  const images = product.images && product.images.length > 0
    ? product.images
    : [{ url: 'https://via.placeholder.com/400x400?text=No+Image', id: 'placeholder' }];

  const mainImage = images[0].url;

  const stockLevel = product.inventory?.stockLevel || 0;
  const isOutOfStock = stockLevel === 0 || product.status === 'out_of_stock';

  const stockHTML = isOutOfStock
    ? '<div class="product-detail-stock out">Out of Stock</div>'
    : stockLevel < (product.inventory?.lowStockThreshold || 10)
    ? `<div class="product-detail-stock low">Only ${stockLevel} left in stock</div>`
    : `<div class="product-detail-stock">In Stock (${stockLevel} available)</div>`;

  const tagsHTML = product.tags && product.tags.length > 0
    ? `
      <div class="product-detail-tags">
        <h4>Tags</h4>
        <div class="tags">
          ${product.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      </div>
    `
    : '';

  detailContainer.innerHTML = `
    <div class="product-detail">
      <div class="product-detail-images">
        <img src="${mainImage}" alt="${product.name}" class="product-detail-main-image" id="mainImage" />
        ${images.length > 1 ? `
          <div class="product-detail-thumbnails">
            ${images.map((img, idx) => `
              <img
                src="${img.url}"
                alt="Image ${idx + 1}"
                class="thumbnail ${idx === 0 ? 'active' : ''}"
                onclick="changeMainImage('${img.url}', event)"
              />
            `).join('')}
          </div>
        ` : ''}
      </div>
      <div class="product-detail-info">
        ${product.category ? `<div class="product-detail-category">${product.category}</div>` : ''}
        <h2>${product.name}</h2>
        <div class="product-detail-price">$${(product.price || 0).toFixed(2)}</div>
        ${stockHTML}
        <p class="product-detail-description">${product.description || 'No description available'}</p>
        ${tagsHTML}
        <div class="product-detail-actions">
          <button
            class="add-to-cart-btn"
            onclick="addToCartFromDetail('${product.id}')"
            ${isOutOfStock ? 'disabled' : ''}
          >
            ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
    <div id="similarProducts" class="similar-products-section">
      <h3>✨ Similar Products</h3>
      <div class="similar-products-grid">
        <div class="loading">
          <div class="loading-spinner">🔍</div>
          <p>Finding similar products...</p>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');

  // Load similar products
  loadSimilarProducts(productId);
}

// Load similar products
async function loadSimilarProducts(productId) {
  try {
    const response = await fetch(`${API_BASE}/products/${productId}/similar?limit=4&threshold=0.6`);

    if (!response.ok) {
      throw new Error('Failed to load similar products');
    }

    const data = await response.json();
    const container = document.querySelector('#similarProducts .similar-products-grid');

    if (!data.results || data.results.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 20px;">No similar products found</p>';
      return;
    }

    container.innerHTML = data.results.map(product => `
      <div class="similar-product-card" onclick="showProductDetail('${product.id}')">
        <img src="${product.images?.[0]?.url || 'https://via.placeholder.com/150x150'}"
             alt="${product.name}"
             class="similar-product-image" />
        <div class="similar-product-info">
          <div class="similar-product-name">${product.name}</div>
          <div class="similar-product-price">$${(product.price || 0).toFixed(2)}</div>
          <div class="similarity-score" title="Similarity Score">${product._relevanceScore}% match</div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Load similar products error:', error);
    const container = document.querySelector('#similarProducts .similar-products-grid');
    container.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 20px;">Failed to load similar products</p>';
  }
}

// Change main image
function changeMainImage(url, event) {
  event.stopPropagation();
  document.getElementById('mainImage').src = url;

  // Update active thumbnail
  document.querySelectorAll('.thumbnail').forEach(thumb => {
    thumb.classList.remove('active');
  });
  event.target.classList.add('active');
}

// Close product modal
function closeProductModal() {
  document.getElementById('productModal').classList.remove('active');
}

// Add to cart from detail
async function addToCartFromDetail(productId) {
  await addToCart(null, productId);
  closeProductModal();
}

// Load cart
async function loadCart() {
  try {
    const response = await fetch(`${API_BASE}/cart/${sessionId}`);
    if (response.ok) {
      cart = await response.json();
    } else {
      cart = { items: [] };
    }
    updateCartUI();
  } catch (error) {
    console.error('Load cart error:', error);
    cart = { items: [] };
    updateCartUI();
  }
}

// Add to cart
async function addToCart(event, productId) {
  if (event) {
    event.stopPropagation();
  }

  try {
    const response = await fetch(`${API_BASE}/cart/${sessionId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        quantity: 1
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add to cart');
    }

    cart = await response.json();
    updateCartUI();
    showNotification('Product added to cart! 🛒');
  } catch (error) {
    console.error('Add to cart error:', error);
    showError(error.message);
  }
}

// Update cart quantity
async function updateCartQuantity(productId, newQuantity) {
  if (newQuantity <= 0) {
    await removeFromCart(productId);
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/cart/${sessionId}/items/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQuantity })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update cart');
    }

    cart = await response.json();
    updateCartUI();
  } catch (error) {
    console.error('Update cart error:', error);
    showError(error.message);
  }
}

// Remove from cart
async function removeFromCart(productId) {
  try {
    const response = await fetch(`${API_BASE}/cart/${sessionId}/items/${productId}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to remove from cart');

    cart = await response.json();
    updateCartUI();
    showNotification('Product removed from cart');
  } catch (error) {
    console.error('Remove from cart error:', error);
    showError(error.message);
  }
}

// Update cart UI
function updateCartUI() {
  const cartItems = cart?.items || [];
  const cartItemsContainer = document.getElementById('cartItems');
  const cartBadge = document.getElementById('cartBadge');
  const cartTotal = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');

  // Update badge
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  cartBadge.textContent = totalItems;

  // Update total
  const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  cartTotal.textContent = `$${total.toFixed(2)}`;

  // Enable/disable checkout button
  checkoutBtn.disabled = cartItems.length === 0;

  // Render cart items
  if (cartItems.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-cart">
        <p>🛒</p>
        <p>Your cart is empty</p>
      </div>
    `;
    return;
  }

  cartItemsContainer.innerHTML = cartItems.map(item => `
    <div class="cart-item">
      <img src="${item.imageUrl || 'https://via.placeholder.com/80x80'}" alt="${item.productName}" class="cart-item-image" />
      <div class="cart-item-info">
        <div class="cart-item-name">${item.productName}</div>
        <div class="cart-item-price">$${item.price.toFixed(2)}</div>
        <div class="cart-item-controls">
          <button class="quantity-btn" onclick="updateCartQuantity('${item.productId}', ${item.quantity - 1})">−</button>
          <span class="quantity">${item.quantity}</span>
          <button class="quantity-btn" onclick="updateCartQuantity('${item.productId}', ${item.quantity + 1})">+</button>
          <button class="remove-btn" onclick="removeFromCart('${item.productId}')" title="Remove">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Toggle cart
function toggleCart() {
  const sidebar = document.getElementById('cartSidebar');
  const overlay = document.getElementById('cartOverlay');

  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

// Proceed to checkout
function proceedToCheckout() {
  if (!cart || cart.items.length === 0) return;

  toggleCart(); // Close cart

  const modal = document.getElementById('checkoutModal');
  const summaryContainer = document.getElementById('checkoutSummary');

  // Populate checkout summary
  const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = 10.00; // Fixed shipping for now
  const total = subtotal + shipping;

  summaryContainer.innerHTML = `
    ${cart.items.map(item => `
      <div class="summary-item">
        <span>${item.productName} × ${item.quantity}</span>
        <span>$${(item.price * item.quantity).toFixed(2)}</span>
      </div>
    `).join('')}
    <div class="summary-item">
      <span>Subtotal</span>
      <span>$${subtotal.toFixed(2)}</span>
    </div>
    <div class="summary-item">
      <span>Shipping</span>
      <span>$${shipping.toFixed(2)}</span>
    </div>
    <div class="summary-item">
      <span>Total</span>
      <span>$${total.toFixed(2)}</span>
    </div>
  `;

  modal.classList.add('active');
}

// Close checkout modal
function closeCheckoutModal() {
  document.getElementById('checkoutModal').classList.remove('active');
  document.getElementById('checkoutForm').reset();
}

// Submit order
async function submitOrder(event) {
  event.preventDefault();

  const form = event.target;
  const submitBtn = document.getElementById('placeOrderBtn');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Placing Order...';

  try {
    const orderData = {
      sessionId: sessionId,
      orgId: ORG_ID,
      customer: {
        name: form.customerName.value,
        email: form.customerEmail.value,
        phone: form.customerPhone.value || undefined
      },
      shippingAddress: {
        street: form.shippingAddress.value,
        city: form.shippingCity.value,
        state: form.shippingState.value,
        postalCode: form.shippingZip.value,
        country: form.shippingCountry.value
      },
      paymentMethod: 'pending' // Will be replaced with actual payment integration
    };

    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create order');
    }

    const order = await response.json();
    lastOrderNumber = order.orderNumber;

    // Clear cart
    cart = { items: [] };
    updateCartUI();

    // Close checkout modal
    closeCheckoutModal();

    // Show confirmation
    showOrderConfirmation(order);

  } catch (error) {
    console.error('Submit order error:', error);
    showError(error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Place Order';
  }
}

// Show order confirmation
function showOrderConfirmation(order) {
  const modal = document.getElementById('confirmationModal');
  const content = document.getElementById('confirmationContent');

  content.innerHTML = `
    <div class="confirmation-icon">✅</div>
    <h2>Order Placed Successfully!</h2>
    <p>Thank you for your order, ${order.customer.name}!</p>
    <div class="order-number">${order.orderNumber}</div>
    <p>A confirmation email has been sent to ${order.customer.email}</p>
    <p style="margin-top: 20px; color: #6b7280;">You can track your order using the order number above.</p>
  `;

  modal.classList.add('active');
}

// Close confirmation modal
function closeConfirmationModal() {
  document.getElementById('confirmationModal').classList.remove('active');
}

// Track order (from confirmation)
function trackOrder() {
  closeConfirmationModal();
  showOrderTracking();

  if (lastOrderNumber) {
    document.getElementById('trackingNumber').value = lastOrderNumber;
    searchByOrderNumber();
  }
}

// Show order tracking
function showOrderTracking() {
  const modal = document.getElementById('trackingModal');
  document.getElementById('trackingResults').innerHTML = '';
  modal.classList.add('active');
}

// Close tracking modal
function closeTrackingModal() {
  document.getElementById('trackingModal').classList.remove('active');
}

// Search orders by email
async function searchOrders() {
  const email = document.getElementById('trackingEmail').value.trim();

  if (!email) {
    showError('Please enter your email address');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/orders/customer/${encodeURIComponent(email)}`);

    if (!response.ok) {
      if (response.status === 404) {
        document.getElementById('trackingResults').innerHTML = `
          <div class="loading">
            <p style="font-size: 48px;">📭</p>
            <p>No orders found for this email address</p>
          </div>
        `;
        return;
      }
      throw new Error('Failed to search orders');
    }

    const orders = await response.json();
    displayOrderResults(orders);

  } catch (error) {
    console.error('Search orders error:', error);
    showError(error.message);
  }
}

// Search by order number
async function searchByOrderNumber() {
  const orderNumber = document.getElementById('trackingNumber').value.trim();

  if (!orderNumber) {
    showError('Please enter an order number');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/orders/number/${encodeURIComponent(orderNumber)}`);

    if (!response.ok) {
      if (response.status === 404) {
        document.getElementById('trackingResults').innerHTML = `
          <div class="loading">
            <p style="font-size: 48px;">🔍</p>
            <p>Order not found</p>
          </div>
        `;
        return;
      }
      throw new Error('Failed to find order');
    }

    const order = await response.json();
    displayOrderResults([order]);

  } catch (error) {
    console.error('Search order error:', error);
    showError(error.message);
  }
}

// Display order results
function displayOrderResults(orders) {
  const container = document.getElementById('trackingResults');

  if (!orders || orders.length === 0) {
    container.innerHTML = `
      <div class="loading">
        <p style="font-size: 48px;">📭</p>
        <p>No orders found</p>
      </div>
    `;
    return;
  }

  container.innerHTML = orders.map(order => {
    const date = new Date(order.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `
      <div class="order-item">
        <div class="order-header">
          <div class="order-number-small">${order.orderNumber}</div>
          <span class="order-status ${order.status}">${order.status}</span>
        </div>
        <div class="order-date">Placed on ${date}</div>
        <div class="order-total">Total: $${order.pricing.total.toFixed(2)}</div>
        ${order.trackingNumber ? `<p style="margin-top: 10px; font-size: 14px;">Tracking: <strong>${order.trackingNumber}</strong></p>` : ''}
        <p style="margin-top: 8px; font-size: 14px; color: #6b7280;">
          ${order.items.length} item${order.items.length !== 1 ? 's' : ''}
        </p>
      </div>
    `;
  }).join('');
}

// Show notification
function showNotification(message) {
  // Simple notification (could be enhanced with a toast library)
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #10b981;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    animation: slideIn 0.3s;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Show error
function showError(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #ef4444;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    animation: slideIn 0.3s;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
