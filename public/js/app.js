// Application State
const state = {
  user: null,
  cart: [],
  activeCategory: '',
  activeSearch: '',
};

// Elements cache
const appEl = document.getElementById('app');
const cartBadgeCount = document.getElementById('cart-badge-count');
const authNavContainer = document.getElementById('auth-nav-container');
const toastEl = document.getElementById('notification-toast');
const toastMsg = document.getElementById('toast-message');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');

// --- Helper Functions ---

// Toast notification
function showToast(message, isSuccess = true) {
  toastMsg.textContent = message;
  const icon = toastEl.querySelector('.toast-icon');
  if (isSuccess) {
    icon.className = 'fa-solid fa-circle-check toast-icon';
    toastEl.style.borderColor = 'var(--accent-cyan)';
    toastEl.style.boxShadow = '0 10px 30px rgba(0, 242, 254, 0.2)';
  } else {
    icon.className = 'fa-solid fa-circle-exclamation toast-icon';
    toastEl.style.borderColor = 'var(--error)';
    toastEl.style.boxShadow = '0 10px 30px rgba(239, 68, 68, 0.2)';
  }
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3500);
}

// Format price utility
function formatPrice(price) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

// Format Date utility
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Sync Navigation elements (Auth and Cart Count)
function syncHeader() {
  // Sync Cart Badge
  const count = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  cartBadgeCount.textContent = count;
  cartBadgeCount.style.display = count > 0 ? 'flex' : 'none';

  // Sync Auth controls
  if (state.user) {
    authNavContainer.innerHTML = `
      <div class="user-menu">
        <div class="user-menu-btn">
          <i class="fa-solid fa-user"></i>
          <span>${state.user.username}</span>
          <i class="fa-solid fa-chevron-down" style="font-size: 0.8rem;"></i>
        </div>
        <div class="user-menu-dropdown">
          <a href="#/orders"><i class="fa-solid fa-box"></i> Order History</a>
          <button id="logout-btn"><i class="fa-solid fa-arrow-right-from-bracket"></i> Logout</button>
        </div>
      </div>
    `;
    
    // Bind logout button dynamically
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        API.logout();
        state.user = null;
        state.cart = [];
        showToast('Logged out successfully');
        syncHeader();
        window.location.hash = '#/login';
      });
    }
  } else {
    authNavContainer.innerHTML = `
      <a href="#/login" class="btn btn-outline nav-btn-login"><i class="fa-solid fa-arrow-right-to-bracket"></i> Login</a>
      <a href="#/register" class="btn btn-primary nav-btn-register">Register</a>
    `;
  }
}

// Sync cart data from database
async function fetchCartData() {
  if (state.user) {
    try {
      const res = await API.getCart();
      state.cart = res.cart;
    } catch (err) {
      console.error('Error fetching cart:', err);
    }
  } else {
    state.cart = [];
  }
  syncHeader();
}

// Render Loader
function showLoader(message = 'Loading Nebula catalog...') {
  appEl.innerHTML = `
    <div class="main-loader-container">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>
  `;
}

// --- Views Routing ---

async function route() {
  const hash = window.location.hash || '#/';
  
  // Close any remaining menus
  document.querySelectorAll('.user-menu-dropdown').forEach(d => d.style.display = '');

  // Main Route Handlers
  if (hash === '#/' || hash.startsWith('#/?')) {
    // Parse query params if any
    const query = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
    state.activeCategory = query.get('category') || '';
    state.activeSearch = query.get('search') || '';
    
    // Sync Search bar value
    searchInput.value = state.activeSearch;
    
    renderStorefront();
  } 
  else if (hash.startsWith('#/product/')) {
    const id = hash.split('#/product/')[1];
    renderProductDetail(id);
  } 
  else if (hash === '#/cart') {
    renderCart();
  } 
  else if (hash === '#/checkout') {
    renderCheckout();
  } 
  else if (hash === '#/login') {
    renderLogin();
  } 
  else if (hash === '#/register') {
    renderRegister();
  } 
  else if (hash === '#/orders') {
    renderOrderHistory();
  } 
  else if (hash.startsWith('#/order-success')) {
    const query = new URLSearchParams(hash.split('?')[1] || '');
    const orderId = query.get('orderId');
    const total = query.get('total');
    renderOrderSuccess(orderId, total);
  } 
  else {
    // Fallback
    window.location.hash = '#/';
  }
}

