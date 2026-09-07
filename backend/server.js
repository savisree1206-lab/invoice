const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const setupDatabase = require('./setup_db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    server: 'running',
    timestamp: new Date().toISOString(),
    db: process.env.DB_NAME || 'infinite_services_db'
  });
});

// --- Components API ---

// Get all components
app.get('/api/components', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM components');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch components' });
  }
});

// Add a new component
app.post('/api/components', async (req, res) => {
  const { name, category, price, stock, description, code_number } = req.body;
  if (!name || !category || price === undefined || price === null) {
    return res.status(400).json({ error: 'Name, category, and price are required' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO components (code_number, name, category, price, stock, description) VALUES (?, ?, ?, ?, ?, ?)',
      [code_number || '', name, category, price, stock || 0, description || '']
    );
    res.status(201).json({ id: result.insertId, message: 'Component added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add component' });
  }
});

// Update component stock
app.patch('/api/components/:id/stock', async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  try {
    await db.query('UPDATE components SET stock = ? WHERE id = ?', [stock, id]);
    res.json({ message: 'Stock updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Update a component (full edit)
app.put('/api/components/:id', async (req, res) => {
  const { id } = req.params;
  const { code_number, name, category, price, stock, description } = req.body;
  if (!name || !category || price === undefined || price === null) {
    return res.status(400).json({ error: 'Name, category, and price are required' });
  }
  try {
    await db.query(
      'UPDATE components SET code_number=?, name=?, category=?, price=?, stock=?, description=? WHERE id=?',
      [code_number || '', name, category, price, stock || 0, description || '', id]
    );
    res.json({ message: 'Component updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update component' });
  }
});

// Delete a component
app.delete('/api/components/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM components WHERE id = ?', [id]);
    res.json({ message: 'Component deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete component' });
  }
});


// --- Invoices API ---

// Create a new invoice
// Helper to resolve local date prefix: INV-YYYYMMDD
function getLocalDatePrefix(date, clientDate) {
  if (clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)) {
    const [y, m, d] = clientDate.split('-');
    return `INV-${y}${m}${d}`;
  }
  const d = date ? new Date(date) : new Date();
  const ist = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [year, month, day] = ist.split('-');
  return `INV-${year}${month}${day}`;
}

// Helper to generate sequential daily invoice number (resets to 001 for each date)
async function generateDailyInvoiceNumber(connection, date, clientDate) {
  const prefix = getLocalDatePrefix(date, clientDate);

  // Find the highest sequence number for this specific date prefix
  const [rows] = await connection.query(
    'SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY LENGTH(invoice_number) DESC, invoice_number DESC LIMIT 1 FOR UPDATE',
    [`${prefix}%`]
  );

  let nextSeq = 1;
  if (rows.length > 0 && rows[0].invoice_number) {
    const numPart = rows[0].invoice_number.slice(prefix.length);
    const parsed = parseInt(numPart, 10);
    if (!isNaN(parsed)) {
      nextSeq = parsed + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

// Helper fallback for formatInvoiceNumber
function formatInvoiceNumber(invoice) {
  if (invoice && invoice.invoice_number) {
    return invoice.invoice_number;
  }
  const prefix = getLocalDatePrefix(invoice && invoice.date);
  const sno = String((invoice && invoice.id) || 1).padStart(3, '0');
  return `${prefix}${sno}`;
}

// Create a new invoice
app.post('/api/invoices', async (req, res) => {
  const { customer_name, customer_contact, total_amount, discount, items, date, client_date } = req.body;
  
  if (!customer_name || total_amount === undefined || total_amount === null || !items || items.length === 0) {
    return res.status(400).json({ error: 'Invalid invoice data' });
  }

  const discountAmount = parseFloat(discount) || 0;
  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Validate stock before inserting
    for (const item of items) {
      if (item.component_id) {
        const [[comp]] = await connection.query('SELECT stock FROM components WHERE id = ? FOR UPDATE', [item.component_id]);
        if (!comp) {
          await connection.rollback();
          return res.status(400).json({ error: `Component ID ${item.component_id} not found` });
        }
        if (comp.stock < item.quantity) {
          await connection.rollback();
          return res.status(400).json({ error: `Insufficient stock for item: ${item.description}. Available: ${comp.stock}` });
        }
      }
    }

    // Generate daily invoice number (resets to 001 for each date)
    const invoiceDate = date ? new Date(date) : new Date();
    const invoiceNumber = await generateDailyInvoiceNumber(connection, invoiceDate, client_date);

    // Insert invoice with generated invoice_number
    const [invoiceResult] = await connection.query(
      'INSERT INTO invoices (invoice_number, customer_name, customer_contact, discount, total_amount, date) VALUES (?, ?, ?, ?, ?, ?)',
      [invoiceNumber, customer_name, customer_contact || '', discountAmount, total_amount, invoiceDate]
    );
    const invoiceId = invoiceResult.insertId;

    // Insert items and deduct stock
    for (const item of items) {
      await connection.query(
        'INSERT INTO invoice_items (invoice_id, component_id, description, quantity, price) VALUES (?, ?, ?, ?, ?)',
        [invoiceId, item.component_id, item.description, item.quantity, item.price]
      );

      // Deduct stock
      if (item.component_id) {
        await connection.query(
          'UPDATE components SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.component_id]
        );
      }
    }

    await connection.commit();

    res.status(201).json({ id: invoiceId, invoice_number: invoiceNumber, message: 'Invoice created successfully' });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to create invoice' });
  } finally {
    if (connection) connection.release();
  }
});

// Get all invoices
app.get('/api/invoices', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM invoices ORDER BY date DESC, id DESC');
    const formatted = rows.map(r => ({
      ...r,
      invoice_number: r.invoice_number || formatInvoiceNumber(r)
    }));
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get a single invoice with its items
app.get('/api/invoices/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [[invoice]] = await db.query('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const [items] = await db.query(
      'SELECT ii.*, c.name AS component_name FROM invoice_items ii LEFT JOIN components c ON ii.component_id = c.id WHERE ii.invoice_id = ?',
      [id]
    );
    res.json({
      ...invoice,
      invoice_number: invoice.invoice_number || formatInvoiceNumber(invoice),
      items
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Delete an invoice (and restore component stock)
app.delete('/api/invoices/:id', async (req, res) => {
  const { id } = req.params;
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Check if invoice exists
    const [[invoice]] = await connection.query('SELECT * FROM invoices WHERE id = ? FOR UPDATE', [id]);
    if (!invoice) {
      await connection.rollback();
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Restore stock for components in this invoice
    const [items] = await connection.query('SELECT component_id, quantity FROM invoice_items WHERE invoice_id = ?', [id]);
    for (const item of items) {
      if (item.component_id) {
        await connection.query(
          'UPDATE components SET stock = stock + ? WHERE id = ?',
          [item.quantity, item.component_id]
        );
      }
    }

    // Delete invoice (invoice_items will be deleted automatically via ON DELETE CASCADE)
    await connection.query('DELETE FROM invoices WHERE id = ?', [id]);

    await connection.commit();
    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to delete invoice' });
  } finally {
    if (connection) connection.release();
  }
});

// Direct schema check using the active db connection pool
async function ensureDatabaseSchema() {
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM invoices LIKE 'invoice_number'");
    if (cols.length === 0) {
      console.log('[DB] Adding invoice_number column to invoices table...');
      await db.query("ALTER TABLE invoices ADD COLUMN invoice_number VARCHAR(50) AFTER id");
    }

    // Normalize daily sequence for all invoices so every date starts from 001
    const [allInvoices] = await db.query("SELECT id, date FROM invoices ORDER BY date ASC, id ASC");
    if (allInvoices.length > 0) {
      console.log(`[DB] Normalizing daily sequence for ${allInvoices.length} invoices...`);
      const dateCounters = {};
      for (const row of allInvoices) {
        const prefix = getLocalDatePrefix(row.date);
        dateCounters[prefix] = (dateCounters[prefix] || 0) + 1;
        const invNum = `${prefix}${String(dateCounters[prefix]).padStart(3, '0')}`;
        await db.query("UPDATE invoices SET invoice_number = ? WHERE id = ?", [invNum, row.id]);
      }
      console.log('[DB] Invoices normalized successfully.');
    }

    try {
      await db.query("ALTER TABLE invoices ADD UNIQUE KEY uq_invoice_number (invoice_number)");
    } catch (e) {}
  } catch (err) {
    console.error('[DB] Schema check note:', err.message);
  }
}

// --- Serve Frontend (Production) ---
app.use(express.static(path.join(__dirname, '../frontend/dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

app.get('/{*path}', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Start server immediately so cloud platforms (Railway, Render, etc.) pass startup health checks
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  ensureDatabaseSchema();
});

// Non-blocking database check/initialization
setupDatabase()
  .then(() => {
    console.log('[DB Setup] Database check and initialization completed successfully.');
  })
  .catch((err) => {
    console.warn('[DB Setup] Note: Database setup warning (tables may already exist):', err.message);
  });
