const { getDb } = require('../database');

async function checkout(req, res) {
  const userId = req.user.id;
  const { shippingAddress } = req.body;

  if (!shippingAddress) {
    return res.status(400).json({ error: 'Shipping address is required.' });
  }

  const db = await getDb();

  try {
    // Start SQLite Transaction
    await db.run('BEGIN TRANSACTION');

    // 1. Fetch current cart items with product details
    const cartItems = await db.all(
      `SELECT c.product_id, c.quantity, p.name, p.price, p.stock 
       FROM cart_items c 
       JOIN products p ON c.product_id = p.id 
       WHERE c.user_id = ?`,
      [userId]
    );

    if (cartItems.length === 0) {
      await db.run('ROLLBACK');
      return res.status(400).json({ error: 'Your shopping cart is empty.' });
    }

    // 2. Validate stock for all items
    let totalPrice = 0;
    for (const item of cartItems) {
      if (item.quantity > item.stock) {
        await db.run('ROLLBACK');
        return res.status(400).json({ 
          error: `Insufficient stock for product '${item.name}'. Only ${item.stock} left, but you have ${item.quantity} in cart.` 
        });
      }
      totalPrice += item.price * item.quantity;
    }

    // 3. Create the Order
    const orderResult = await db.run(
      `INSERT INTO orders (user_id, total_price, status, shipping_address) 
       VALUES (?, ?, 'Paid', ?)`,
      [userId, totalPrice, shippingAddress]
    );

    const orderId = orderResult.lastID;

    // 4. Create Order Items & Decrement Product Stock
    for (const item of cartItems) {
      // Insert order item
      await db.run(
        `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) 
         VALUES (?, ?, ?, ?)`,
        [orderId, item.product_id, item.quantity, item.price]
      );

      // Decrement stock
      await db.run(
        `UPDATE products SET stock = stock - ? WHERE id = ?`,
        [item.quantity, item.product_id]
      );
    }

    // 5. Clear User's Cart
    await db.run('DELETE FROM cart_items WHERE user_id = ?', [userId]);

    // Commit Transaction
    await db.run('COMMIT');

    res.status(201).json({
      message: 'Order placed successfully.',
      orderId,
      totalPrice,
      status: 'Paid'
    });
  } catch (error) {
    // Rollback transaction on failure
    try {
      await db.run('ROLLBACK');
    } catch (rbError) {
      console.error('Rollback error:', rbError);
    }
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Transaction failed during checkout processing.' });
  }
}

async function getOrders(req, res) {
  try {
    const userId = req.user.id;
    const db = await getDb();

    // Fetch all orders with their items in a single query
    const rows = await db.all(
      `SELECT o.id AS order_id, o.total_price, o.status, o.shipping_address, o.created_at,
              oi.id AS item_id, oi.product_id, oi.quantity, oi.price_at_purchase,
              p.name AS product_name, p.image_url
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.user_id = ?
       ORDER BY o.id DESC`,
      [userId]
    );

    // Group the rows by order ID
    const ordersMap = {};
    for (const row of rows) {
      const orderId = row.order_id;
      if (!ordersMap[orderId]) {
        ordersMap[orderId] = {
          id: orderId,
          totalPrice: row.total_price,
          status: row.status,
          shippingAddress: row.shipping_address,
          createdAt: row.created_at,
          items: []
        };
      }
      
      // If there is an item associated with this order (LEFT JOIN condition)
      if (row.item_id) {
        ordersMap[orderId].items.push({
          itemId: row.item_id,
          productId: row.product_id,
          productName: row.product_name,
          imageUrl: row.image_url,
          quantity: row.quantity,
          priceAtPurchase: row.price_at_purchase
        });
      }
    }

    // Convert map to sorted array
    const orders = Object.values(ordersMap).sort((a, b) => b.id - a.id);

    res.json({ orders });
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ error: 'Failed to retrieve order history.' });
  }
}

module.exports = {
  checkout,
  getOrders
};
