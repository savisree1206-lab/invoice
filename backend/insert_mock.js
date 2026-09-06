const db = require('./db');
(async () => {
  try {
    await db.query("INSERT INTO components (name, category, price, stock, description) VALUES ('NodeMCU ESP8266', 'Electronics', 5.50, 50, 'Wi-Fi microcontroller module')");
    console.log('Mock component added.');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
