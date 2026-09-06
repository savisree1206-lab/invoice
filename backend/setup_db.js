const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  let connection;
  try {
    // Connect WITHOUT specifying a database first (Railway requires this)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    const dbName = process.env.DB_NAME || 'infinite_services_db';
    console.log(`[DB Setup] Connected. Setting up database: ${dbName}`);

    // Create DB if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await connection.query(`USE \`${dbName}\``);

    // Create tables if not exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS components (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code_number VARCHAR(50),
        name VARCHAR(255) NOT NULL,
        category ENUM('Electronics', 'Web Development', 'Scrap') NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        description TEXT
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_contact VARCHAR(50),
        discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(10, 2) NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invoice_id INT NOT NULL,
        component_id INT,
        description VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE SET NULL
      )
    `);

    // Seed initial data using INSERT IGNORE (safe to run multiple times)
    await connection.query(`
      INSERT IGNORE INTO components (id, name, category, price, stock, description) VALUES
      (1, 'Soldering Iron 60W',    'Electronics',     15.00, 20, 'Adjustable temperature soldering iron'),
      (2, 'NodeMCU ESP8266',       'Electronics',      5.50, 50, 'WiFi enabled microcontroller'),
      (3, 'Basic Website Package', 'Web Development', 150.00,  1, 'Simple single page application'),
      (4, 'Custom Robot Chassis',  'Scrap',           45.00,  5, 'Built from recycled printer parts')
    `);

    console.log('[DB Setup] ✅ Database, tables, and seed data ready.');
    await connection.end();
  } catch (err) {
    console.error('[DB Setup] ❌ Error:', err.message);
    if (connection) await connection.end().catch(() => {});
    throw err;
  }
}

// Allow running directly: node backend/setup_db.js
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = setupDatabase;

