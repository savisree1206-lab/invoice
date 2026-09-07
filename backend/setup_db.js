const mysql = require('mysql2/promise');
require('dotenv').config();

function getLocalDatePrefix(date) {
  const d = date ? new Date(date) : new Date();
  const ist = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [year, month, day] = ist.split('-');
  return `INV-${year}${month}${day}`;
}

async function setupDatabase() {
  let connection;
  const dbName = process.env.DB_NAME || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'infinite_services_db';
  const connConfig = {
    host: process.env.DB_HOST || process.env.MYSQLHOST || process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT || process.env.MYSQL_PORT) || 3306,
    user: process.env.DB_USER || process.env.MYSQLUSER || process.env.MYSQL_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || ''
  };

  try {
    // Try connecting directly with database name first (standard on Railway/cloud)
    try {
      connection = await mysql.createConnection({ ...connConfig, database: dbName });
      console.log(`[DB Setup] Connected directly to database: ${dbName}`);
    } catch (directErr) {
      // If direct connect failed (e.g. database not created yet on localhost), connect without database and create it
      console.log(`[DB Setup] Direct connection to ${dbName} failed (${directErr.message}), connecting to server root...`);
      connection = await mysql.createConnection(connConfig);
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      await connection.query(`USE \`${dbName}\``);
      console.log(`[DB Setup] Created and switched to database: ${dbName}`);
    }

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
        invoice_number VARCHAR(50),
        customer_name VARCHAR(255) NOT NULL,
        customer_contact VARCHAR(50),
        discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        total_amount DECIMAL(10, 2) NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure invoice_number column exists
    const [invCols] = await connection.query("SHOW COLUMNS FROM invoices LIKE 'invoice_number'");
    if (invCols.length === 0) {
      console.log('[DB Setup] Adding invoice_number column to invoices table...');
      await connection.query("ALTER TABLE invoices ADD COLUMN invoice_number VARCHAR(50) AFTER id");
    }

    // Normalize and ensure all invoices strictly follow the daily sequence starting at 001 for each date
    const [allInvoices] = await connection.query("SELECT id, date FROM invoices ORDER BY date ASC, id ASC");
    if (allInvoices.length > 0) {
      console.log(`[DB Setup] Normalizing daily sequential invoice numbers for ${allInvoices.length} invoices...`);
      const dateCounters = {};
      for (const row of allInvoices) {
        const prefix = getLocalDatePrefix(row.date);
        dateCounters[prefix] = (dateCounters[prefix] || 0) + 1;
        const invNum = `${prefix}${String(dateCounters[prefix]).padStart(3, '0')}`;
        await connection.query("UPDATE invoices SET invoice_number = ? WHERE id = ?", [invNum, row.id]);
        console.log(`[DB Setup] Set invoice #${row.id} to ${invNum}`);
      }
    }

    // Ensure unique index on invoice_number
    try {
      await connection.query("ALTER TABLE invoices ADD UNIQUE KEY uq_invoice_number (invoice_number)");
    } catch (e) {
      // index already exists or non-fatal
    }

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

