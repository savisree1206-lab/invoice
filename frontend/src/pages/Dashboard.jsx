import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Package, Receipt, TrendingUp, AlertTriangle, ArrowUpRight, Eye, Printer, Trash2, X, AlertCircle, CheckCircle } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, iconColor, delay = 0 }) => {
  const cardRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      el.style.transform = `rotateX(${-y * 5}deg) rotateY(${x * 5}deg) translateZ(10px)`;
    };
    const onLeave = () => { el.style.transform = ''; };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
  }, []);

  return (
    <div
      ref={cardRef}
      className="glass-panel p-6 relative overflow-hidden group"
      style={{
        animationDelay: `${delay}ms`,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.15s ease, box-shadow 0.3s ease, border-color 0.3s ease'
      }}
    >
      {/* Gold corner accent */}
      <div className="absolute top-0 right-0 w-24 h-24 opacity-20 group-hover:opacity-40 transition-opacity"
        style={{ background: 'radial-gradient(circle at top right, rgba(201,168,76,0.4), transparent 70%)' }} />
      
      {/* Shimmer line at top */}
      <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{title}</p>
          <p className="text-4xl font-display font-black stat-number">{value}</p>
        </div>
        <div className="p-3 rounded-xl relative"
          style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <Icon size={22} style={{ color: iconColor || '#C9A84C' }} />
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(201,168,76,0.15)' }} />
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs relative z-10">
        <ArrowUpRight size={13} style={{ color: '#4ade80' }} />
        <span style={{ color: '#4ade80' }} className="font-semibold">Live Data</span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>from database</span>
      </div>
    </div>
  );
};

// Helper for invoice number format: INV-YYYYMMDDxxx
const formatInvoiceNumber = (inv) => {
  if (inv.invoice_number) return inv.invoice_number;
  const d = inv.date ? new Date(inv.date) : new Date();
  const ist = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [year, month, day] = ist.split('-');
  const sno = String(inv.id || 1).padStart(3, '0');
  return `INV-${year}${month}${day}${sno}`;
};

