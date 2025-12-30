// Catalog Admin App
const API_BASE = '/api';
const ORG_ID = 'default-org';

// State
let allProducts = [];
let currentProduct = null;
let selectedImages = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  setupEventListeners();
  setupDragAndDrop();
});

// Setup event listeners
function setupEventListeners() {
  document.getElementById('searchInput').addEventListener('input', filterProducts);
  document.getElementById('filterStatus').addEventListener('change', filterProducts);
  document.getElementById('filterCategory').addEventListener('change', filterProducts);
}

// Setup drag and drop
function setupDragAndDrop() {
  const uploadArea = document.getElementById('uploadArea');

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      handleImageFiles(files);
    }
  });
}

// Load products
async function loadProducts() {
  try {
    const container = document.getElementById('productsContainer');
    container.innerHTML = `
      <div class="loading">
        <div class="loading-spinner">⏳</div>
        <div style="margin-top: 15px;">Loading products...</div>
      </div>
    `;

    const response = await fetch(`${API_BASE}/products?orgId=${ORG_ID}`);
    if (!response.ok) throw new Error('Failed to load products');

    allProducts = await response.json();
    updateStats();
    updateCategoryFilter();
    renderProducts(allProducts);
  } catch (error) {
    console.error('Load products error:', error);
    showError('Failed to load products: ' + error.message);
  }
}

// Update statistics
function updateStats() {
  const stats = {
    total: allProducts.length,
    active: allProducts.filter(p => p.status === 'active').length,
    draft: allProducts.filter(p => p.status === 'draft').length,
    outOfStock: allProducts.filter(p => p.status === 'out_of_stock').length,
  };

  document.getElementById('totalProducts').textContent = stats.total;
  document.getElementById('activeProducts').textContent = stats.active;
  document.getElementById('draftProducts').textContent = stats.draft;
  document.getElementById('outOfStockProducts').textContent = stats.outOfStock;
}

// Update category filter
function updateCategoryFilter() {
  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
  const select = document.getElementById('filterCategory');

  // Keep "All Categories" option
  select.innerHTML = '<option value="">All Categories</option>';

  categories.sort().forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  });
}

