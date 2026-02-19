let products = [];
let categories = [];
let tags = [];
let editingProductId = null;

// Load initial data
async function loadData() {
    await Promise.all([
        loadProducts(),
        loadCategories(),
        loadTags()
    ]);
}

// Load all products
async function loadProducts(filters = {}) {
    try {
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        if (filters.tag) params.append('tag', filters.tag);
        if (filters.attribute) {
            params.append('attribute', filters.attribute);
            params.append('attrValue', filters.attrValue);
        }
        
        const url = `/products${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url);
        products = await response.json();
        renderProducts();
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Load categories
async function loadCategories() {
    try {
        const response = await fetch('/categories');
        categories = await response.json();
        renderCategoryFilter();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load tags
async function loadTags() {
    try {
        const response = await fetch('/tags');
        tags = await response.json();
        renderTagFilter();
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

// Render products grid
function renderProducts() {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';
    
    if (products.length === 0) {
        return; // Empty state handled by CSS
    }
    
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const tagsHtml = product.tags && product.tags.length > 0
            ? product.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')
            : '';
        
        card.innerHTML = `
            <img src="${product.image_url || 'https://via.placeholder.com/280x220?text=No+Image'}" 
                 alt="${escapeHtml(product.name)}" 
                 class="product-image">
            <div class="product-info">
                <div class="product-category">${escapeHtml(product.category)}</div>
                <div class="product-name">${escapeHtml(product.name)}</div>
                <div class="product-price">$${parseFloat(product.price).toFixed(2)}</div>
                <div class="product-tags">${tagsHtml}</div>
                <div class="product-actions">
                    <button class="btn-view" onclick="viewProduct(${product.id})">View</button>
                    <button class="btn-edit-card" onclick="editProduct(${product.id})">Edit</button>
                    <button class="btn-delete-card" onclick="deleteProduct(${product.id})">Delete</button>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

// Render category filter
function renderCategoryFilter() {
    const select = document.getElementById('category-filter');
    select.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        select.appendChild(option);
    });
}

// Render tag filter
function renderTagFilter() {
    const select = document.getElementById('tag-filter');
    select.innerHTML = '<option value="">All Tags</option>';
    tags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        select.appendChild(option);
    });
}

// Filter products
function filterProducts() {
    const category = document.getElementById('category-filter').value;
    const tag = document.getElementById('tag-filter').value;
    
    const filters = {};
    if (category) filters.category = category;
    if (tag) filters.tag = tag;
    
    loadProducts(filters);
}

// Filter by JSON attribute (brand)
function filterByAttribute() {
    const brand = document.getElementById('brand-filter').value;
    
    if (brand) {
        loadProducts({ attribute: 'brand', attrValue: brand });
    } else {
        loadProducts();
    }
}

// Search products (full-text search)
async function searchProducts() {
    const query = document.getElementById('search-input').value.trim();
    
    if (!query) {
        loadProducts();
        return;
    }
    
    try {
        const response = await fetch(`/products/search?q=${encodeURIComponent(query)}`);
        products = await response.json();
        renderProducts();
    } catch (error) {
        console.error('Error searching products:', error);
    }
}

// Clear search
function clearSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('category-filter').value = '';
    document.getElementById('tag-filter').value = '';
    document.getElementById('brand-filter').value = '';
    loadProducts();
}

