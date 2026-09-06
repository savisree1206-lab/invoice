import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Printer, RotateCcw, Tag } from 'lucide-react';

const BillDesk = () => {
  const [components, setComponents] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({ name: '', contact: '' });
  const [search, setSearch] = useState('');
  const [shippingCharge, setShippingCharge] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchComponents = async () => {
    try {
      const res = await fetch('/api/components');
      const data = await res.json();
      if (Array.isArray(data)) {
        setComponents(data);
      } else {
        console.error('Invalid data format', data);
      }
    } catch (err) {
      console.error('Failed to fetch components:', err);
    }
  };

  useEffect(() => {
    fetchComponents();
  }, []);

  const addToCart = (comp) => {
    const existing = cart.find(item => item.id === comp.id);
    if (existing) {
      if (existing.quantity < comp.stock) {
        setCart(cart.map(item => item.id === comp.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
    } else {
      setCart([...cart, { ...comp, quantity: 1 }]);
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        const comp = components.find(c => c.id === id);
        if (newQ > 0 && newQ <= comp.stock) {
          return { ...item, quantity: newQ };
        }
        return item;
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = parseFloat(shippingCharge) || 0;
  const discount = parseFloat(discountAmount) || 0;
  const total = Math.max(0, subtotal + shipping - discount);

  const handleCheckout = async () => {
    if (cart.length === 0 || !customerInfo.name) {
      setErrorMsg('Please add items and enter a customer name.');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerInfo.name,
          customer_contact: customerInfo.contact,
          discount: discount,
          total_amount: total,
          items: cart.map(c => ({ component_id: c.id, description: c.name, quantity: c.quantity, price: c.price }))
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to create invoice');
        setIsSubmitting(false);
        return;
      }

      setInvoiceData({
        ...customerInfo,
        items: [...cart],
        subtotal,
        shipping,
        discount,
        total,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        invoiceNumber: `INV-${data.id || Math.floor(Math.random() * 10000)}`
      });
      setShowInvoice(true);
      fetchComponents(); // refresh stock
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error: Could not reach the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close & clear everything
  const handleCloseInvoice = () => {
    setShowInvoice(false);
    setCart([]);
    setCustomerInfo({ name: '', contact: '' });
    setShippingCharge('');
    setDiscountAmount('');
    setInvoiceData(null);
    setErrorMsg('');
  };

  // Close modal — stock already deducted, so start fresh cart
  const handleEditAndRegenerate = () => {
    setShowInvoice(false);
    setInvoiceData(null);
    // Reset cart since stock was already deducted for previous invoice
    setCart([]);
    setErrorMsg('');
    // Keep customer info & charges for convenience
  };

  const filteredComponents = components.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-full flex flex-col lg:flex-row gap-6 items-start">
      {/* Products Selection */}
      <div className="flex-1 flex flex-col w-full">
        <div className="mb-6">
          <h2 className="text-3xl font-bold font-display mb-2">New Bill</h2>
          <p className="text-gray-400">Select items to add to the invoice.</p>
        </div>

        <div className="glass-panel flex-1 flex flex-col p-6 min-h-[420px]">
          <input
            type="text"
            placeholder="Search products, services..."
            className="input-field mb-6"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-auto flex-1 content-start pr-2 max-h-[600px]">
            {filteredComponents.map(comp => (
              <div
                key={comp.id}
                onClick={() => addToCart(comp)}
                className="bg-white/5 border border-white/10 p-4 rounded-xl cursor-pointer hover:bg-white/10 hover:border-primary/50 transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{comp.name}</h4>
                  <span className="text-primary font-bold">₹{Number(comp.price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span className="px-2 py-0.5 rounded bg-white/10">{comp.category}</span>
                  <div className="flex items-center gap-2">
                    {comp.code_number && (
                      <span className="font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.2)', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                        {comp.code_number}
                      </span>
                    )}
                    <span>Stock: {comp.stock}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart & Checkout */}
      <div className="w-full lg:w-[420px] flex-shrink-0 flex flex-col gap-5">
        <div className="glass-panel p-5">
          <h3 className="font-display font-bold text-lg mb-3 flex items-center text-white">
            <ShoppingCart className="mr-2 text-primary" size={18} />
            Customer Info
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="Customer Name *"
                className="input-field text-sm"
                value={customerInfo.name}
                onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Contact (Optional)"
                className="input-field text-sm"
                value={customerInfo.contact}
                onChange={e => setCustomerInfo({ ...customerInfo, contact: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex items-center space-x-1.5 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 focus-within:border-primary/50 transition-colors">
                <span className="text-gray-400 text-xs whitespace-nowrap">Shipping ₹</span>
                <input
                  type="number"
                  placeholder="0.00"
                  className="bg-transparent text-sm text-white w-full outline-none"
                  value={shippingCharge}
                  onChange={e => setShippingCharge(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-1.5 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 focus-within:border-emerald-500/50 transition-colors">
                <span className="flex items-center gap-0.5 text-xs text-emerald-400 whitespace-nowrap">
                  <Tag size={11} /> Disc ₹
                </span>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  className="bg-transparent text-sm text-white w-full outline-none"
                  value={discountAmount}
                  onChange={e => setDiscountAmount(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 flex flex-col relative overflow-hidden">
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-lg text-white">Invoice Items</h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.3)' }}>
                {cart.reduce((sum, item) => sum + item.quantity, 0)} {cart.reduce((sum, item) => sum + item.quantity, 0) === 1 ? 'item' : 'items'}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                title="Clear all items"
              >
                Clear
              </button>
            )}
          </div>

          <div className="min-h-[160px] max-h-[300px] overflow-y-auto pr-1 space-y-2.5">
            {cart.length === 0 ? (
              <div className="h-36 flex flex-col items-center justify-center text-gray-500 text-sm border border-dashed border-white/10 rounded-xl">
                <ShoppingCart size={24} className="mb-2 text-gray-600 opacity-60" />
                <span>Cart is empty</span>
                <span className="text-xs text-gray-600 mt-1">Select items from the left to add</span>
              </div>
            ) : (
              cart.map(item => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border transition-all"
                  style={{ background: 'rgba(201,168,76,0.04)', borderColor: 'rgba(201,168,76,0.15)' }}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="font-medium text-sm text-white leading-snug line-clamp-2">{item.name}</span>
                    <span className="text-emerald-400 text-sm font-semibold whitespace-nowrap">₹{(Number(item.price) * item.quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 font-mono">₹{Number(item.price).toFixed(2)} / unit</span>
                    <div className="flex items-center space-x-1.5 p-1 rounded-lg" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.15)' }}>
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-gray-300 transition-colors"
                        title="Decrease"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="text-sm font-semibold w-5 text-center text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-white/10 rounded text-gray-300 transition-colors"
                        title="Increase"
                      >
                        <Plus size={13} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-red-500/20 rounded text-red-400 ml-1 transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-3 space-y-2" style={{ borderTop: '1px solid rgba(201,168,76,0.18)' }}>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-gray-200 font-medium font-mono">₹{subtotal.toFixed(2)}</span>
            </div>
            {shipping > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Shipping</span>
                <span className="text-gray-200 font-medium font-mono">₹{shipping.toFixed(2)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <Tag size={12} /> Discount
                </span>
                <span className="text-emerald-400 font-medium font-mono">−₹{discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2.5 pb-1" style={{ borderTop: '1px solid rgba(201,168,76,0.18)' }}>
              <span className="font-semibold text-gray-300">Total Amount</span>
              <span className="text-3xl font-display font-black stat-number">₹{total.toFixed(2)}</span>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isSubmitting}
              className="btn-gold w-full py-3 mt-1 rounded-xl font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <Printer className="mr-2" size={18} />
              {isSubmitting ? 'Generating...' : 'Generate Invoice'}
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoice && invoiceData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col" style={{ background: '#0d0d0d', border: '1px solid rgba(201,168,76,0.3)', boxShadow: '0 0 60px rgba(0,0,0,0.8), 0 0 30px rgba(201,168,76,0.1)' }}>

            {/* Printable Area */}
            <div id="printable-invoice" className="p-10 bg-white">
              {/* Header with Logo */}
              <div className="flex justify-between items-start pb-6 mb-6" style={{ borderBottom: '2px solid #C9A84C' }}>
                <div className="flex items-center gap-4">
                  <img src="/logo.png" alt="Infinite Services" className="w-20 h-20 object-contain" />
                  <div>
                    <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.6rem', fontWeight: 900, color: '#000', letterSpacing: '-0.02em', lineHeight: 1.1 }}>INFINITE SERVICES</h1>
                    <p style={{ color: '#8a7340', fontWeight: 600, fontSize: '0.8rem', letterSpacing: '0.1em', marginTop: '2px' }}>POWERING TECHNOLOGY</p>
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ background: '#000', color: '#C9A84C', padding: '4px 16px', borderRadius: '6px', fontWeight: 800, letterSpacing: '0.15em', fontSize: '0.9rem', marginBottom: '8px' }}>INVOICE</div>
                  <p style={{ fontWeight: 700, color: '#000', fontSize: '1rem' }}>{invoiceData.invoiceNumber}</p>
                  <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '2px' }}>Date: {invoiceData.date}</p>
                  <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '2px' }}>Time: {invoiceData.time}</p>
                </div>
              </div>

              <div className="mb-8">
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8a7340', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '6px' }}>BILLED TO</p>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#000' }}>{invoiceData.name}</p>
                {invoiceData.contact && <p style={{ color: '#555', marginTop: '2px' }}>{invoiceData.contact}</p>}
              </div>

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
                  {invoiceData.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f0e8d0' }}>
                      <td className="py-4">
                        <p style={{ fontWeight: 600, color: '#111' }}>{item.name}</p>
                        <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '2px' }}>{item.category}</p>
                      </td>
                      <td className="py-4 text-center" style={{ fontWeight: 600, color: '#333' }}>{item.quantity}</td>
                      <td className="py-4 text-right" style={{ color: '#444' }}>₹{Number(item.price).toFixed(2)}</td>
                      <td className="py-4 text-right" style={{ fontWeight: 700, color: '#000' }}>₹{(Number(item.price) * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end mt-2">
                <div style={{ width: '280px' }}>
                  <div className="flex justify-between py-2 text-sm" style={{ color: '#555', borderBottom: '1px solid #f0e8d0' }}>
                    <span>Subtotal</span><span>₹{invoiceData.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-sm" style={{ color: '#555', borderBottom: '1px solid #f0e8d0' }}>
                    <span>Shipping Charge</span><span>₹{invoiceData.shipping.toFixed(2)}</span>
                  </div>
                  {invoiceData.discount > 0 && (
                    <div className="flex justify-between py-2 text-sm" style={{ color: '#16a34a', borderBottom: '1px solid #f0e8d0', fontWeight: 600 }}>
                      <span>Discount</span>
                      <span>−₹{invoiceData.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3" style={{ borderTop: '2px solid #C9A84C', marginTop: '4px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#000' }}>TOTAL</span>
                    <span style={{ fontWeight: 900, fontSize: '1.3rem', color: '#C9A84C' }}>₹{invoiceData.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-6 text-center" style={{ borderTop: '1px solid #f0e8d0' }}>
                <p style={{ fontWeight: 700, color: '#C9A84C', fontSize: '0.95rem' }}>Thank you for choosing Infinite Services!</p>
                <p style={{ color: '#999', fontSize: '0.8rem', marginTop: '4px' }}>For support, please contact us. We appreciate your trust.</p>
              </div>
            </div>

            {/* Actions (Not Printed) */}
            <div className="p-4 flex justify-end space-x-3 rounded-b-xl" style={{ background: 'rgba(201,168,76,0.05)', borderTop: '1px solid rgba(201,168,76,0.2)' }}>
              {/* Close — clears everything */}
              <button
                onClick={handleCloseInvoice}
                className="px-6 py-2 rounded-xl font-semibold text-sm transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                Close
              </button>

              {/* Edit & Regenerate — keeps cart intact */}
              <button
                onClick={handleEditAndRegenerate}
                className="px-6 py-2 rounded-xl font-semibold text-sm transition-all flex items-center gap-2"
                style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,222,128,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(74,222,128,0.08)'}
              >
                <RotateCcw size={15} />
                Edit & Regenerate
              </button>

              {/* Print Receipt */}
              <button
                onClick={() => {
                  const printContents = document.getElementById('printable-invoice').innerHTML;
                  const originalContents = document.body.innerHTML;
                  document.body.innerHTML = printContents;
                  window.print();
                  document.body.innerHTML = originalContents;
                  window.location.reload();
                }}
                className="btn-gold px-6 py-2 flex items-center rounded-xl text-sm"
              >
                <Printer size={16} className="mr-2" />
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillDesk;
