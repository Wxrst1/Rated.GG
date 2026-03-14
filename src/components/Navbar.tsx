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
      .catch(() => { });
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
    <nav className="border-b border-white/5 bg-background/60 backdrop-blur-3xl sticky top-0 z-[150] h-24 flex items-center shadow-2xl">
      <div className="max-w-7xl mx-auto px-6 w-full flex items-center justify-between">
        
        {/* LOGO REDESIGN */}
        <Link to="/" className="group flex items-center gap-4">
          <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center rotate-[-3deg] group-hover:rotate-6 transition-all duration-500 shadow-[0_0_30px_rgba(255,199,0,0.3)]">
            <Shield className="w-6 h-6 text-black" fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-4xl tracking-tight text-white leading-none uppercase italic">Rated.gg</span>
            <span className="text-[8px] font-black text-accent tracking-[0.5em] uppercase mt-1 opacity-60">Forensic Network</span>
          </div>
        </Link>

        {/* INTEGRATED SEARCH */}
        <div className="hidden lg:block flex-1 max-w-xl mx-16">
          <div className="relative group/search">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-white/10 group-focus-within/search:text-accent transition-colors" />
            <input
              type="text"
              value={searchQuery}
              spellCheck={false}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="w-full pl-16 pr-6 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white placeholder:text-white/5 focus:outline-none focus:border-accent/30 focus:bg-white/[0.05] transition-all"
              placeholder="SCAN OPERATOR IDENTITY..."
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-white/5 rounded text-[8px] font-mono text-white/20">CTRL + K</div>
          </div>
        </div>

        {/* COMMAND ACTIONS */}
        <div className="flex items-center gap-8">
          {user ? (
            <div className="flex items-center gap-5">
              <Link 
                to="/dashboard" 
                className="flex items-center gap-4 p-2 pr-6 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.08] hover:border-accent/30 transition-all group"
              >
                <img src={user._json?.avatar} className="w-10 h-10 rounded-xl border border-white/10 group-hover:border-accent/20 transition-all" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.1em] leading-none mb-1">Commander</span>
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">{user.displayName || 'Operator'}</span>
                </div>
              </Link>
              
              <button
                onClick={handleLogout}
                className="p-4 text-white/20 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all border border-transparent hover:border-red-500/10"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link 
              to="/auth/login" 
              className="px-10 py-4 bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-accent transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] active:scale-95"
            >
              UPLINK
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
