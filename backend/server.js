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
app.post('/api/invoices', async (req, res) => {
  const { customer_name, customer_contact, total_amount, discount, items } = req.body;
  
  if (!customer_name || total_amount === undefined || total_amount === null || !items || items.length === 0) {
    return res.status(400).json({ error: 'Invalid invoice data' });
  }

  const discountAmount = parseFloat(discount) || 0;

  try {
    // Start transaction if possible, but for simplicity we'll just do sequential queries
    const [invoiceResult] = await db.query(
      'INSERT INTO invoices (customer_name, customer_contact, discount, total_amount) VALUES (?, ?, ?, ?)',
      [customer_name, customer_contact || '', discountAmount, total_amount]
    );
    const invoiceId = invoiceResult.insertId;

    // Validate stock before inserting
    for (const item of items) {
      if (item.component_id) {
        const [[comp]] = await db.query('SELECT stock FROM components WHERE id = ?', [item.component_id]);
        if (!comp) {
          return res.status(400).json({ error: `Component ID ${item.component_id} not found` });
        }
        if (comp.stock < item.quantity) {
          return res.status(400).json({ error: `Insufficient stock for item: ${item.description}. Available: ${comp.stock}` });
        }
      }
    }

    // Insert items
    for (const item of items) {
      await db.query(
        'INSERT INTO invoice_items (invoice_id, component_id, description, quantity, price) VALUES (?, ?, ?, ?, ?)',
        [invoiceId, item.component_id, item.description, item.quantity, item.price]
      );

      // Deduct stock only after validation passed
      if (item.component_id) {
        await db.query(
          'UPDATE components SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.component_id]
        );
      }
    }

    // Helper to format invoice numbers: INV-YYYYMMDDxxx (e.g., INV-20260906001)
    const formatInvoiceNumber = (id, date) => {
      const d = date ? new Date(date) : new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const sno = String(id || 1).padStart(3, '0');
      return `INV-${year}${month}${day}${sno}`;
    };

    const invoiceNumber = formatInvoiceNumber(invoiceId, new Date());
    res.status(201).json({ id: invoiceId, invoice_number: invoiceNumber, message: 'Invoice created successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Helper for formatInvoiceNumber
function formatInvoiceNumber(id, date) {
  const d = date ? new Date(date) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const sno = String(id || 1).padStart(3, '0');
  return `INV-${year}${month}${day}${sno}`;
}

// Get all invoices
app.get('/api/invoices', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM invoices ORDER BY date DESC');
    const formatted = rows.map(r => ({
      ...r,
      invoice_number: formatInvoiceNumber(r.id, r.date)
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
      invoice_number: formatInvoiceNumber(invoice.id, invoice.date),
      items
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// --- Serve Frontend (Production) ---
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Start server immediately so cloud platforms (Railway, Render, etc.) pass startup health checks
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Non-blocking database check/initialization
setupDatabase()
  .then(() => {
    console.log('[DB Setup] Database check and initialization completed successfully.');
  })
  .catch((err) => {
    console.warn('[DB Setup] Note: Database setup warning (tables may already exist):', err.message);
  });