// --- View Renderers ---

// 1. STOREFRONT VIEW
async function renderStorefront() {
  showLoader();
  try {
    const res = await API.getProducts(state.activeCategory, state.activeSearch);
    const products = res.products;

    // Categories
    const categories = ['All', 'Audio', 'Wearables', 'Peripherals', 'Office'];

    let categoriesHTML = categories.map(cat => {
      const isCatActive = (cat === 'All' && !state.activeCategory) || (cat === state.activeCategory);
      const url = cat === 'All' ? '#/' : `#/?category=${cat}`;
      return `<a href="${url}" class="filter-btn ${isCatActive ? 'active' : ''}">${cat}</a>`;
    }).join('');

    let productsGridHTML = '';
    if (products.length === 0) {
      productsGridHTML = `
        <div class="empty-results-container">
          <i class="fa-solid fa-box-open"></i>
          <h2>No Tech Found</h2>
          <p>We couldn't find anything matching your filters or search keywords.</p>
          <a href="#/" class="btn btn-primary" style="margin-top: 15px;">Clear Filters</a>
        </div>
      `;
    } else {
      productsGridHTML = products.map(prod => {
        // Stock tag helper
        let stockTag = `<span class="product-stock-tag in-stock">In Stock (${prod.stock})</span>`;
        if (prod.stock === 0) {
          stockTag = `<span class="product-stock-tag out-stock">Out of Stock</span>`;
        } else if (prod.stock < 10) {
          stockTag = `<span class="product-stock-tag low-stock">Low Stock (${prod.stock})</span>`;
        }

        const isOutOfStock = prod.stock === 0;

        return `
          <article class="product-card" data-id="${prod.id}">
            <div class="product-image">
              <img src="${prod.image_url}" alt="${prod.name}" loading="lazy">
              <span class="product-category-tag">${prod.category}</span>
              ${stockTag}
            </div>
            <div class="product-details-summary">
              <a href="#/product/${prod.id}" class="product-name-link">
                <h3>${prod.name}</h3>
              </a>
              <p class="product-desc-short">${prod.description}</p>
              <div class="product-footer-price-buy">
                <span class="product-card-price">${formatPrice(prod.price)}</span>
                <button class="btn btn-primary add-to-cart-quick-btn" ${isOutOfStock ? 'disabled' : ''}>
                  <i class="fa-solid fa-cart-plus"></i> Add
                </button>
              </div>
            </div>
          </article>
        `;
      }).join('');
    }

    appEl.innerHTML = `
      <section class="storefront-section">
        <header class="storefront-header">
          <div class="storefront-title">
            <h1>Nebula Hardware</h1>
            <p>Select professional tools designed for ultimate ergonomics and aesthetic workspaces</p>
          </div>
          <div class="category-filters">
            ${categoriesHTML}
          </div>
        </header>
        <div class="product-grid">
          ${productsGridHTML}
        </div>
      </section>
    `;

    // Add event listeners to Quick Add buttons
    document.querySelectorAll('.add-to-cart-quick-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const card = e.target.closest('.product-card');
        const productId = card.dataset.id;
        
        if (!state.user) {
          showToast('Please login to add items to your cart', false);
          window.location.hash = '#/login';
          return;
        }

        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        
        try {
          await API.addToCart(productId, 1);
          await fetchCartData();
          showToast('Product added to your cart!');
        } catch (err) {
          showToast(err.message, false);
        } finally {
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-cart-plus"></i> Add`;
        }
      });
    });

  } catch (err) {
    appEl.innerHTML = `
      <div class="glass-panel" style="text-align: center;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: var(--error); margin-bottom: 20px;"></i>
        <h2>Failed to load storefront</h2>
        <p>${err.message}</p>
        <button onclick="renderStorefront()" class="btn btn-primary" style="margin-top: 15px;">Retry Connection</button>
      </div>
    `;
  }
}