// Filter products
function filterProducts() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const statusFilter = document.getElementById('filterStatus').value;
  const categoryFilter = document.getElementById('filterCategory').value;

  const filtered = allProducts.filter(product => {
    // Search filter
    const matchesSearch = !searchTerm ||
      product.name.toLowerCase().includes(searchTerm) ||
      (product.description && product.description.toLowerCase().includes(searchTerm)) ||
      (product.category && product.category.toLowerCase().includes(searchTerm)) ||
      (product.tags && product.tags.some(tag => tag.toLowerCase().includes(searchTerm)));

    // Status filter
    const matchesStatus = !statusFilter || product.status === statusFilter;

    // Category filter
    const matchesCategory = !categoryFilter || product.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  renderProducts(filtered);
}

// Render products
function renderProducts(products) {
  const container = document.getElementById('productsContainer');

  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <div class="empty-state-text">No products found</div>
        <div class="empty-state-hint">Try adjusting your filters or add a new product</div>
      </div>
    `;
    return;
  }

  container.innerHTML = '<div class="products-grid"></div>';
  const grid = container.querySelector('.products-grid');

  products.forEach(product => {
    const card = createProductCard(product);
    grid.appendChild(card);
  });
}

// Create product card
function createProductCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.onclick = () => openEditProductModal(product);

  // Get primary image
  const primaryImage = product.images && product.images.length > 0
    ? product.images[0]
    : null;

  // Format price
  const priceText = product.price
    ? `${getCurrencySymbol(product.currency)}${product.price.toFixed(2)}`
    : 'No price set';

  // Get stock status
  const stockLevel = product.inventory?.stockLevel ?? 0;
  const stockBadge = stockLevel === 0
    ? '<span class="inventory-badge inventory-out">Out of Stock</span>'
    : stockLevel < 10
    ? '<span class="inventory-badge inventory-low">Low Stock</span>'
    : '<span class="inventory-badge inventory-ok">In Stock</span>';

  card.innerHTML = `
    <div class="product-image">
      ${primaryImage
        ? `<img src="${primaryImage.url}" alt="${product.name}">`
        : '<div style="font-size: 64px;">📦</div>'
      }
    </div>
    <div class="product-body">
      <div class="product-header">
        <div>
          <div class="product-name">${escapeHtml(product.name)}</div>
          ${product.category ? `<div class="product-category">${escapeHtml(product.category)}</div>` : ''}
        </div>
        <div class="product-price">${priceText}</div>
      </div>
      ${product.description ? `<div class="product-description">${escapeHtml(product.description)}</div>` : ''}
      <div class="product-meta">
        <span class="badge badge-${product.status}">${product.status.replace('_', ' ')}</span>
        ${stockBadge}
      </div>
      ${product.tags && product.tags.length > 0 ? `
        <div class="product-tags">
          ${product.tags.slice(0, 3).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
          ${product.tags.length > 3 ? `<span class="tag">+${product.tags.length - 3}</span>` : ''}
        </div>
      ` : ''}
      ${product.inventory ? `
        <div class="product-stock">Stock: ${stockLevel} units</div>
      ` : ''}
    </div>
  `;

  return card;
}

// Open add product modal
function openAddProductModal() {
  currentProduct = null;
  selectedImages = [];

  document.getElementById('modalTitle').textContent = 'Add New Product';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('submitBtnText').textContent = 'Add Product';
  document.getElementById('deleteBtn').style.display = 'none';
  document.getElementById('imagePreview').innerHTML = '';
  document.getElementById('autoAnalyze').checked = true;
  document.getElementById('generateClean').checked = false;

  document.getElementById('productModal').classList.add('active');
}

// Open edit product modal
function openEditProductModal(product) {
  currentProduct = product;
  selectedImages = [];

  document.getElementById('modalTitle').textContent = 'Edit Product';
  document.getElementById('productId').value = product.id;
  document.getElementById('productName').value = product.name || '';
  document.getElementById('productCategory').value = product.category || '';
  document.getElementById('productPrice').value = product.price || '';
  document.getElementById('productCurrency').value = product.currency || 'USD';
  document.getElementById('productStatus').value = product.status || 'draft';
  document.getElementById('productDescription').value = product.description || '';
  document.getElementById('productTags').value = product.tags ? product.tags.join(', ') : '';
  document.getElementById('stockLevel').value = product.inventory?.stockLevel ?? '';
  document.getElementById('submitBtnText').textContent = 'Update Product';
  document.getElementById('deleteBtn').style.display = 'inline-flex';
  document.getElementById('autoAnalyze').checked = false;
  document.getElementById('generateClean').checked = false;

  // Show existing images
  const previewContainer = document.getElementById('imagePreview');
  previewContainer.innerHTML = '';

  if (product.images && product.images.length > 0) {
    product.images.forEach(img => {
      const imgDiv = document.createElement('div');
      imgDiv.className = 'image-preview-item';
      imgDiv.innerHTML = `
        <img src="${img.url}" alt="Product image">
        <span class="image-preview-badge">${img.type}</span>
      `;
      previewContainer.appendChild(imgDiv);
    });
  }

  document.getElementById('productModal').classList.add('active');
}

// Close product modal
function closeProductModal() {
  document.getElementById('productModal').classList.remove('active');
  currentProduct = null;
  selectedImages = [];
}

// Handle image selection
function handleImageSelect(event) {
  const files = Array.from(event.target.files);
  handleImageFiles(files);
}

// Handle image files
function handleImageFiles(files) {
  selectedImages = files;

  const previewContainer = document.getElementById('imagePreview');
  previewContainer.innerHTML = '';

  files.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgDiv = document.createElement('div');
      imgDiv.className = 'image-preview-item';
      imgDiv.innerHTML = `
        <img src="${e.target.result}" alt="Preview">
        <span class="image-preview-badge">New</span>
      `;
      previewContainer.appendChild(imgDiv);
    };
    reader.readAsDataURL(file);
  });
}

// Handle product submit
async function handleProductSubmit(event) {
  event.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  const originalText = submitBtn.querySelector('#submitBtnText').textContent;
  submitBtn.disabled = true;
  submitBtn.querySelector('#submitBtnText').textContent = 'Saving...';

  try {
    // If we have images to upload
    if (selectedImages.length > 0) {
      await uploadProductWithImages();
    } else if (currentProduct) {
      // Update existing product without new images
      await updateProduct();
    } else {
      // Create new product without images
      await createProduct();
    }

    closeProductModal();
    await loadProducts();
  } catch (error) {
    console.error('Submit error:', error);
    showError('Failed to save product: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector('#submitBtnText').textContent = originalText;
  }
}

// Upload product with images
async function uploadProductWithImages() {
  const formData = new FormData();

  // Add first image
  formData.append('image', selectedImages[0]);
  formData.append('orgId', ORG_ID);
  formData.append('autoAnalyze', document.getElementById('autoAnalyze').checked);
  formData.append('generateClean', document.getElementById('generateClean').checked);

  const response = await fetch(`${API_BASE}/products/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Upload failed');
  }

  const product = await response.json();

  // Update product with form data
  const updateData = {
    name: document.getElementById('productName').value || product.name,
    description: document.getElementById('productDescription').value || product.description,
    category: document.getElementById('productCategory').value || product.category,
    price: parseFloat(document.getElementById('productPrice').value) || product.price,
    currency: document.getElementById('productCurrency').value,
    status: document.getElementById('productStatus').value,
    tags: document.getElementById('productTags').value
      .split(',')
      .map(t => t.trim())
      .filter(Boolean),
    inventory: {
      stockLevel: parseInt(document.getElementById('stockLevel').value) || 0,
    },
  };

  const updateResponse = await fetch(`${API_BASE}/products/${product.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData),
  });

  if (!updateResponse.ok) {
    throw new Error('Failed to update product');
  }
}

// Create product
async function createProduct() {
  const productData = {
    orgId: ORG_ID,
    name: document.getElementById('productName').value,
    description: document.getElementById('productDescription').value,
    category: document.getElementById('productCategory').value,
    price: parseFloat(document.getElementById('productPrice').value) || undefined,
    currency: document.getElementById('productCurrency').value,
    status: document.getElementById('productStatus').value,
    tags: document.getElementById('productTags').value
      .split(',')
      .map(t => t.trim())
      .filter(Boolean),
    inventory: {
      stockLevel: parseInt(document.getElementById('stockLevel').value) || 0,
    },
  };

  const response = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create product');
  }
}

// Update product
async function updateProduct() {
  const productData = {
    name: document.getElementById('productName').value,
    description: document.getElementById('productDescription').value,
    category: document.getElementById('productCategory').value,
    price: parseFloat(document.getElementById('productPrice').value) || undefined,
    currency: document.getElementById('productCurrency').value,
    status: document.getElementById('productStatus').value,
    tags: document.getElementById('productTags').value
      .split(',')
      .map(t => t.trim())
      .filter(Boolean),
    inventory: {
      ...currentProduct.inventory,
      stockLevel: parseInt(document.getElementById('stockLevel').value) || 0,
    },
  };

  const response = await fetch(`${API_BASE}/products/${currentProduct.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update product');
  }
}

// Handle delete product
async function handleDeleteProduct() {
  if (!currentProduct) return;

  if (!confirm(`Are you sure you want to delete "${currentProduct.name}"? This action cannot be undone.`)) {
    return;
  }

  const deleteBtn = document.getElementById('deleteBtn');
  const originalText = deleteBtn.textContent;
  deleteBtn.disabled = true;
  deleteBtn.textContent = 'Deleting...';

  try {
    const response = await fetch(`${API_BASE}/products/${currentProduct.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete product');
    }

    closeProductModal();
    await loadProducts();
  } catch (error) {
    console.error('Delete error:', error);
    showError('Failed to delete product: ' + error.message);
    deleteBtn.disabled = false;
    deleteBtn.textContent = originalText;
  }
}

// Utility functions
function getCurrencySymbol(currency) {
  const symbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: '$',
  };
  return symbols[currency] || currency;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showError(message) {
  alert(message);
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
  const modal = document.getElementById('productModal');
  if (event.target === modal) {
    closeProductModal();
  }
});

// Close modal with Escape key
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    const modal = document.getElementById('productModal');
    if (modal.classList.contains('active')) {
      closeProductModal();
    }
  }
});
