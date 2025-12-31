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

// CSV Export
async function exportCSV() {
  try {
    window.location.href = `${API_BASE}/products/export/csv?orgId=${ORG_ID}`;
  } catch (error) {
    console.error('CSV export error:', error);
    showError('Failed to export CSV: ' + error.message);
  }
}

// CSV Import Modal
function openImportCSVModal() {
  document.getElementById('csvImportModal').style.display = 'flex';
  document.getElementById('csvFileInput').value = '';
  document.getElementById('csvImportProgress').style.display = 'none';
  document.getElementById('csvImportResult').style.display = 'none';
}

function closeCSVImportModal() {
  document.getElementById('csvImportModal').style.display = 'none';
}

async function handleCSVImport() {
  const fileInput = document.getElementById('csvFileInput');
  const file = fileInput.files[0];

  if (!file) {
    showError('Please select a CSV file');
    return;
  }

  const progressDiv = document.getElementById('csvImportProgress');
  const resultDiv = document.getElementById('csvImportResult');
  const statusDiv = document.getElementById('csvImportStatus');

  progressDiv.style.display = 'block';
  resultDiv.style.display = 'none';
  statusDiv.textContent = 'Importing products...';

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('orgId', ORG_ID);

    const response = await fetch(`${API_BASE}/products/import/csv`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Import failed');
    }

    const result = await response.json();

    progressDiv.style.display = 'none';
    resultDiv.style.display = 'block';

    let resultHTML = `<div style="padding: 15px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px;">`;
    resultHTML += `<div style="font-weight: 600; color: #166534; margin-bottom: 10px;">✅ Import Complete</div>`;
    resultHTML += `<div style="color: #166534;">Imported: ${result.imported} products</div>`;

    if (result.failed > 0) {
      resultHTML += `<div style="color: #991b1b; margin-top: 10px;">Failed: ${result.failed} products</div>`;
      if (result.errors) {
        resultHTML += `<div style="margin-top: 10px; font-size: 12px;">`;
        result.errors.forEach(err => {
          resultHTML += `<div>Line ${err.line}: ${escapeHtml(err.error)}</div>`;
        });
        resultHTML += `</div>`;
      }
    }

    resultHTML += `</div>`;
    resultDiv.innerHTML = resultHTML;

    // Reload products
    await loadProducts();

    // Auto-close after success
    setTimeout(() => {
      closeCSVImportModal();
    }, 3000);
  } catch (error) {
    console.error('CSV import error:', error);
    progressDiv.style.display = 'none';
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `<div style="padding: 15px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; color: #991b1b;">
      <div style="font-weight: 600; margin-bottom: 5px;">❌ Import Failed</div>
      <div>${escapeHtml(error.message)}</div>
    </div>`;
  }
}

// Batch Upload Modal
function openBatchUploadModal() {
  document.getElementById('batchUploadModal').style.display = 'flex';
  document.getElementById('batchImagesInput').value = '';
  document.getElementById('batchAutoAnalyze').checked = true;
  document.getElementById('batchGenerateClean').checked = false;
  document.getElementById('batchUploadProgress').style.display = 'none';
  document.getElementById('batchUploadResult').style.display = 'none';
}

function closeBatchUploadModal() {
  document.getElementById('batchUploadModal').style.display = 'none';
}

