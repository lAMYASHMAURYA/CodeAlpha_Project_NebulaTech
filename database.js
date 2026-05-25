const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
let db = null;

async function getDb() {
  if (db) return db;
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });
  return db;
}

async function initDatabase() {
  const database = await getDb();

  // Create Users Table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Products Table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      image_url TEXT NOT NULL,
      category TEXT NOT NULL,
      stock INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Cart Items Table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
      UNIQUE(user_id, product_id)
    )
  `);

  // Create Orders Table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total_price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      shipping_address TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Create Order Items Table
  await database.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price_at_purchase REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE RESTRICT
    )
  `);

  // Seed Products if table is empty
  const countResult = await database.get('SELECT COUNT(*) as count FROM products');
  if (countResult.count === 0) {
    const seedProducts = [
      {
        name: "Neon Aura Cyberpunk Headset",
        description: "Immerse yourself in virtual worlds with high-fidelity 3D spatial audio, active hybrid noise canceling (ANC), and premium customizable RGB aesthetics. Features cooling gel-infused ear cushions for long gaming sessions.",
        price: 189.99,
        image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80",
        category: "Audio",
        stock: 15
      },
      {
        name: "Chrono V3 Smart Watch",
        description: "A premium smartwatch with an edge-to-edge AMOLED display. Monitors continuous heart rate, blood oxygen levels, Sleep stages, and 120+ workout modes. Up to 10 days of battery life.",
        price: 249.99,
        image_url: "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=600&q=80",
        category: "Wearables",
        stock: 25
      },
      {
        name: "Orion Mechanical Keyboard",
        description: "Gasket-mounted 75% mechanical keyboard designed for enthusiasts. Equipped with pre-lubed linear switches, hot-swappable sockets, double-shot PBT keycaps, and a rotary encoder knob.",
        price: 145.00,
        image_url: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=600&q=80",
        category: "Peripherals",
        stock: 8
      },
      {
        name: "Spectral LED Desk Lamp",
        description: "Smart ambient desk lamp featuring tunable color temperatures from warm golden glow to cool task light. Integrates with smart home systems and includes a built-in 15W Qi wireless charger.",
        price: 69.50,
        image_url: "https://images.unsplash.com/photo-1534073828943-f801091bb18c?auto=format&fit=crop&w=600&q=80",
        category: "Office",
        stock: 30
      },
      {
        name: "Helix Ergonomic Mouse",
        description: "Advanced vertical mouse scientifically engineered to reduce muscle strain. Features high-precision 4000 DPI sensor, customizable shortcut buttons, and dual-mode Bluetooth/wireless connectivity.",
        price: 89.99,
        image_url: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=600&q=80",
        category: "Peripherals",
        stock: 20
      },
      {
        name: "Zenith Wireless Charger",
        description: "Fast charging multi-device dock crafted from solid walnut and brushed aluminum. Powers your phone, watch, and earbuds simultaneously with neat cable routing.",
        price: 110.00,
        image_url: "https://images.unsplash.com/photo-1622445262465-2481c4574875?auto=format&fit=crop&w=600&q=80",
        category: "Office",
        stock: 12
      },
      {
        name: "Aura Smart Diffuser",
        description: "Ultrasonic essential oil diffuser that doubles as a mood lamp. Set schedules, adjust mist intensity, and choose from 16 million colors via web or app control.",
        price: 55.00,
        image_url: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=600&q=80",
        category: "Office",
        stock: 18
      }
    ];

    for (const product of seedProducts) {
      await database.run(
        `INSERT INTO products (name, description, price, image_url, category, stock) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [product.name, product.description, product.price, product.image_url, product.category, product.stock]
      );
    }
    console.log("Seeded database with default products.");
  }
}

module.exports = {
  getDb,
  initDatabase
};
