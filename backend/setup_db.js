const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('Connected to MySQL server.');

    const schema = fs.readFileSync('schema.sql', 'utf8');
    // Split by semicolons for multiple statements
    const statements = schema.split(';').filter(stmt => stmt.trim() !== '');

    for (let stmt of statements) {
      if (stmt.trim()) {
        await connection.query(stmt);
      }
    }

    console.log('Database and tables created successfully.');
    
    // Also insert the mock data since we are here
    await connection.query("USE infinite_services_db");
    await connection.query("INSERT INTO components (name, category, price, stock, description) VALUES ('NodeMCU ESP8266', 'Electronics', 5.50, 50, 'Wi-Fi microcontroller module')");
    console.log('Mock component added.');

    await connection.end();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
})();
