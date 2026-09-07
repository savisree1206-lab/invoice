import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Receipt, Sparkles, Zap } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ComponentsManager from './pages/ComponentsManager';
import BillDesk from './pages/BillDesk';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/components', icon: Package, label: 'Components' },
  { to: '/billing', icon: Receipt, label: 'Bill Desk' },
];

// Tilt effect hook for cards
function useTilt(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = (x - cx) / cx;
      const dy = (y - cy) / cy;
      el.style.transform = `rotateX(${-dy * 3}deg) rotateY(${dx * 3}deg) translateZ(6px)`;
    };
    const onLeave = () => {
      el.style.transform = 'rotateX(0) rotateY(0) translateZ(0)';
    };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [ref]);
}

function PageWrapper({ children }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-enter flex-1 overflow-auto p-6 lg:p-8" style={{ minHeight: 0 }}>
      {children}
    </div>
  );
}

function App() {
  const logoRef = useRef(null);

  return (
    <Router>
      <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
        {/* Background ambient orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="orb w-96 h-96 bg-gold-500/10" style={{ top: '-10%', left: '-5%', filter: 'blur(80px)' }} />
          <div className="orb w-80 h-80 bg-gold-400/5" style={{ bottom: '10%', right: '5%', filter: 'blur(100px)', animationDelay: '3s' }} />
          <div className="orb w-64 h-64 bg-gold-600/5" style={{ top: '40%', left: '40%', filter: 'blur(120px)', animationDelay: '6s' }} />
        </div>

        {/* Sidebar */}
        <aside className="relative z-10 w-full lg:w-72 flex-shrink-0 flex flex-col"
          style={{
            background: 'linear-gradient(180deg, rgba(10,8,4,0.98) 0%, rgba(8,8,8,0.99) 100%)',
            borderRight: '1px solid rgba(201,168,76,0.15)',
            boxShadow: '4px 0 30px rgba(0,0,0,0.5)'
          }}>
          
          {/* Gold top accent line */}
          <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />

          {/* Logo area */}
          <div className="flex flex-col items-center pt-8 pb-6 px-6">
            {/* 3D rotating logo */}
            <div ref={logoRef} className="relative mb-4" style={{ perspective: '400px', transformStyle: 'preserve-3d' }}>
              <div className="logo-float">
                <img
                  src="/logo.png"
                  alt="Infinite Services Logo"
                  className="w-20 h-20 object-contain rounded-full"
                  style={{
                    filter: 'drop-shadow(0 4px 20px rgba(201,168,76,0.5)) drop-shadow(0 0 40px rgba(201,168,76,0.2))',
                  }}
                />
              </div>
              {/* Glow ring behind logo */}
              <div className="absolute inset-0 rounded-full blur-xl opacity-40"
                style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.4) 0%, transparent 70%)', transform: 'translateZ(-10px)' }} />
            </div>

            <h1 className="font-display font-black text-xl tracking-widest text-center leading-tight shimmer-text">
              INFINITE SERVICES
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Zap size={10} className="text-gold-500" />
              <span className="text-xs text-gold-500/70 tracking-widest uppercase font-medium">Bill Management</span>
              <Zap size={10} className="text-gold-500" />
            </div>
          </div>

          {/* Gold divider */}
          <div className="gold-divider mx-4 mb-4" />

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <div className="relative">
                  <Icon size={20} />
                </div>
                <span>{label}</span>
                {to === '/billing' && (
                  <span className="ml-auto badge-gold">New</span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Bottom section */}
          <div className="p-4 m-4 rounded-xl text-center"
            style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.02))', border: '1px solid rgba(201,168,76,0.15)' }}>
            <Sparkles size={16} className="text-gold-500 mx-auto mb-1" />
            <p className="text-xs text-gold-500/60 font-medium">Infinite Services</p>
            <p className="text-xs text-white/30 mt-0.5">v1.1</p>
          </div>

          {/* Gold bottom accent line */}
          <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />
        </aside>

        {/* Main content */}
        <main className="relative z-10 flex-1 flex flex-col overflow-hidden">
          <Routes>
            <Route path="/" element={<PageWrapper><Dashboard /></PageWrapper>} />
            <Route path="/components" element={<PageWrapper><ComponentsManager /></PageWrapper>} />
            <Route path="/billing" element={<PageWrapper><BillDesk /></PageWrapper>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
