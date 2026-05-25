const { getDb } = require('../database');

async function getAllProducts(req, res) {
  try {
    const { category, search } = req.query;
    const db = await getDb();

    let sql = 'SELECT * FROM products';
    const params = [];

    const conditions = [];
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (search) {
      conditions.push('(name LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Add ordering to show recently created/added items first
    sql += ' ORDER BY id DESC';

    const products = await db.all(sql, params);
    res.json({ products });
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({ error: 'Failed to retrieve products.' });
  }
}

async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const db = await getDb();

    const product = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Fetch product detail error:', error);
    res.status(500).json({ error: 'Failed to retrieve product details.' });
  }
}

module.exports = {
  getAllProducts,
  getProductById
};