async function handleBatchUpload() {
  const fileInput = document.getElementById('batchImagesInput');
  const files = fileInput.files;

  if (files.length === 0) {
    showError('Please select at least one image');
    return;
  }

  if (files.length > 20) {
    showError('Maximum 20 images allowed per batch');
    return;
  }

  const autoAnalyze = document.getElementById('batchAutoAnalyze').checked;
  const generateClean = document.getElementById('batchGenerateClean').checked;

  const progressDiv = document.getElementById('batchUploadProgress');
  const resultDiv = document.getElementById('batchUploadResult');
  const statusDiv = document.getElementById('batchUploadStatus');

  progressDiv.style.display = 'block';
  resultDiv.style.display = 'none';
  statusDiv.textContent = `Uploading ${files.length} images...`;

  try {
    const formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    formData.append('orgId', ORG_ID);
    formData.append('autoAnalyze', autoAnalyze);
    formData.append('generateClean', generateClean);

    const response = await fetch(`${API_BASE}/products/upload/batch`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Batch upload failed');
    }

    const result = await response.json();

    progressDiv.style.display = 'none';
    resultDiv.style.display = 'block';

    let resultHTML = `<div style="padding: 15px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px;">`;
    resultHTML += `<div style="font-weight: 600; color: #166534; margin-bottom: 10px;">✅ Upload Complete</div>`;
    resultHTML += `<div style="color: #166534;">Created: ${result.created} products</div>`;

    if (result.failed > 0) {
      resultHTML += `<div style="color: #991b1b; margin-top: 10px;">Failed: ${result.failed} images</div>`;
      if (result.errors) {
        resultHTML += `<div style="margin-top: 10px; font-size: 12px;">`;
        result.errors.forEach(err => {
          resultHTML += `<div>${escapeHtml(err.filename)}: ${escapeHtml(err.error)}</div>`;
        });
        resultHTML += `</div>`;
      }
    }

    resultHTML += `</div>`;
    resultDiv.innerHTML = resultHTML;

    // Reload products
    await loadProducts();

    // Auto-close after success
    setTimeout(() => {
      closeBatchUploadModal();
    }, 3000);
  } catch (error) {
    console.error('Batch upload error:', error);
    progressDiv.style.display = 'none';
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `<div style="padding: 15px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; color: #991b1b;">
      <div style="font-weight: 600; margin-bottom: 5px;">❌ Upload Failed</div>
      <div>${escapeHtml(error.message)}</div>
    </div>`;
  }
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
    const lookbookModal = document.getElementById('lookbookModal');
    if (lookbookModal && lookbookModal.classList.contains('active')) {
      closeLookbookModal();
    }
  }
});

// ============================================================================
// Lookbooks Functionality
// ============================================================================

let allLookbooks = [];
let allProductsForSelector = [];

// Switch between Products and Lookbooks tabs
function switchTab(tab) {
  const productsTab = document.querySelector('.nav-tab:nth-child(1)');
  const lookbooksTab = document.querySelector('.nav-tab:nth-child(2)');
  const analyticsTab = document.querySelector('.nav-tab:nth-child(3)');
  const productsSection = document.getElementById('productsSection');
  const lookbooksSection = document.getElementById('lookbooksSection');
  const analyticsSection = document.getElementById('analyticsSection');
  const productsStats = document.getElementById('productsStats');
  const lookbooksStats = document.getElementById('lookbooksStats');

  if (tab === 'products') {
    productsTab.classList.add('active');
    lookbooksTab.classList.remove('active');
    analyticsTab.classList.remove('active');
    productsSection.style.display = 'block';
    lookbooksSection.style.display = 'none';
    analyticsSection.style.display = 'none';
    productsStats.style.display = 'flex';
    lookbooksStats.style.display = 'none';
  } else if (tab === 'lookbooks') {
    productsTab.classList.remove('active');
    lookbooksTab.classList.add('active');
    analyticsTab.classList.remove('active');
    productsSection.style.display = 'none';
    lookbooksSection.style.display = 'block';
    analyticsSection.style.display = 'none';
    productsStats.style.display = 'none';
    lookbooksStats.style.display = 'flex';
    loadLookbooks();
  } else if (tab === 'analytics') {
    productsTab.classList.remove('active');
    lookbooksTab.classList.remove('active');
    analyticsTab.classList.add('active');
    productsSection.style.display = 'none';
    lookbooksSection.style.display = 'none';
    analyticsSection.style.display = 'block';
    productsStats.style.display = 'none';
    lookbooksStats.style.display = 'none';
    loadAnalytics();
  }
}

// Load lookbooks
async function loadLookbooks() {
  const container = document.getElementById('lookbooksContainer');
  container.innerHTML = '<div class="loading"><div class="loading-spinner">⏳</div><div style="margin-top: 15px;">Loading lookbooks...</div></div>';

  try {
    const response = await fetch(`/api/lookbooks?orgId=${currentOrgId}`);
    if (!response.ok) throw new Error('Failed to load lookbooks');

    allLookbooks = await response.json();
    displayLookbooks(allLookbooks);
    updateLookbooksStats(allLookbooks);
  } catch (error) {
    console.error('Error loading lookbooks:', error);
    container.innerHTML = '<div style="padding: 40px; text-align: center; color: #6b7280;">❌ Failed to load lookbooks</div>';
  }
}

