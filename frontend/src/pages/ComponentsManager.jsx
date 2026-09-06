import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Check, X } from 'lucide-react';

const EMPTY_FORM = { code_number: '', name: '', category: 'Electronics', price: '', stock: '', description: '' };

const ComponentsManager = () => {
  const [components, setComponents] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(EMPTY_FORM);

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState(null);

  const fetchComponents = async () => {
    try {
      const res = await fetch('/api/components');
      const data = await res.json();
      if (Array.isArray(data)) setComponents(data);
    } catch (err) {
      console.error('Failed to fetch components:', err);
    }
  };

  useEffect(() => { fetchComponents(); }, []);

  // ── Add new component ──────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock) || 0
        })
      });
      if (res.ok) {
        setIsAdding(false);
        setFormData(EMPTY_FORM);
        fetchComponents();
      } else {
        alert('Failed to add component');
      }
    } catch (err) {
      console.error(err);
      alert('Error adding component');
    }
  };

  // ── Start editing a row ────────────────────────────────────
  const startEdit = (comp) => {
    setEditingId(comp.id);
    setEditData({
      code_number: comp.code_number || '',
      name: comp.name,
      category: comp.category,
      price: comp.price,
      stock: comp.stock,
      description: comp.description || ''
    });
    setDeletingId(null);
  };

  const cancelEdit = () => { setEditingId(null); setEditData(EMPTY_FORM); };

  const saveEdit = async (id) => {
    if (!editData.name || !editData.category || !editData.price) {
      alert('Name, category, and price are required');
      return;
    }
    try {
      const res = await fetch(`/api/components/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editData,
          price: parseFloat(editData.price),
          stock: parseInt(editData.stock) || 0
        })
      });
      if (res.ok) {
        cancelEdit();
        fetchComponents();
      } else {
        alert('Failed to update component');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating component');
    }
  };

  // ── Delete ─────────────────────────────────────────────────
  const confirmDelete = (id) => { setDeletingId(id); setEditingId(null); };
  const cancelDelete = () => setDeletingId(null);

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/components/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingId(null);
        fetchComponents();
      } else {
        alert('Failed to delete component');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting component');
    }
  };

  const filtered = components.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.code_number || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Shared input style for inline edit cells ───────────────
  const cellInput = (value, onChange, type = 'text', extra = {}) => (
    <input
      type={type}
      value={value}
      onChange={onChange}
      className="w-full bg-white/5 border border-white/20 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-primary/60 text-white"
      {...extra}
    />
  );

  return (
    <div className="h-full flex flex-col">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold font-display mb-2">Components & Services</h2>
          <p className="text-gray-400">Manage your inventory and service offerings.</p>
        </div>
        <button
          onClick={() => { setIsAdding(!isAdding); setEditingId(null); setDeletingId(null); }}
          className="btn-primary flex items-center"
        >
          {isAdding ? 'Cancel' : <><Plus size={20} className="mr-2" />Add Item</>}
        </button>
      </div>

      {/* ── Add Form ── */}
      {isAdding && (
        <div className="glass-panel p-6 mb-8 animate-in fade-in slide-in-from-top-4">
          <h3 className="text-xl font-bold font-display mb-6">Add New Item</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Code Number</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. IS-001, ESP-8266"
                value={formData.code_number}
                onChange={e => setFormData({ ...formData, code_number: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Name / Title</label>
              <input
                required
                type="text"
                className="input-field"
                placeholder="e.g. Ultrasonic Sensor"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
              <select
                className="input-field appearance-none"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Electronics">Electronics</option>
                <option value="Web Development">Web Development</option>
                <option value="Scrap">Scrap Innovation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Price (₹)</label>
              <input
                required
                type="number"
                step="0.01"
                className="input-field"
                placeholder="0.00"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Initial Stock</label>
              <input
                required
                type="number"
                className="input-field"
                placeholder="0"
                value={formData.stock}
                onChange={e => setFormData({ ...formData, stock: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Description</label>
              <input
                type="text"
                className="input-field"
                placeholder="Item details..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="btn-primary">Save Item</button>
            </div>
          </form>
        </div>
      )}

      {/* ── Table ── */}
      <div className="glass-panel flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or code..."
              className="input-field pl-10 py-1.5 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <span className="text-sm text-gray-500">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="overflow-auto flex-1 p-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-sm text-gray-400">
                <th className="p-4 font-medium">Code</th>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Category</th>
                <th className="p-4 font-medium">Price</th>
                <th className="p-4 font-medium">Stock</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(comp => {
                const isEditing = editingId === comp.id;
                const isDeleting = deletingId === comp.id;

                if (isDeleting) {
                  return (
                    <tr key={comp.id} style={{ background: 'rgba(239,68,68,0.06)', borderLeft: '3px solid rgba(239,68,68,0.5)' }}>
                      <td colSpan={5} className="p-4">
                        <span className="text-red-400 font-semibold text-sm">Delete </span>
                        <span className="text-white font-bold text-sm">"{comp.name}"</span>
                        <span className="text-gray-400 text-sm">? This cannot be undone.</span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={cancelDelete}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                          >
                            <X size={13} /> Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(comp.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171' }}
                          >
                            <Trash2 size={13} /> Confirm Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                if (isEditing) {
                  return (
                    <tr key={comp.id} style={{ background: 'rgba(201,168,76,0.05)', borderLeft: '3px solid rgba(201,168,76,0.5)' }}>
                      <td className="p-3 w-28">
                        {cellInput(editData.code_number, e => setEditData({ ...editData, code_number: e.target.value }), 'text', { placeholder: 'Code' })}
                      </td>
                      <td className="p-3">
                        {cellInput(editData.name, e => setEditData({ ...editData, name: e.target.value }), 'text', { placeholder: 'Name', required: true })}
                      </td>
                      <td className="p-3 w-40">
                        <select
                          value={editData.category}
                          onChange={e => setEditData({ ...editData, category: e.target.value })}
                          className="w-full bg-white/5 border border-white/20 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-primary/60 text-white appearance-none"
                        >
                          <option value="Electronics">Electronics</option>
                          <option value="Web Development">Web Development</option>
                          <option value="Scrap">Scrap Innovation</option>
                        </select>
                      </td>
                      <td className="p-3 w-28">
                        {cellInput(editData.price, e => setEditData({ ...editData, price: e.target.value }), 'number', { placeholder: '0.00', step: '0.01' })}
                      </td>
                      <td className="p-3 w-24">
                        {cellInput(editData.stock, e => setEditData({ ...editData, stock: e.target.value }), 'number', { placeholder: '0' })}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={cancelEdit}
                            title="Cancel"
                            className="p-1.5 rounded-lg transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                          >
                            <X size={16} />
                          </button>
                          <button
                            onClick={() => saveEdit(comp.id)}
                            title="Save"
                            className="p-1.5 rounded-lg transition-all"
                            style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                // Normal row
                return (
                  <tr key={comp.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-4">
                      {comp.code_number
                        ? <span className="font-mono text-xs px-2 py-1 rounded" style={{ background: 'rgba(201,168,76,0.12)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.25)', letterSpacing: '0.05em' }}>{comp.code_number}</span>
                        : <span className="text-gray-600 text-xs">—</span>
                      }
                    </td>
                    <td className="p-4 font-medium">{comp.name}</td>
                    <td className="p-4">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300">
                        {comp.category}
                      </span>
                    </td>
                    <td className="p-4 text-green-400 font-medium">₹{Number(comp.price).toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${comp.stock > 5 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {comp.stock} units
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(comp)}
                          title="Edit"
                          className="p-1.5 hover:bg-blue-500/15 rounded-md text-blue-400 transition-colors border border-transparent hover:border-blue-500/30"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => confirmDelete(comp.id)}
                          title="Delete"
                          className="p-1.5 hover:bg-red-500/15 rounded-md text-red-400 transition-colors border border-transparent hover:border-red-500/30"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500 text-sm">
                    No components found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ComponentsManager;
