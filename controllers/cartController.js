const { getDb } = require('../database');

async function getCart(req, res) {
  try {
    const userId = req.user.id;
    const db = await getDb();

    // Query cart items joined with product info
    const cartItems = await db.all(
      `SELECT c.product_id, c.quantity, p.name, p.price, p.image_url, p.category, p.stock 
       FROM cart_items c 
       JOIN products p ON c.product_id = p.id 
       WHERE c.user_id = ?`,
      [userId]
    );

    res.json({ cart: cartItems });
  } catch (error) {
    console.error('Fetch cart error:', error);
    res.status(500).json({ error: 'Failed to retrieve shopping cart.' });
  }
}

async function addToCart(req, res) {
  try {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required.' });
    }

    const db = await getDb();

    // Check if product exists and check its stock
    const product = await db.get('SELECT stock, name FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Check if already in cart
    const existingItem = await db.get(
      'SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    const targetQuantity = existingItem ? (existingItem.quantity + quantity) : quantity;

    if (targetQuantity > product.stock) {
      return res.status(400).json({ 
        error: `Cannot add more. Only ${product.stock} units of '${product.name}' are available.` 
      });
    }

    if (existingItem) {
      // Update quantity
      await db.run(
        'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?',
        [targetQuantity, userId, productId]
      );
    } else {
      // Insert new cart item
      await db.run(
        'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [userId, productId, targetQuantity]
      );
    }

    res.json({ message: 'Product added to cart successfully.', productId, quantity: targetQuantity });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: 'Failed to add product to cart.' });
  }
}

async function updateCartItem(req, res) {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined) {
      return res.status(400).json({ error: 'Product ID and quantity are required.' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be at least 1. To remove, use remove API.' });
    }

    const db = await getDb();

    // Validate product stock
    const product = await db.get('SELECT stock, name FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    if (quantity > product.stock) {
      return res.status(400).json({ 
        error: `Only ${product.stock} units of '${product.name}' are available in stock.` 
      });
    }

    // Update
    const result = await db.run(
      'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?',
      [quantity, userId, productId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Product is not in the cart.' });
    }

    res.json({ message: 'Cart updated successfully.', productId, quantity });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ error: 'Failed to update cart item.' });
  }
}

async function removeFromCart(req, res) {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required.' });
    }

    const db = await getDb();

    const result = await db.run(
      'DELETE FROM cart_items WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Product is not in the cart.' });
    }

    res.json({ message: 'Product removed from cart successfully.', productId });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: 'Failed to remove product from cart.' });
  }
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart
};
