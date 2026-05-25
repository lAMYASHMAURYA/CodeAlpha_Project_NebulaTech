const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./database');
const { authenticateToken } = require('./middleware/auth');

// Controllers
const authController = require('./controllers/authController');
const productController = require('./controllers/productController');
const cartController = require('./controllers/cartController');
const orderController = require('./controllers/orderController');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// --- API ROUTES ---

// Auth Router
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);
app.get('/api/auth/me', authenticateToken, authController.getMe);

// Product Router
app.get('/api/products', productController.getAllProducts);
app.get('/api/products/:id', productController.getProductById);

// Cart Router (All require auth)
app.get('/api/cart', authenticateToken, cartController.getCart);
app.post('/api/cart/add', authenticateToken, cartController.addToCart);
app.put('/api/cart/update', authenticateToken, cartController.updateCartItem);
app.delete('/api/cart/remove', authenticateToken, cartController.removeFromCart);

// Order Router (All require auth)
app.post('/api/orders/checkout', authenticateToken, orderController.checkout);
app.get('/api/orders', authenticateToken, orderController.getOrders);

// Fallback to index.html for SPA hash routing compatibility
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database and start listening
async function startServer() {
  try {
    console.log('Connecting to SQLite database...');
    await initDatabase();
    console.log('Database initialized successfully.');

    app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(`  E-Commerce Fullstack Server Running!`);
      console.log(`  Local URL: http://localhost:${PORT}`);
      console.log(`==================================================`);
    });
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

startServer();
