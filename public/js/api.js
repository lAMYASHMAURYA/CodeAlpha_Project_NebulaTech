const API_BASE = '/api';

const API = {
  // Get Token from localStorage
  getToken() {
    return localStorage.getItem('nebula_token');
  },

  // Save Token to localStorage
  setToken(token) {
    if (token) {
      localStorage.setItem('nebula_token', token);
    } else {
      localStorage.removeItem('nebula_token');
    }
  },

  // Generic Request Handler
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    
    // Set headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Auto-attach JWT if available
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Build error object
        const error = new Error(data.error || 'Request failed');
        error.status = response.status;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Authentication Endpoints
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data.user;
  },

  async register(username, email, password) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    this.setToken(data.token);
    return data.user;
  },

  async getMe() {
    if (!this.getToken()) return null;
    try {
      const data = await this.request('/auth/me');
      return data.user;
    } catch (err) {
      // Token is likely invalid/expired
      this.logout();
      return null;
    }
  },

  logout() {
    this.setToken(null);
  },

  // Product Endpoints
  async getProducts(category = '', search = '') {
    let query = '';
    const params = [];
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    
    if (params.length > 0) {
      query = `?${params.join('&')}`;
    }
    return this.request(`/products${query}`);
  },

  async getProduct(id) {
    return this.request(`/products/${id}`);
  },

  // Cart Endpoints
  async getCart() {
    return this.request('/cart');
  },

  async addToCart(productId, quantity = 1) {
    return this.request('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
  },

  async updateCartItem(productId, quantity) {
    return this.request('/cart/update', {
      method: 'PUT',
      body: JSON.stringify({ productId, quantity }),
    });
  },

  async removeFromCart(productId) {
    return this.request('/cart/remove', {
      method: 'DELETE',
      body: JSON.stringify({ productId }),
    });
  },

  // Order Endpoints
  async checkout(shippingAddress) {
    return this.request('/orders/checkout', {
      method: 'POST',
      body: JSON.stringify({ shippingAddress }),
    });
  },

  async getOrders() {
    return this.request('/orders');
  }
};