// View product details
async function viewProduct(id) {
    try {
        const response = await fetch(`/products/${id}`);
        const product = await response.json();
        
        const content = document.getElementById('detail-content');
        const tagsHtml = product.tags && product.tags.length > 0
            ? product.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')
            : 'None';
        
        let attributesHtml = '<p>None</p>';
        if (product.attributes && Object.keys(product.attributes).length > 0) {
            attributesHtml = '<div class="attributes-list">';
            for (const [key, value] of Object.entries(product.attributes)) {
                attributesHtml += `
                    <div class="attribute-item">
                        <span class="attribute-key">${escapeHtml(key)}:</span>
                        <span class="attribute-value">${escapeHtml(value)}</span>
                    </div>
                `;
            }
            attributesHtml += '</div>';
        }
        
        content.innerHTML = `
            <img src="${product.image_url || 'https://via.placeholder.com/600x300?text=No+Image'}" 
                 class="detail-image" alt="${escapeHtml(product.name)}">
            
            <div class="detail-section">
                <h4>Price</h4>
                <p style="font-size: 1.5rem; color: #667eea; font-weight: 700;">$${parseFloat(product.price).toFixed(2)}</p>
            </div>
            
            <div class="detail-section">
                <h4>Category</h4>
                <p>${escapeHtml(product.category)}</p>
            </div>
            
            <div class="detail-section">
                <h4>Attributes (PostgreSQL JSONB)</h4>
                ${attributesHtml}
            </div>
            
            <div class="detail-section">
                <h4>Tags (PostgreSQL Array)</h4>
                <p>${tagsHtml}</p>
            </div>
            
            <div class="detail-section">
                <h4>Description</h4>
                <p>${escapeHtml(product.description || 'No description available')}</p>
            </div>
        `;
        
        document.getElementById('detail-name').textContent = product.name;
        editingProductId = id;
        document.getElementById('detail-modal').classList.add('active');
    } catch (error) {
        console.error('Error fetching product:', error);
    }
}

// Open add product modal
function openAddModal() {
    editingProductId = null;
    document.getElementById('modal-title').textContent = 'Add Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-modal').classList.add('active');
}

// Edit product
async function editProduct(id) {
    try {
        const response = await fetch(`/products/${id}`);
        const product = await response.json();
        
        editingProductId = id;
        document.getElementById('modal-title').textContent = 'Edit Product';
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-image').value = product.image_url || '';
        document.getElementById('product-attributes').value = JSON.stringify(product.attributes || {}, null, 2);
        document.getElementById('product-tags').value = product.tags ? product.tags.join(', ') : '';
        document.getElementById('product-description').value = product.description || '';
        
        document.getElementById('product-modal').classList.add('active');
    } catch (error) {
        console.error('Error fetching product:', error);
    }
}

// Edit from detail modal
function editProductFromDetail() {
    closeDetailModal();
    editProduct(editingProductId);
}

// Save product (create or update)
async function saveProduct() {
    const name = document.getElementById('product-name').value.trim();
    const category = document.getElementById('product-category').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const image_url = document.getElementById('product-image').value.trim();
    const attributesText = document.getElementById('product-attributes').value.trim();
    const tagsText = document.getElementById('product-tags').value.trim();
    const description = document.getElementById('product-description').value.trim();
    
    if (!name || !category || !price) {
        alert('Please fill in all required fields');
        return;
    }
    
    let attributes = {};
    if (attributesText) {
        try {
            attributes = JSON.parse(attributesText);
        } catch (e) {
            alert('Invalid JSON in attributes field');
            return;
        }
    }
    
    const tags = tagsText ? tagsText.split(',').map(t => t.trim()).filter(t => t) : [];
    
    const product = {
        name,
        category,
        price,
        image_url: image_url || null,
        attributes,
        tags,
        description
    };
    
    try {
        const url = editingProductId ? `/products/${editingProductId}` : '/products';
        const method = editingProductId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product)
        });
        
        if (response.ok) {
            closeProductModal();
            await loadData();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Failed to save product');
    }
}

// Delete product
async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    
    try {
        const response = await fetch(`/products/${id}`, { method: 'DELETE' });
        
        if (response.ok) {
            await loadData();
        }
    } catch (error) {
        console.error('Error deleting product:', error);
    }
}

// Close modals
function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
    editingProductId = null;
}

function closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('active');
}

// Helper: Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Allow Enter key in search
document.getElementById('search-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchProducts();
});

// Close modals on overlay click
document.getElementById('product-modal')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        closeProductModal();
    }
});

document.getElementById('detail-modal')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        closeDetailModal();
    }
});

// Initialize
loadData();