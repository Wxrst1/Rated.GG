import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, User, LogIn, Trophy, LogOut, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

export default function Navbar() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<any>(null);
  
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      let id = searchQuery.trim();
      if (id.includes('steamcommunity.com')) {
        const parts = id.split('/').filter(Boolean);
        id = parts[parts.length - 1];
      }
      navigate(`/player/${id}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    window.location.href = '/api/auth/logout';
  };

  return (
    <nav className="border-b border-white/5 bg-background/60 backdrop-blur-2xl sticky top-0 z-[100] h-20 flex items-center shadow-[0_4px_32px_rgba(0,0,0,0.5)]">
      <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
        
        {/* LOGO */}
        <Link to="/" className="group flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center rotate-3 group-hover:rotate-12 transition-transform shadow-glow">
            <Shield className="w-6 h-6 text-black" />
          </div>
          <span className="font-display text-4xl tracking-tighter text-white">CSWH</span>
        </Link>
        
        {/* CENTER SEARCH */}
        <div className="hidden lg:block flex-1 max-w-xl mx-12">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-accent transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-xs font-mono uppercase tracking-widest text-white placeholder-gray-600 focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 transition-all"
              placeholder="SEARCH PLAYER IDENTITY..."
            />
          </div>
        </div>

        {/* RIGHT ACTIONS */}
        <div className="flex items-center gap-6">
          <div className="h-4 w-[1px] bg-white/10 hidden sm:block"></div>

          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="flex items-center gap-3 p-1.5 pr-4 bg-white/5 border border-white/10 rounded-2xl hover:border-accent/50 transition-all">
                <img src={user._json?.avatar} className="w-8 h-8 rounded-xl border border-white/10" />
                <span className="text-[10px] font-mono tracking-[0.15em] text-white uppercase font-bold hidden md:inline">Dashboard</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="p-3 text-gray-500 hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link to="/auth/login" className="bg-white text-black px-6 py-2.5 rounded-xl font-bold text-xs tracking-widest hover:bg-accent transition-all flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              LOGIN
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
