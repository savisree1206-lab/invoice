import React, { useState, useEffect, useRef } from 'react';
import { Package, Receipt, TrendingUp, AlertTriangle, ArrowUpRight } from 'lucide-react';

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

const Dashboard = () => {
  const [stats, setStats] = useState({ components: 0, invoices: 0, revenue: '₹0', lowStock: 0 });
  const [recentInvoices, setRecentInvoices] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
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
    };
    fetchData();
  }, []);

  return (
    <div className="h-full flex flex-col">
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
            <h3 className="text-lg font-bold font-display">Recent Invoices</h3>
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
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map(inv => (
                    <tr key={inv.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td className="py-3.5 font-bold" style={{ color: '#C9A84C', fontSize: '0.9rem' }}>INV-{inv.id}</td>
                      <td className="py-3.5 text-sm">{inv.customer_name}</td>
                      <td className="py-3.5 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {new Date(inv.date).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 text-right font-semibold" style={{ color: '#4ade80', fontSize: '0.9rem' }}>
                        ₹{Number(inv.total_amount).toFixed(2)}
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
    </div>
  );
};

export default Dashboard;
