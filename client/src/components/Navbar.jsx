import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Car, LogOut, MapPin, Navigation } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-brand-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-gradient-to-tr from-brand-secondary to-brand-accent p-2 rounded-lg text-slate-900 font-bold group-hover:scale-105 transition-transform">
            <Car size={20} className="text-white animate-pulse" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-brand-accent transition-colors">
            Daily<span className="text-brand-accent font-semibold">Pool</span>
          </span>
        </Link>

        {/* Navigation / User Profile */}
        {user ? (
          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link
                to="/"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/post-route"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Post Commute
              </Link>
              <Link
                to="/history"
                className="text-slate-300 hover:text-white transition-colors"
              >
                History
              </Link>
              <Link
                to="/profile"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Profile
              </Link>
              <Link
                to="/admin"
                className="text-slate-300 hover:text-[#007afc] transition-colors"
              >
                Admin
              </Link>
            </nav>

            <span className="h-4 w-px bg-brand-border/80 hidden md:block"></span>

            {/* User details */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm font-semibold text-white">{user.name}</span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {user.companyName ? `${user.companyName} • ` : ''}Trust Score: {user.trustScore}/100
                </span>
              </div>



              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-[#15171b]/60 rounded-lg transition-all"
                title="Sign Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        ) : (
          <Link
            to="/login"
            className="bg-[#007afc] text-white font-bold px-6 py-2.5 rounded-full text-xs transition-all shadow-md shadow-brand-accent/10"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