// 2. PRODUCT DETAIL VIEW
async function renderProductDetail(id) {
  showLoader('Loading hardware details...');
  try {
    const res = await API.getProduct(id);
    const prod = res.product;

    let stockTag = `<span class="status-badge paid"><i class="fa-solid fa-circle-check"></i> In Stock (${prod.stock} units)</span>`;
    let stockBarColor = 'var(--success)';
    if (prod.stock === 0) {
      stockTag = `<span class="status-badge" style="background: rgba(239,68,68,0.1); color: var(--error); border: 1px solid rgba(239,68,68,0.2);"><i class="fa-solid fa-circle-xmark"></i> Out of Stock</span>`;
      stockBarColor = 'var(--error)';
    } else if (prod.stock < 10) {
      stockTag = `<span class="status-badge pending"><i class="fa-solid fa-circle-exclamation"></i> Low Stock (${prod.stock} left)</span>`;
      stockBarColor = 'var(--warning)';
    }

    // Interactive bar width percentage (cap initial stock ref as 30)
    const stockPercent = Math.min((prod.stock / 30) * 100, 100);

    appEl.innerHTML = `
      <div class="back-navigation">
        <a href="#/" class="back-link-btn"><i class="fa-solid fa-arrow-left"></i> Back to Store</a>
      </div>
      <section class="glass-panel product-detail-layout">
        <div class="detail-image-panel">
          <img src="${prod.image_url}" alt="${prod.name}">
        </div>
        <div class="detail-info-panel">
          <span class="detail-category">${prod.category}</span>
          <h1 class="detail-title">${prod.name}</h1>
          <span class="detail-price">${formatPrice(prod.price)}</span>
          
          <div class="detail-description-section">
            <h4>Description</h4>
            <p>${prod.description}</p>
          </div>

          <div class="detail-stock-indicator">
            ${stockTag}
            ${prod.stock > 0 ? `
              <div class="stock-status-bar">
                <div class="stock-status-fill" style="width: ${stockPercent}%; background-color: ${stockBarColor};"></div>
              </div>
            ` : ''}
          </div>

          ${prod.stock > 0 ? `
            <div class="detail-purchase-action">
              <div class="quantity-selector">
                <button class="qty-btn" id="qty-dec"><i class="fa-solid fa-minus"></i></button>
                <input type="number" id="qty-val" class="qty-number-input" value="1" min="1" max="${prod.stock}" readOnly>
                <button class="qty-btn" id="qty-inc"><i class="fa-solid fa-plus"></i></button>
              </div>
              <button class="btn btn-primary" id="add-to-cart-detail-btn" style="flex: 1; height: 45px;">
                <i class="fa-solid fa-shopping-cart"></i> Add to Cart
              </button>
            </div>
          ` : `
            <button class="btn btn-outline" disabled style="height: 45px; width: 100%;">
              Temporarily Sold Out
            </button>
          `}
        </div>
      </section>
    `;

    // Quantity selectors events
    const qtyVal = document.getElementById('qty-val');
    const qtyInc = document.getElementById('qty-inc');
    const qtyDec = document.getElementById('qty-dec');
    
    if (qtyVal && qtyInc && qtyDec) {
      qtyInc.addEventListener('click', () => {
        let val = parseInt(qtyVal.value);
        if (val < prod.stock) qtyVal.value = val + 1;
      });
      qtyDec.addEventListener('click', () => {
        let val = parseInt(qtyVal.value);
        if (val > 1) qtyVal.value = val - 1;
      });
    }

    // Add to Cart
    const addBtn = document.getElementById('add-to-cart-detail-btn');
    if (addBtn) {
      addBtn.addEventListener('click', async () => {
        if (!state.user) {
          showToast('Please login to continue', false);
          window.location.hash = '#/login';
          return;
        }

        const qty = parseInt(qtyVal.value);
        addBtn.disabled = true;
        addBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

        try {
          await API.addToCart(prod.id, qty);
          await fetchCartData();
          showToast(`Successfully added ${qty} item(s) to cart!`);
        } catch (err) {
          showToast(err.message, false);
        } finally {
          addBtn.disabled = false;
          addBtn.innerHTML = `<i class="fa-solid fa-shopping-cart"></i> Add to Cart`;
        }
      });
    }

  } catch (err) {
    appEl.innerHTML = `
      <div class="glass-panel text-center" style="text-align: center;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: var(--error); margin-bottom: 20px;"></i>
        <h2>Hardware Not Found</h2>
        <p>${err.message}</p>
        <a href="#/" class="btn btn-primary" style="margin-top: 15px;">Return to Store</a>
      </div>
    `;
  }
}

