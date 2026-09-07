const mysql = require('mysql2');
require('dotenv').config();

const config = process.env.MYSQL_URL || process.env.DATABASE_URL
  ? { uri: process.env.MYSQL_URL || process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || process.env.MYSQLHOST || process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || process.env.MYSQLPORT || process.env.MYSQL_PORT) || 3306,
      user: process.env.DB_USER || process.env.MYSQLUSER || process.env.MYSQL_USER || 'root',
      password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '',
      database: process.env.DB_NAME || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'infinite_services_db',
    };

// Create a connection pool to the database
const pool = mysql.createPool({
  ...config,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Promise wrapper for the pool
const promisePool = pool.promise();

module.exports = promisePool;