// Display lookbooks
function displayLookbooks(lookbooks) {
  const container = document.getElementById('lookbooksContainer');

  if (lookbooks.length === 0) {
    container.innerHTML = `
      <div style="padding: 60px 20px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 15px;">📚</div>
        <div style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">No lookbooks yet</div>
        <div style="color: #6b7280; margin-bottom: 25px;">Create your first lookbook to organize products into collections</div>
        <button class="btn btn-primary" onclick="openAddLookbookModal()">
          <span>+</span>
          <span>Create Lookbook</span>
        </button>
      </div>
    `;
    return;
  }

  const grid = lookbooks.map(lookbook => {
    const coverImageHtml = lookbook.coverImage
      ? `<img src="${lookbook.coverImage}" alt="${lookbook.title}">`
      : '📚';

    const visibility = lookbook.isPublic ? 'Public' : 'Private';
    const visibilityClass = lookbook.isPublic ? '' : 'private';

    return `
      <div class="lookbook-card" onclick="openEditLookbookModal('${lookbook.id}')">
        <div class="lookbook-cover">
          ${coverImageHtml}
        </div>
        <div class="lookbook-body">
          <div class="lookbook-title">${lookbook.title}</div>
          ${lookbook.description ? `<div class="lookbook-description">${lookbook.description}</div>` : ''}
          <div class="lookbook-meta">
            <div class="lookbook-products-count">
              ${lookbook.products.length} product${lookbook.products.length !== 1 ? 's' : ''}
            </div>
            <div class="lookbook-visibility ${visibilityClass}">${visibility}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="lookbooks-grid">${grid}</div>`;
}

// Update lookbooks stats
function updateLookbooksStats(lookbooks) {
  const total = lookbooks.length;
  const publicCount = lookbooks.filter(l => l.isPublic).length;
  const privateCount = total - publicCount;

  document.getElementById('totalLookbooks').textContent = total;
  document.getElementById('publicLookbooks').textContent = publicCount;
  document.getElementById('privateLookbooks').textContent = privateCount;
}

// Load products for selector
async function loadProductsForSelector() {
  try {
    const response = await fetch(`/api/products?orgId=${currentOrgId}`);
    if (!response.ok) throw new Error('Failed to load products');

    allProductsForSelector = await response.json();
    displayProductSelector();
  } catch (error) {
    console.error('Error loading products for selector:', error);
    document.getElementById('productSelector').innerHTML = '<div style="padding: 20px; text-align: center; color: #ef4444;">Failed to load products</div>';
  }
}

// Display product selector
function displayProductSelector(selectedProducts = []) {
  const container = document.getElementById('productSelector');

  if (allProductsForSelector.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">No products available. Create products first.</div>';
    return;
  }

  const html = allProductsForSelector.map(product => {
    const isSelected = selectedProducts.includes(product.id);
    const image = product.images && product.images.length > 0
      ? `<img src="${product.images[0].url}" alt="${product.name}">`
      : '<div style="width: 50px; height: 50px; background: #e5e7eb; border-radius: 6px; display: flex; align-items: center; justify-content: center;">📦</div>';

    const price = product.price
      ? `${product.currency === 'USD' ? '$' : product.currency === 'EUR' ? '€' : product.currency} ${product.price.toFixed(2)}`
      : 'N/A';

    return `
      <div class="product-selector-item" onclick="toggleProductSelection('${product.id}')">
        <input type="checkbox" ${isSelected ? 'checked' : ''} data-product-id="${product.id}" onclick="event.stopPropagation(); toggleProductSelection('${product.id}')">
        ${image}
        <div class="product-selector-item-info">
          <div class="product-selector-item-name">${product.name}</div>
          <div class="product-selector-item-price">${price}</div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

// Toggle product selection
function toggleProductSelection(productId) {
  const checkbox = document.querySelector(`input[data-product-id="${productId}"]`);
  if (checkbox) {
    checkbox.checked = !checkbox.checked;
  }
}

// Open add lookbook modal
async function openAddLookbookModal() {
  document.getElementById('lookbookModalTitle').textContent = 'Create Lookbook';
  document.getElementById('lookbookSubmitBtnText').textContent = 'Create Lookbook';
  document.getElementById('lookbookForm').reset();
  document.getElementById('lookbookId').value = '';
  document.getElementById('deleteLookbookBtn').style.display = 'none';

  // Load products for selector
  await loadProductsForSelector();
  displayProductSelector([]);

  document.getElementById('lookbookModal').classList.add('active');
}

// Open edit lookbook modal
async function openEditLookbookModal(lookbookId) {
  const lookbook = allLookbooks.find(l => l.id === lookbookId);
  if (!lookbook) return;

  document.getElementById('lookbookModalTitle').textContent = 'Edit Lookbook';
  document.getElementById('lookbookSubmitBtnText').textContent = 'Save Changes';
  document.getElementById('lookbookId').value = lookbook.id;
  document.getElementById('lookbookTitle').value = lookbook.title;
  document.getElementById('lookbookDescription').value = lookbook.description || '';
  document.getElementById('lookbookCoverImage').value = lookbook.coverImage || '';
  document.getElementById('lookbookIsPublic').checked = lookbook.isPublic;
  document.getElementById('deleteLookbookBtn').style.display = 'block';

  // Load products and select current ones
  await loadProductsForSelector();
  displayProductSelector(lookbook.products);

  document.getElementById('lookbookModal').classList.add('active');
}

// Close lookbook modal
function closeLookbookModal() {
  document.getElementById('lookbookModal').classList.remove('active');
  document.getElementById('lookbookForm').reset();
}

// Handle lookbook submit
async function handleLookbookSubmit(event) {
  event.preventDefault();

  const lookbookId = document.getElementById('lookbookId').value;
  const title = document.getElementById('lookbookTitle').value.trim();
  const description = document.getElementById('lookbookDescription').value.trim();
  const coverImage = document.getElementById('lookbookCoverImage').value.trim();
  const isPublic = document.getElementById('lookbookIsPublic').checked;

  // Get selected products
  const selectedProducts = Array.from(document.querySelectorAll('#productSelector input[type="checkbox"]:checked'))
    .map(cb => cb.dataset.productId);

  const lookbookData = {
    title,
    description: description || undefined,
    coverImage: coverImage || undefined,
    isPublic,
    products: selectedProducts,
    orgId: currentOrgId,
  };

  const submitBtn = document.getElementById('lookbookSubmitBtn');
  const originalText = document.getElementById('lookbookSubmitBtnText').textContent;
  submitBtn.disabled = true;
  document.getElementById('lookbookSubmitBtnText').textContent = lookbookId ? 'Saving...' : 'Creating...';

  try {
    const url = lookbookId ? `/api/lookbooks/${lookbookId}` : '/api/lookbooks';
    const method = lookbookId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lookbookData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save lookbook');
    }

    closeLookbookModal();
    await loadLookbooks();
  } catch (error) {
    console.error('Error saving lookbook:', error);
    alert(`Error: ${error.message}`);
  } finally {
    submitBtn.disabled = false;
    document.getElementById('lookbookSubmitBtnText').textContent = originalText;
  }
}

// Handle delete lookbook
async function handleDeleteLookbook() {
  const lookbookId = document.getElementById('lookbookId').value;
  if (!lookbookId) return;

  const lookbook = allLookbooks.find(l => l.id === lookbookId);
  if (!confirm(`Are you sure you want to delete "${lookbook.title}"?`)) {
    return;
  }

  const deleteBtn = document.getElementById('deleteLookbookBtn');
  deleteBtn.disabled = true;
  deleteBtn.textContent = 'Deleting...';

  try {
    const response = await fetch(`/api/lookbooks/${lookbookId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete lookbook');
    }

    closeLookbookModal();
    await loadLookbooks();
  } catch (error) {
    console.error('Error deleting lookbook:', error);
    alert(`Error: ${error.message}`);
    deleteBtn.disabled = false;
    deleteBtn.textContent = 'Delete';
  }
}

// Lookbook search
document.getElementById('lookbookSearchInput')?.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();

  if (!query) {
    displayLookbooks(allLookbooks);
    return;
  }

  const filtered = allLookbooks.filter(lookbook =>
    lookbook.title.toLowerCase().includes(query) ||
    (lookbook.description && lookbook.description.toLowerCase().includes(query))
  );

  displayLookbooks(filtered);
});

// ============================================================================
// Analytics Functions
// ============================================================================

// Load analytics data
async function loadAnalytics() {
  const daysBack = parseInt(document.getElementById('analyticsTimeRange')?.value || '30');

  try {
    // Load analytics overview
    const response = await fetch(`/api/analytics/overview?orgId=${currentOrgId}&daysBack=${daysBack}`);
    if (!response.ok) throw new Error('Failed to load analytics');

    const data = await response.json();

    // Update summary stats
    document.getElementById('totalRevenue').textContent = `$${data.summary.totalRevenue.toFixed(2)}`;
    document.getElementById('totalOrders').textContent = data.summary.totalOrders;
    document.getElementById('avgOrderValue').textContent = `$${data.summary.averageOrderValue.toFixed(2)}`;
    document.getElementById('conversionRate').textContent = `${data.summary.conversionRate}%`;

    // Load individual sections
    displayRevenueTrends(data.dailyTrends);
    displayConversionFunnel(data.conversionFunnel);
    displayTopProducts(data.topProducts);
    displayTopCustomers(data.topCustomers);
    displayTopSearches(data.topSearches);
  } catch (error) {
    console.error('Error loading analytics:', error);
    showError('Failed to load analytics data');
  }
}

// Display revenue trends
function displayRevenueTrends(dailyData) {
  const container = document.getElementById('revenueTrends');

  if (!dailyData || dailyData.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">No revenue data available</div>';
    return;
  }

  // Reverse to show chronologically (oldest first)
  const sorted = [...dailyData].reverse();

  // Create simple bar chart visualization
  const maxRevenue = Math.max(...sorted.map(d => d.totalRevenue), 1);

  container.innerHTML = sorted.map(d => {
    const heightPercent = (d.totalRevenue / maxRevenue) * 100;
    return `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
        <div style="font-size: 12px; font-weight: 600; color: #1f2937;">$${d.totalRevenue.toFixed(0)}</div>
        <div style="width: 100%; height: 100px; display: flex; align-items: flex-end;">
          <div style="width: 100%; height: ${heightPercent}%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 4px; min-height: 2px;"></div>
        </div>
        <div style="font-size: 11px; color: #6b7280; white-space: nowrap;">${new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
      </div>
    `;
  }).join('');
}

// Display conversion funnel
function displayConversionFunnel(funnel) {
  const container = document.getElementById('conversionFunnel');

  if (!funnel || funnel.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">No funnel data available</div>';
    return;
  }

  container.innerHTML = funnel.map((stage, index) => {
    const width = stage.conversionRate;
    return `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: 600; color: #1f2937;">${stage.stage}</div>
          <div style="color: #6b7280;">${stage.count.toLocaleString()} (${stage.conversionRate.toFixed(1)}%)</div>
        </div>
        <div style="width: 100%; height: 30px; background: #f3f4f6; border-radius: 6px; overflow: hidden;">
          <div style="width: ${width}%; height: 100%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; padding: 0 10px; color: white; font-size: 12px; font-weight: 600;">
            ${stage.conversionRate.toFixed(1)}%
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Display top products
function displayTopProducts(products) {
  const container = document.getElementById('topProducts');

  if (!products || products.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">No product data available</div>';
    return;
  }

  container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="border-bottom: 2px solid #e5e7eb;">
          <th style="text-align: left; padding: 12px; color: #6b7280; font-weight: 600;">Product</th>
          <th style="text-align: right; padding: 12px; color: #6b7280; font-weight: 600;">Revenue</th>
          <th style="text-align: right; padding: 12px; color: #6b7280; font-weight: 600;">Qty Sold</th>
          <th style="text-align: right; padding: 12px; color: #6b7280; font-weight: 600;">Orders</th>
        </tr>
      </thead>
      <tbody>
        ${products.map((p, index) => `
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 12px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="font-weight: 600; color: #667eea; min-width: 20px;">#${index + 1}</div>
                ${p.productImage ? `<img src="${p.productImage.url || p.productImage.thumbnail}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">` : ''}
                <div>
                  <div style="font-weight: 500; color: #1f2937;">${p.productName}</div>
                  ${p.category ? `<div style="font-size: 12px; color: #6b7280;">${p.category}</div>` : ''}
                </div>
              </div>
            </td>
            <td style="text-align: right; padding: 12px; font-weight: 600; color: #059669;">$${p.totalRevenue.toFixed(2)}</td>
            <td style="text-align: right; padding: 12px; color: #1f2937;">${p.quantitySold}</td>
            <td style="text-align: right; padding: 12px; color: #1f2937;">${p.timesOrdered}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Display top customers
function displayTopCustomers(customers) {
  const container = document.getElementById('topCustomers');

  if (!customers || customers.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">No customer data available</div>';
    return;
  }

  container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="border-bottom: 2px solid #e5e7eb;">
          <th style="text-align: left; padding: 12px; color: #6b7280; font-weight: 600;">Customer</th>
          <th style="text-align: right; padding: 12px; color: #6b7280; font-weight: 600;">Total Spent</th>
          <th style="text-align: right; padding: 12px; color: #6b7280; font-weight: 600;">Orders</th>
          <th style="text-align: right; padding: 12px; color: #6b7280; font-weight: 600;">Avg Order</th>
        </tr>
      </thead>
      <tbody>
        ${customers.map((c, index) => `
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 12px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="font-weight: 600; color: #667eea; min-width: 20px;">#${index + 1}</div>
                <div>
                  <div style="font-weight: 500; color: #1f2937;">${c.email}</div>
                  ${c.daysSinceLastOrder !== undefined ? `<div style="font-size: 12px; color: #6b7280;">Last order: ${c.daysSinceLastOrder} days ago</div>` : ''}
                </div>
              </div>
            </td>
            <td style="text-align: right; padding: 12px; font-weight: 600; color: #059669;">$${c.totalSpent.toFixed(2)}</td>
            <td style="text-align: right; padding: 12px; color: #1f2937;">${c.totalOrders}</td>
            <td style="text-align: right; padding: 12px; color: #1f2937;">$${c.averageOrderValue.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Display top searches
function displayTopSearches(searches) {
  const container = document.getElementById('topSearches');

  if (!searches || searches.length === 0) {
    container.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">No search data available</div>';
    return;
  }

  container.innerHTML = `
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="border-bottom: 2px solid #e5e7eb;">
          <th style="text-align: left; padding: 12px; color: #6b7280; font-weight: 600;">Search Query</th>
          <th style="text-align: right; padding: 12px; color: #6b7280; font-weight: 600;">Count</th>
          <th style="text-align: right; padding: 12px; color: #6b7280; font-weight: 600;">Avg Results</th>
        </tr>
      </thead>
      <tbody>
        ${searches.map((s, index) => `
          <tr style="border-bottom: 1px solid #f3f4f6;">
            <td style="padding: 12px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="font-weight: 600; color: #667eea; min-width: 20px;">#${index + 1}</div>
                <div style="font-weight: 500; color: #1f2937;">${s.query}</div>
              </div>
            </td>
            <td style="text-align: right; padding: 12px; font-weight: 600; color: #1f2937;">${s.count}</td>
            <td style="text-align: right; padding: 12px; color: #6b7280;">${s.avgResults.toFixed(1)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Export analytics data
async function exportAnalytics(type) {
  const daysBack = parseInt(document.getElementById('analyticsTimeRange')?.value || '30');
  const url = `/api/analytics/export?orgId=${currentOrgId}&daysBack=${daysBack}&type=${type}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Export failed');

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `analytics-${type}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Export error:', error);
    alert('Failed to export analytics data');
  }
}

function showError(message) {
  // Simple error display - could be enhanced with a modal
  alert(message);
}
