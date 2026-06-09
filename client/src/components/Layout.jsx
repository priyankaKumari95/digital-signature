import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  FileSignature,
  LayoutDashboard,
  PenTool,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function navClass({ isActive }) {
  return `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
  }`;
}

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = (
    <>
      <NavLink to="/dashboard" className={navClass} onClick={() => setOpen(false)}>
        <LayoutDashboard size={18} /> Dashboard
      </NavLink>
      <NavLink to="/signatures" className={navClass} onClick={() => setOpen(false)}>
        <PenTool size={18} /> Signatures
      </NavLink>
      <NavLink to="/verify" className={navClass} onClick={() => setOpen(false)}>
        <ShieldCheck size={18} /> Verify
      </NavLink>
      {isAdmin && (
        <NavLink to="/admin" className={navClass} onClick={() => setOpen(false)}>
          <ShieldAlert size={18} /> Admin
        </NavLink>
      )}
    </>
  );

  return (
    <div className="min-h-full bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-slate-900">
            <FileSignature className="text-brand-600" size={22} />
            DigiSign
          </Link>

          <nav className="hidden items-center gap-1 md:flex">{links}</nav>

          <div className="hidden items-center gap-3 md:flex">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="btn-secondary" title="Log out">
              <LogOut size={16} />
            </button>
          </div>

          <button className="md:hidden" onClick={() => setOpen((o) => !o)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {open && (
          <div className="space-y-1 border-t border-slate-200 px-4 py-3 md:hidden">
            {links}
            <button onClick={handleLogout} className="btn-secondary mt-2 w-full">
              <LogOut size={16} /> Log out
            </button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