const Dashboard = () => {
  const [stats, setStats] = useState({ components: 0, invoices: 0, revenue: '₹0', lowStock: 0 });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [compRes, invRes] = await Promise.all([
        fetch('/api/components'),
        fetch('/api/invoices')
      ]);
      const compData = await compRes.json();
      const invData = await invRes.json();
      const components = Array.isArray(compData) ? compData : [];
      const invoices = Array.isArray(invData) ? invData : [];
      const lowStock = components.filter(c => c.stock < 5).length;
      const revenue = invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0);
      setStats({ components: components.length, invoices: invoices.length, revenue: `₹${revenue.toFixed(2)}`, lowStock });
      setRecentInvoices(invoices.slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open invoice view modal immediately with summary, then populate items
  const handleOpenInvoice = async (inv) => {
    setSelectedInvoice({
      ...inv,
      invoice_number: inv.invoice_number || formatInvoiceNumber(inv),
      items: []
    });
    setShowDeleteConfirm(false);
    try {
      const res = await fetch(`/api/invoices/${inv.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedInvoice(data);
      }
    } catch (err) {
      console.error('Error fetching invoice items:', err);
    }
  };

  // Delete invoice with stock restoration
  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/invoices/${selectedInvoice.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete invoice');

      setNotification({
        type: 'success',
        message: `Invoice ${selectedInvoice.invoice_number || formatInvoiceNumber(selectedInvoice)} deleted successfully. Stock restored.`
      });
      setSelectedInvoice(null);
      setShowDeleteConfirm(false);
      await fetchData();
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: err.message || 'Failed to delete invoice' });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePrint = () => {
    const printContents = document.getElementById('printable-dashboard-invoice').innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div
          className="fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 transition-all animate-fade-in"
          style={{
            background: notification.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${notification.type === 'success' ? '#22c55e' : '#ef4444'}`,
            backdropFilter: 'blur(12px)',
            color: '#fff'
          }}
        >
          {notification.type === 'success' ? (
            <CheckCircle size={20} className="text-green-400" />
          ) : (
            <AlertCircle size={20} className="text-red-400" />
          )}
          <span className="text-sm font-semibold">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 rounded-full" style={{ background: 'linear-gradient(180deg, #C9A84C, #E8C96A)' }} />
          <h2 className="text-3xl font-black font-display shimmer-text">Dashboard</h2>
        </div>
        <p className="ml-4" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
          Welcome back — here's your live overview.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard title="Total Components" value={stats.components} icon={Package} delay={0} />
        <StatCard title="Total Invoices" value={stats.invoices} icon={Receipt} delay={100} />
        <StatCard title="Total Revenue" value={stats.revenue} icon={TrendingUp} iconColor="#4ade80" delay={200} />
        <StatCard title="Low Stock Alert" value={stats.lowStock} icon={AlertTriangle} iconColor="#f87171" delay={300} />
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
        {/* Recent Invoices */}
        <div className="lg:col-span-2 glass-panel p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold font-display">Recent Invoices</h3>
              <p className="text-xs text-gray-400 mt-0.5">Click any invoice to view, print, or delete</p>
            </div>
            <span className="badge-gold">Last 5</span>
          </div>

          {recentInvoices.length > 0 ? (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.15)', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                    <th className="pb-3 font-medium tracking-wider uppercase">Invoice</th>
                    <th className="pb-3 font-medium tracking-wider uppercase">Customer</th>
                    <th className="pb-3 font-medium tracking-wider uppercase">Date</th>
                    <th className="pb-3 font-medium tracking-wider uppercase text-right">Amount</th>
                    <th className="pb-3 font-medium tracking-wider uppercase text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map(inv => (
                    <tr
                      key={inv.id}
                      onClick={() => handleOpenInvoice(inv)}
                      className="table-row-hover cursor-pointer group"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <td className="py-3.5 font-bold font-mono group-hover:underline" style={{ color: '#C9A84C', fontSize: '0.85rem' }}>
                        {formatInvoiceNumber(inv)}
                      </td>
                      <td className="py-3.5 text-sm font-medium">{inv.customer_name}</td>
                      <td className="py-3.5 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {new Date(inv.date).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 text-right font-semibold" style={{ color: '#4ade80', fontSize: '0.9rem' }}>
                        ₹{Number(inv.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenInvoice(inv);
                          }}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all hover:scale-105"
                          style={{
                            background: 'rgba(201,168,76,0.15)',
                            color: '#C9A84C',
                            border: '1px solid rgba(201,168,76,0.3)',
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
              <Receipt size={48} className="mb-4" style={{ color: 'rgba(201,168,76,0.3)' }} />
              <p className="text-sm">No invoices yet. Start billing!</p>
            </div>
          )}
        </div>

        {/* Service Categories */}
        <div className="glass-panel p-6">
          <h3 className="text-lg font-bold font-display mb-5">Service Categories</h3>
          <div className="space-y-3">
            {[
              { name: 'Electronics', icon: '⚡', desc: 'Modules & Components' },
              { name: 'Web Development', icon: '💻', desc: 'Software & Web Apps' },
              { name: 'Scrap Innovation', icon: '♻️', desc: 'Creative Upcycling' },
            ].map((cat, i) => (
              <div key={i} className="p-4 rounded-xl group cursor-default"
                style={{
                  background: 'rgba(201,168,76,0.04)',
                  border: '1px solid rgba(201,168,76,0.12)',
                  transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(201,168,76,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.35)';
                  e.currentTarget.style.transform = 'translateX(4px) translateZ(4px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(201,168,76,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(201,168,76,0.12)';
                  e.currentTarget.style.transform = '';
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cat.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{cat.name}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{cat.desc}</p>
                    </div>
                  </div>
                  <span className="badge-gold text-xs">Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div
            className="rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl"
            style={{
              background: '#0d0d0d',
              border: '1px solid rgba(201,168,76,0.35)',
              boxShadow: '0 0 60px rgba(0,0,0,0.9), 0 0 30px rgba(201,168,76,0.15)'
            }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center gap-3">
                <Receipt size={20} style={{ color: '#C9A84C' }} />
                <span className="font-bold text-white text-base">
                  Invoice Details — {selectedInvoice.invoice_number || formatInvoiceNumber(selectedInvoice)}
                </span>
              </div>
              <button
                onClick={() => { setSelectedInvoice(null); setShowDeleteConfirm(false); }}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Printable Invoice Template */}
            <div id="printable-dashboard-invoice" className="p-10 bg-white">
              {/* Header with Logo */}
              <div className="flex justify-between items-start pb-6 mb-6" style={{ borderBottom: '2px solid #C9A84C' }}>
                <div className="flex items-center gap-4">
                  <img src="/logo.png" alt="Infinite Services" className="w-20 h-20 object-contain" />
                  <div>
                    <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.6rem', fontWeight: 900, color: '#000', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                      INFINITE SERVICES
                    </h1>
                    <p style={{ color: '#8a7340', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.1em', marginTop: '2px' }}>
                      POWERING TECHNOLOGY
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ background: '#000', color: '#C9A84C', padding: '4px 16px', borderRadius: '6px', fontWeight: 800, letterSpacing: '0.15em', fontSize: '0.9rem', marginBottom: '8px' }}>
                    INVOICE
                  </div>
                  <p style={{ fontWeight: 700, color: '#000', fontSize: '1rem' }}>
                    {selectedInvoice.invoice_number || formatInvoiceNumber(selectedInvoice)}
                  </p>
                  <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '2px' }}>
                    Date: {new Date(selectedInvoice.date).toLocaleDateString()}
                  </p>
                  <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '2px' }}>
                    Time: {new Date(selectedInvoice.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Billed To */}
              <div className="mb-8">
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8a7340', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>
                  BILLED TO
                </p>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#000' }}>{selectedInvoice.customer_name}</p>
                {selectedInvoice.customer_contact && (
                  <p style={{ color: '#555', marginTop: '2px' }}>{selectedInvoice.customer_contact}</p>
                )}
              </div>

              {/* Items Table */}
              <table className="w-full text-left mb-8">
                <thead>
                  <tr style={{ borderBottom: '2px solid #C9A84C', color: '#000' }}>
                    <th className="py-3 font-bold" style={{ letterSpacing: '0.06em', fontSize: '0.85rem' }}>DESCRIPTION</th>
                    <th className="py-3 font-bold text-center" style={{ letterSpacing: '0.06em', fontSize: '0.85rem' }}>QTY</th>
                    <th className="py-3 font-bold text-right" style={{ letterSpacing: '0.06em', fontSize: '0.85rem' }}>UNIT PRICE</th>
                    <th className="py-3 font-bold text-right" style={{ letterSpacing: '0.06em', fontSize: '0.85rem' }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                    selectedInvoice.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f0e8d0' }}>
                        <td className="py-4">
                          <p style={{ fontWeight: 600, color: '#111' }}>{item.description || item.component_name || 'Service'}</p>
                        </td>
                        <td className="py-4 text-center" style={{ fontWeight: 600, color: '#333' }}>{item.quantity}</td>
                        <td className="py-4 text-right" style={{ color: '#444' }}>₹{Number(item.price).toFixed(2)}</td>
                        <td className="py-4 text-right" style={{ fontWeight: 700, color: '#000' }}>₹{(Number(item.price) * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr style={{ borderBottom: '1px solid #f0e8d0' }}>
                      <td className="py-4" colSpan={3}>
                        <p style={{ fontWeight: 600, color: '#111' }}>Standard Billing Service</p>
                      </td>
                      <td className="py-4 text-right" style={{ fontWeight: 700, color: '#000' }}>
                        ₹{Number(selectedInvoice.total_amount).toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end mt-2">
                <div style={{ width: '280px' }}>
                  {Number(selectedInvoice.discount) > 0 && (
                    <div className="flex justify-between py-2 text-sm" style={{ color: '#16a34a', borderBottom: '1px solid #f0e8d0', fontWeight: 600 }}>
                      <span>Discount</span>
                      <span>−₹{Number(selectedInvoice.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3" style={{ borderTop: '2px solid #C9A84C', marginTop: '4px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#000' }}>TOTAL</span>
                    <span style={{ fontWeight: 900, fontSize: '1.3rem', color: '#C9A84C' }}>
                      ₹{Number(selectedInvoice.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-6 text-center" style={{ borderTop: '1px solid #f0e8d0' }}>
                <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: '0.95rem' }}>Thank you for choosing Infinite Services!</p>
                <p style={{ color: '#999', fontSize: '0.8rem', marginTop: '4px' }}>For support, please contact us. We appreciate your trust.</p>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-3 rounded-b-xl" style={{ background: 'rgba(201,168,76,0.05)', borderTop: '1px solid rgba(201,168,76,0.2)' }}>
              {showDeleteConfirm ? (
                <div className="w-full flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                  <span className="text-xs text-red-300 font-medium">
                    Are you sure? This will delete the invoice and restore component stock.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteInvoice}
                      disabled={isDeleting}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white flex items-center gap-1"
                    >
                      <Trash2 size={13} />
                      {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20"
                  >
                    <Trash2 size={16} />
                    Delete Invoice
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedInvoice(null)}
                      className="px-5 py-2 rounded-xl font-semibold text-sm transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                    >
                      Close
                    </button>

                    <button
                      onClick={handlePrint}
                      className="btn-gold px-6 py-2 flex items-center rounded-xl text-sm"
                    >
                      <Printer size={16} className="mr-2" />
                      Print Receipt
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