// 3. SHOPPING CART VIEW
async function renderCart() {
  if (!state.user) {
    appEl.innerHTML = `
      <div class="glass-panel text-center" style="max-width: 500px; margin: 40px auto; text-align: center;">
        <i class="fa-solid fa-lock" style="font-size: 3rem; color: var(--accent-cyan); margin-bottom: 20px;"></i>
        <h2>Authentication Required</h2>
        <p>Please login or create a Nebula profile to manage your items.</p>
        <div style="margin-top: 20px; display: flex; gap: 15px; justify-content: center;">
          <a href="#/login" class="btn btn-primary">Login</a>
          <a href="#/register" class="btn btn-outline">Register</a>
        </div>
      </div>
    `;
    return;
  }

  showLoader('Loading your shopping cart...');
  try {
    await fetchCartData();
    const cart = state.cart;

    if (cart.length === 0) {
      appEl.innerHTML = `
        <section class="glass-panel cart-empty-panel">
          <i class="fa-solid fa-cart-shopping"></i>
          <h2>Your Cart is Empty</h2>
          <p>Looks like you haven't added any premium hardware to your setup yet.</p>
          <a href="#/" class="btn btn-primary">Browse Store</a>
        </section>
      `;
      return;
    }

    // Calculatings
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = 0; // free shipping
    const estTax = subtotal * 0.08; // 8% tax
    const total = subtotal + estTax;

    const cartRowsHTML = cart.map(item => {
      const itemSub = item.price * item.quantity;
      return `
        <div class="cart-item-row" data-id="${item.product_id}">
          <div class="cart-item-thumb">
            <img src="${item.image_url}" alt="${item.name}">
          </div>
          <div class="cart-item-details">
            <span class="cart-item-category">${item.category}</span>
            <a href="#/product/${item.product_id}" class="cart-item-title">
              <h3>${item.name}</h3>
            </a>
            <span class="cart-item-unit-price">${formatPrice(item.price)} each</span>
          </div>
          <div class="cart-item-interactions">
            <div class="quantity-selector">
              <button class="qty-btn cart-qty-dec"><i class="fa-solid fa-minus"></i></button>
              <input type="number" class="qty-number-input cart-qty-val" value="${item.quantity}" min="1" max="${item.stock}" readOnly>
              <button class="qty-btn cart-qty-inc"><i class="fa-solid fa-plus"></i></button>
            </div>
            <span class="cart-item-subtotal">${formatPrice(itemSub)}</span>
            <button class="btn btn-danger remove-cart-item-btn" aria-label="Remove item" style="padding: 10px 14px;">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    appEl.innerHTML = `
      <section class="cart-section">
        <header class="cart-header">
          <h1>Shopping Cart</h1>
        </header>
        <div class="cart-layout">
          <div class="cart-items-list">
            ${cartRowsHTML}
          </div>
          <aside class="cart-summary-panel glass-panel">
            <div class="cart-summary-title">
              <h3>Order Summary</h3>
            </div>
            <div class="summary-row">
              <span>Subtotal</span>
              <span>${formatPrice(subtotal)}</span>
            </div>
            <div class="summary-row">
              <span>Shipping</span>
              <span style="color: var(--success); font-weight: 500;">Free Delivery</span>
            </div>
            <div class="summary-row">
              <span>Estimated Tax (8%)</span>
              <span>${formatPrice(estTax)}</span>
            </div>
            <div class="summary-row total">
              <span>Total</span>
              <span style="color: var(--accent-cyan);">${formatPrice(total)}</span>
            </div>
            <a href="#/checkout" class="btn btn-primary" style="margin-top: 15px; height: 50px;">
              <i class="fa-solid fa-credit-card"></i> Proceed to Checkout
            </a>
          </aside>
        </div>
      </section>
    `;

    // Quantity selectors logic
    document.querySelectorAll('.cart-item-row').forEach(row => {
      const productId = row.dataset.id;
      const qtyInput = row.querySelector('.cart-qty-val');
      const incBtn = row.querySelector('.cart-qty-inc');
      const decBtn = row.querySelector('.cart-qty-dec');
      const removeBtn = row.querySelector('.remove-cart-item-btn');

      // Bind increase
      incBtn.addEventListener('click', async () => {
        const item = state.cart.find(c => c.product_id == productId);
        if (item && item.quantity < item.stock) {
          const nextVal = item.quantity + 1;
          qtyInput.value = nextVal;
          showLoader('Updating cart...');
          try {
            await API.updateCartItem(productId, nextVal);
            await renderCart();
          } catch (err) {
            showToast(err.message, false);
            await renderCart();
          }
        } else {
          showToast('Cannot exceed maximum available stock', false);
        }
      });

      // Bind decrease
      decBtn.addEventListener('click', async () => {
        const item = state.cart.find(c => c.product_id == productId);
        if (item && item.quantity > 1) {
          const nextVal = item.quantity - 1;
          qtyInput.value = nextVal;
          showLoader('Updating cart...');
          try {
            await API.updateCartItem(productId, nextVal);
            await renderCart();
          } catch (err) {
            showToast(err.message, false);
            await renderCart();
          }
        }
      });

      // Bind remove
      removeBtn.addEventListener('click', async () => {
        showLoader('Removing item...');
        try {
          await API.removeFromCart(productId);
          showToast('Item removed from cart');
          await renderCart();
        } catch (err) {
          showToast(err.message, false);
          await renderCart();
        }
      });
    });

  } catch (err) {
    appEl.innerHTML = `
      <div class="glass-panel text-center" style="text-align: center;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: var(--error); margin-bottom: 20px;"></i>
        <h2>Failed to retrieve cart details</h2>
        <p>${err.message}</p>
        <button onclick="renderCart()" class="btn btn-primary" style="margin-top: 15px;">Retry Connection</button>
      </div>
    `;
  }
}

// 4. CHECKOUT VIEW
async function renderCheckout() {
  if (!state.user) {
    window.location.hash = '#/login';
    return;
  }

  // Refresh cart state to verify it's not empty
  await fetchCartData();
  const cart = state.cart;

  if (cart.length === 0) {
    window.location.hash = '#/';
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  appEl.innerHTML = `
    <section class="checkout-section">
      <header class="cart-header">
        <h1>Secure Checkout</h1>
      </header>
      <div class="checkout-layout">
        <!-- Billing Details Form -->
        <div class="glass-panel">
          <form id="checkout-form">
            <h3 style="margin-bottom: 20px; border-bottom: 1px solid var(--panel-border); padding-bottom: 10px;">
              <i class="fa-solid fa-truck" style="color: var(--accent-cyan); margin-right: 8px;"></i> Shipping Information
            </h3>
            
            <div class="form-group">
              <label for="shipping-name">Full Name</label>
              <input type="text" id="shipping-name" class="form-input" placeholder="Alex Mercer" required>
            </div>

            <div class="form-group">
              <label for="shipping-address">Street Address</label>
              <input type="text" id="shipping-address" class="form-input" placeholder="742 Evergreen Terrace" required>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="shipping-city">City</label>
                <input type="text" id="shipping-city" class="form-input" placeholder="Neo-Seoul" required>
              </div>
              <div class="form-group">
                <label for="shipping-zip">Postal / ZIP Code</label>
                <input type="text" id="shipping-zip" class="form-input" placeholder="90210" required>
              </div>
            </div>

            <h3 style="margin: 30px 0 20px; border-bottom: 1px solid var(--panel-border); padding-bottom: 10px;">
              <i class="fa-solid fa-credit-card" style="color: var(--accent-cyan); margin-right: 8px;"></i> Payment Details (Mock Validation)
            </h3>

            <div class="form-group">
              <label for="card-num-input">Card Number</label>
              <input type="text" id="card-num-input" class="form-input" placeholder="4111 2222 3333 4444" maxlength="19" required>
            </div>

            <div class="form-group">
              <label for="card-holder-input">Cardholder Name</label>
              <input type="text" id="card-holder-input" class="form-input" placeholder="ALEX MERCER" required>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="card-expiry-input">Expiration Date</label>
                <input type="text" id="card-expiry-input" class="form-input" placeholder="MM/YY" maxlength="5" required>
              </div>
              <div class="form-group">
                <label for="card-cvv-input">CVV</label>
                <input type="password" id="card-cvv-input" class="form-input" placeholder="***" maxlength="3" required>
              </div>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; height: 50px; margin-top: 15px;">
              <i class="fa-solid fa-shield-halved"></i> Complete Secure Checkout (${formatPrice(total)})
            </button>
          </form>
        </div>

        <!-- Order items overview and card graphics mockup -->
        <aside class="checkout-summary-panel">
          <!-- Card Graphic Graphic -->
          <div class="card-preview-container">
            <div class="credit-card-mock">
              <div>
                <div class="card-chip"></div>
                <div class="card-number-display" id="card-number-preview">•••• •••• •••• ••••</div>
              </div>
              <div class="card-footer-info">
                <div class="card-holder-display">
                  <label>Card Holder</label>
                  <span id="card-holder-preview">Your Name</span>
                </div>
                <div class="card-expiry-display">
                  <label>Expires</label>
                  <span id="card-expiry-preview">MM/YY</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Mini cart overview -->
          <div class="glass-panel" style="padding: 20px;">
            <h3 style="margin-bottom: 15px; border-bottom: 1px solid var(--panel-border); padding-bottom: 10px;">Items Summary</h3>
            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; max-height: 180px; overflow-y: auto;">
              ${cart.map(item => `
                <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                  <span style="color: white; font-weight: 500;">${item.name} <span style="color: var(--text-muted);">x${item.quantity}</span></span>
                  <span style="color: var(--text-muted);">${formatPrice(item.price * item.quantity)}</span>
                </div>
              `).join('')}
            </div>
            <div class="summary-row" style="margin-bottom: 8px;">
              <span>Subtotal</span>
              <span>${formatPrice(subtotal)}</span>
            </div>
            <div class="summary-row" style="margin-bottom: 8px;">
              <span>Tax (8%)</span>
              <span>${formatPrice(tax)}</span>
            </div>
            <div class="summary-row total" style="padding-top: 10px;">
              <span>Grand Total</span>
              <span style="color: var(--accent-cyan);">${formatPrice(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  `;

  // Bind Credit card live graphics sync
  const cardNumInp = document.getElementById('card-num-input');
  const cardHolderInp = document.getElementById('card-holder-input');
  const cardExpiryInp = document.getElementById('card-expiry-input');

  const cardNumPrv = document.getElementById('card-number-preview');
  const cardHolderPrv = document.getElementById('card-holder-preview');
  const cardExpiryPrv = document.getElementById('card-expiry-preview');

  cardNumInp.addEventListener('input', (e) => {
    // Formatting: 1234 5678 1234 5678
    let val = e.target.value.replace(/\D/g, '');
    let formatted = val.match(/.{1,4}/g)?.join(' ') || '';
    e.target.value = formatted;
    cardNumPrv.textContent = formatted || '•••• •••• •••• ••••';
  });

  cardHolderInp.addEventListener('input', (e) => {
    cardHolderPrv.textContent = e.target.value.toUpperCase() || 'Your Name';
  });

  cardExpiryInp.addEventListener('input', (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length >= 2) {
      val = val.substring(0,2) + '/' + val.substring(2,4);
    }
    e.target.value = val;
    cardExpiryPrv.textContent = val || 'MM/YY';
  });

  // Handle Checkout submission
  const checkoutFrm = document.getElementById('checkout-form');
  checkoutFrm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('shipping-name').value.trim();
    const address = document.getElementById('shipping-address').value.trim();
    const city = document.getElementById('shipping-city').value.trim();
    const zip = document.getElementById('shipping-zip').value.trim();

    const fullShippingString = `${name}, ${address}, ${city}, ${zip}`;

    const submitBtn = checkoutFrm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing Secure Payment...`;

    try {
      const res = await API.checkout(fullShippingString);
      // Success redirection
      window.location.hash = `#/order-success?orderId=${res.orderId}&total=${res.totalPrice}`;
      // Refresh local cart
      state.cart = [];
      syncHeader();
    } catch (err) {
      showToast(err.message, false);
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-shield-halved"></i> Complete Secure Checkout (${formatPrice(total)})`;
    }
  });
}

// 5. ORDER SUCCESS VIEW
function renderOrderSuccess(orderId, total) {
  appEl.innerHTML = `
    <section class="glass-panel success-screen">
      <div class="success-icon-container">
        <i class="fa-solid fa-check"></i>
      </div>
      <h1>Order Placed Successfully!</h1>
      <p>Thank you for choosing Nebula Tech. Your transaction is approved, and shipment details have been dispatched to your email.</p>
      
      <div class="success-details-card">
        <div class="success-detail-row">
          <span>Order Reference</span>
          <span style="font-family: monospace; font-weight: 600;">#NEB-2026-${orderId}</span>
        </div>
        <div class="success-detail-row">
          <span>Status</span>
          <span style="color: var(--success); font-weight: 600;">Paid / Approved</span>
        </div>
        <div class="success-detail-row">
          <span>Amount Charged</span>
          <span>${formatPrice(parseFloat(total))}</span>
        </div>
      </div>

      <div style="display: flex; gap: 15px; justify-content: center;">
        <a href="#/" class="btn btn-primary">Continue Shopping</a>
        <a href="#/orders" class="btn btn-outline"><i class="fa-solid fa-box"></i> View Orders</a>
      </div>
    </section>
  `;
}

// 6. LOGIN VIEW
function renderLogin() {
  if (state.user) {
    window.location.hash = '#/';
    return;
  }

  appEl.innerHTML = `
    <section class="glass-panel auth-panel">
      <div class="auth-title-section">
        <h1>Welcome Back</h1>
        <p>Access your Nebula account credentials to manage orders</p>
      </div>

      <div id="auth-error" class="auth-error-banner"></div>

      <form id="login-form">
        <div class="form-group">
          <label for="login-email">Email Address</label>
          <input type="email" id="login-email" class="form-input" placeholder="name@domain.com" required>
        </div>
        <div class="form-group" style="margin-bottom: 25px;">
          <label for="login-password">Password</label>
          <input type="password" id="login-password" class="form-input" placeholder="••••••••" required>
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%; height: 45px;">
          Authorize Account
        </button>
      </form>

      <p class="auth-switch-prompt">
        Don't have a profile yet? <a href="#/register">Create Account</a>
      </p>
    </section>
  `;

  const loginFrm = document.getElementById('login-form');
  const errorBanner = document.getElementById('auth-error');

  loginFrm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const submitBtn = loginFrm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;
    errorBanner.style.display = 'none';

    try {
      const user = await API.login(email, password);
      state.user = user;
      showToast(`Welcome back, ${user.username}!`);
      await fetchCartData();
      window.location.hash = '#/';
    } catch (err) {
      errorBanner.textContent = err.message;
      errorBanner.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Authorize Account';
    }
  });
}

// 7. REGISTER VIEW
function renderRegister() {
  if (state.user) {
    window.location.hash = '#/';
    return;
  }

  appEl.innerHTML = `
    <section class="glass-panel auth-panel">
      <div class="auth-title-section">
        <h1>Create Nebula Workspace</h1>
        <p>Register to customize orders, persist carts, and checkout secure goods</p>
      </div>

      <div id="auth-error" class="auth-error-banner"></div>

      <form id="register-form">
        <div class="form-group">
          <label for="reg-username">Username</label>
          <input type="text" id="reg-username" class="form-input" placeholder="cyberpunk_coder" required minlength="3">
        </div>
        <div class="form-group">
          <label for="reg-email">Email Address</label>
          <input type="email" id="reg-email" class="form-input" placeholder="name@domain.com" required>
        </div>
        <div class="form-group" style="margin-bottom: 25px;">
          <label for="reg-password">Password</label>
          <input type="password" id="reg-password" class="form-input" placeholder="At least 6 characters" required minlength="6">
        </div>
        <button type="submit" class="btn btn-primary" style="width: 100%; height: 45px;">
          Initialize Profile
        </button>
      </form>

      <p class="auth-switch-prompt">
        Already registered? <a href="#/login">Access Account</a>
      </p>
    </section>
  `;

  const regFrm = document.getElementById('register-form');
  const errorBanner = document.getElementById('auth-error');

  regFrm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    const submitBtn = regFrm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Initializing...`;
    errorBanner.style.display = 'none';

    try {
      const user = await API.register(username, email, password);
      state.user = user;
      showToast(`Welcome to Nebula Tech, ${user.username}!`);
      await fetchCartData();
      window.location.hash = '#/';
    } catch (err) {
      errorBanner.textContent = err.message;
      errorBanner.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Initialize Profile';
    }
  });
}

// 8. ORDER HISTORY VIEW
async function renderOrderHistory() {
  if (!state.user) {
    window.location.hash = '#/login';
    return;
  }

  showLoader('Retrieving your purchase registry...');
  try {
    const res = await API.getOrders();
    const orders = res.orders;

    if (orders.length === 0) {
      appEl.innerHTML = `
        <section class="glass-panel no-orders-panel">
          <i class="fa-solid fa-box" style="font-size: 4rem; color: var(--text-muted); opacity: 0.4; margin-bottom: 20px;"></i>
          <h2>No Orders Found</h2>
          <p>You haven't checked out any order items yet.</p>
          <a href="#/" class="btn btn-primary" style="margin-top: 15px;">Browse Hardware</a>
        </section>
      `;
      return;
    }

    const ordersHTML = orders.map(ord => {
      const itemsListHTML = ord.items.map(item => `
        <div class="order-item-detail-row">
          <div class="order-item-product-info">
            <div class="order-item-mini-thumb">
              <img src="${item.imageUrl}" alt="${item.productName}">
            </div>
            <span class="order-item-product-name">${item.productName}</span>
          </div>
          <span class="order-item-qty-price">
            ${item.quantity} x ${formatPrice(item.priceAtPurchase)}
          </span>
        </div>
      `).join('');

      return `
        <div class="order-card">
          <div class="order-card-header">
            <div class="order-meta-info">
              <label>Order Placed</label>
              <span>${formatDate(ord.createdAt)}</span>
            </div>
            <div class="order-meta-info">
              <label>Order ID</label>
              <span style="font-family: monospace;">#NEB-2026-${ord.id}</span>
            </div>
            <div class="order-meta-info">
              <label>Total Price</label>
              <span style="color: var(--accent-cyan); font-weight: 600;">${formatPrice(ord.totalPrice)}</span>
            </div>
            <div class="order-meta-info">
              <label>Shipment Status</label>
              <span class="status-badge paid"><i class="fa-solid fa-circle-check"></i> ${ord.status}</span>
            </div>
          </div>
          <div class="order-card-body">
            <div style="margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 8px;">
              <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase;">Shipping Destination:</span>
              <p style="font-size: 0.9rem; color: white; margin-top: 3px; font-weight: 500;">${ord.shippingAddress}</p>
            </div>
            <div class="order-items-grid">
              ${itemsListHTML}
            </div>
          </div>
        </div>
      `;
    }).join('');

    appEl.innerHTML = `
      <section class="order-history-section">
        <header class="order-history-header">
          <h1>Purchase Registry</h1>
        </header>
        <div class="orders-list">
          ${ordersHTML}
        </div>
      </section>
    `;

  } catch (err) {
    appEl.innerHTML = `
      <div class="glass-panel text-center" style="text-align: center;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: var(--error); margin-bottom: 20px;"></i>
        <h2>Failed to load orders</h2>
        <p>${err.message}</p>
        <button onclick="renderOrderHistory()" class="btn btn-primary" style="margin-top: 15px;">Retry Connection</button>
      </div>
    `;
  }
}

// --- Application Bootstrapping ---

// Search Form Handler
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const searchVal = searchInput.value.trim();
  if (searchVal) {
    window.location.hash = `/#/?search=${encodeURIComponent(searchVal)}`;
  } else {
    window.location.hash = '#/';
  }
});

// Watch Hash Changes
window.addEventListener('hashchange', route);

// On Page Load
async function initApp() {
  showLoader('Connecting to Nebula Workspaces...');
  try {
    // 1. Fetch current profile session
    const user = await API.getMe();
    state.user = user;

    // 2. Fetch cart contents if logged in
    await fetchCartData();

    // 3. Routing resolution
    await route();
  } catch (err) {
    console.error('App initialization error:', err);
    // Boot storefront anyway for guests
    route();
  }
}

// Kickstart!
initApp();
