import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldCheck, Zap, Activity, ArrowRight, MousePointer2, Fingerprint, Globe, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';

const TITLES = ["Expose Cheaters", "Verify Enemies", "Know Truth"];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [titleIndex, setTitleIndex] = useState(0);
  const [stats, setStats] = useState({ playersIndexed: 9700000, activeUsers: 559100, reportsSubmitted: 8200 });
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [livePreview, setLivePreview] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { scrollY } = useScroll();

  useEffect(() => {
    // Cycle Title
    const interval = setInterval(() => {
      setTitleIndex((prev) => (prev + 1) % TITLES.length);
    }, 4000);

    // Fetch Real Stats
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => { });

    // Leadboard preview removed as per user request

    return () => clearInterval(interval);
  }, []);

  // Live Search Preview Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        setIsSearching(true);
        fetch(`/api/search/preview?query=${encodeURIComponent(searchQuery)}`)
          .then(res => res.json())
          .then(data => {
            setLivePreview(data);
            setIsSearching(false);
          })
          .catch(() => setIsSearching(false));
      } else {
        setLivePreview(null);
      }
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const y1 = useTransform(scrollY, [0, 1000], [0, 400]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -300]);
  const opacity = useTransform(scrollY, [0, 200], [1, 0.5]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      let id = searchQuery.trim();
      // Handle both steamcommunity and our new isteamcommunity shortcut
      if (id.includes('steamcommunity.com')) {
        const parts = id.split('/').filter(Boolean);
        id = parts[parts.length - 1];
      }
      navigate(`/player/${id}`);
    }
  };

  return (
    <div className="flex flex-col items-center bg-background min-h-screen relative overflow-x-hidden selection:bg-accent selection:text-black font-sans forensic-grid">
      <div className="scanline opacity-[0.03]" />
      
      {/* --- ELITE DESIGN LAYERS --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background" />
        
        {/* Cinematic Light Leaks */}
        <motion.div
           animate={{ 
             scale: [1, 1.2, 1],
             opacity: [0.03, 0.06, 0.03]
           }}
           transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
           className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] bg-accent rounded-full blur-[180px]"
        />
        <motion.div
           animate={{ 
             scale: [1, 1.3, 1],
             opacity: [0.04, 0.08, 0.04]
           }}
           transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
           className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] bg-blue-500 rounded-full blur-[200px]"
        />
      </div>

      {/* --- HERO SECTION --- */}
      <section className="w-full max-w-7xl mx-auto px-6 pt-52 pb-48 relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, letterSpacing: "0.8em" }}
          animate={{ opacity: 1, letterSpacing: "0.4em" }}
          className="mb-12 flex items-center gap-4 px-8 py-3 glass rounded-full border-accent/20"
        >
          <Zap className="w-3.5 h-3.5 text-accent animate-pulse" />
          <span className="text-[10px] font-mono font-black text-white/60 uppercase">System Status: Active Terminal // NODE-7</span>
        </motion.div>

        {/* Cinematic Headline */}
        <div className="mb-16 flex flex-col items-center text-center">
           <motion.div
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             className="text-[0.7rem] font-black text-accent tracking-[1em] uppercase mb-6 opacity-60"
           >
             Forensic Behavioral Analysis
           </motion.div>
           <div className="relative">
              <AnimatePresence mode="wait">
                <motion.h1
                  key={TITLES[titleIndex]}
                  initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="text-[6rem] md:text-[11rem] font-display text-white tracking-tight leading-none uppercase italic text-shadow-elite"
                >
                  {TITLES[titleIndex]}
                </motion.h1>
              </AnimatePresence>
              <div className="absolute -inset-x-20 top-1/2 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent -z-10" />
           </div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg md:text-2xl text-white/40 max-w-3xl text-center mb-24 leading-relaxed font-light italic"
        >
          Audit the grid. Uncover behavioral anomalies and maintain 
          competitive integrity across <span className="text-accent/60">the decentralized forensic network.</span>
        </motion.p>

        {/* Master Search Module */}
        <div className="w-full max-w-4xl relative mb-32 group">
          <motion.form
            onSubmit={handleSearch}
            className="relative"
          >
            <div className={cn(
              "absolute -inset-4 bg-accent/20 rounded-[4rem] blur-[80px] transition-all duration-1000 pointer-events-none",
              isFocused ? "opacity-40" : "opacity-0"
            )} />

            <div className={cn(
              "relative glass-heavy rounded-[3rem] p-5 pr-8 flex items-center transition-all duration-500 overflow-hidden z-20",
              isFocused ? "border-accent/40 shadow-2xl scale-[1.02]" : "border-white/5"
            )}>
              <div className="shimmer absolute inset-0 opacity-10" />
              <Search className={cn("w-7 h-7 ml-8 mr-6 transition-colors duration-500", isFocused ? "text-accent" : "text-white/20")} />
              <input
                type="text"
                value={searchQuery}
                spellCheck={false}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 300)}
                placeholder="INPUT STEAMID OR PROFILE URL..."
                className="bg-transparent border-none outline-none text-white text-3xl flex-1 min-w-0 placeholder:text-white/5 font-display tracking-wide uppercase italic"
              />
              <button
                type="submit"
                className="bg-accent text-black font-black px-12 py-5 rounded-[2.2rem] transition-all transform hover:scale-105 active:scale-95 shadow-xl tracking-[0.2em] text-[11px] ml-4 relative z-30 pointer-events-auto"
              >
                EXECUTE
              </button>
            </div>

            {/* PREVIEW DROPDOWN */}
            <AnimatePresence>
              {(isFocused && (searchQuery.length >= 3 || (topPlayers && topPlayers.length > 0))) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-[110%] left-0 right-0 glass-heavy rounded-[3rem] overflow-hidden shadow-2xl z-[200] p-4 border-white/10"
                >
                   {livePreview ? (
                      <div
                        className="p-8 hover:bg-white/[0.03] transition-all cursor-pointer flex items-center justify-between rounded-[2.5rem]"
                        onClick={() => navigate(`/player/${livePreview.steamId}`)}
                      >
                         <div className="flex items-center gap-8">
                            <img src={livePreview.avatar} className="w-20 h-20 rounded-2xl border border-white/10" />
                            <div>
                               <div className="text-2xl font-display text-white tracking-widest uppercase italic mb-1">{livePreview.name}</div>
                               <div className="flex items-center gap-4">
                                  <span className="text-[9px] font-black text-accent uppercase tracking-widest px-3 py-1 bg-accent/10 rounded-lg">Identified</span>
                                  <span className="text-[9px] font-mono text-white/20">{livePreview.steamId}</span>
                               </div>
                            </div>
                         </div>
                         <ArrowRight className="w-5 h-5 text-white/20" />
                      </div>
                   ) : (
                      <div className="p-12 text-center text-[10px] font-mono text-white/10 uppercase tracking-[0.5em] animate-pulse">
                         Awaiting Stream Input...
                      </div>
                   )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>
        </div>

        {/* Elite Operatives Preview */}
        <div className="w-full flex flex-col items-center">
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.6em] mb-12">Global High-Confidence Nodes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
               <EliteDossier 
                 player={{ name: 'PROPAIN', steamId: '76561198000000', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=1', csRating: 28400 }} 
                 delay={0.6} 
               />
               <EliteDossier 
                 player={{ name: 'SILENCE', steamId: '76561198000001', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=2', csRating: 26100 }} 
                 delay={0.7} 
               />
               <EliteDossier 
                 player={{ name: 'XENO', steamId: '76561198000002', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=3', csRating: 25900 }} 
                 delay={0.8} 
               />
            </div>
        </div>

        {/* Kinetic Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 lg:gap-24 mt-40 w-full max-w-6xl">
          <StatBox value={stats.playersIndexed} label="Grid Dataset" sub="Telemetric Nodes" accent="gold" delay={0.9} />
          <StatBox value={stats.activeUsers} label="Active Audits" sub="Real-time Scans" accent="indigo" delay={1.0} />
          <StatBox value={stats.reportsSubmitted} label="Verified Truth" sub="Behavioral Logs" accent="danger" delay={1.1} />
        </div>
      </section>

      {/* --- THE PROTOCOL --- */}
      <section className="w-full py-80 relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-52">
            <h2 className="text-[10rem] md:text-[18rem] font-display text-white tracking-widest absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.015] select-none pointer-events-none uppercase">Grid</h2>
            <span className="text-accent font-black tracking-[0.8em] text-[12px] mb-8 block uppercase">Process Architecture</span>
            <h3 className="text-7xl md:text-9xl font-display text-white tracking-tighter">THE Rated.gg PROTOCOL</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <FeatureCard num="01" title="INGESTION" desc="Extraction of complex Steam relational data and friend network clusters." />
            <FeatureCard num="02" title="CORRELATION" desc="Verification against Faceit and Leetify performance benchmarks." />
            <FeatureCard num="03" title="EXECUTION" desc="Calculation of final Trust Coefficient using our proprietary v4.1 engine." />
          </div>
        </div>
      </section>

      {/* --- ELITE OPERATIVES --- */}
      <div className="flex flex-col items-center">
        <h2 className="text-5xl font-display text-white/20 tracking-widest uppercase mb-12">System Database</h2>
        <p className="text-white/10 font-mono text-sm max-w-lg text-center leading-relaxed">
          Global synchronization active. Scanning 9.7M+ telemetry nodes across the decentralized gaming grid.
        </p>
      </div>

      {/* --- THE VOID FOOTER --- */}
      <footer className="w-full bg-[#020408] py-60 border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-x-0 bottom-0 scanline opacity-5" />
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
          <h4 className="text-[20rem] font-display text-white opacity-[0.03] mb-[-0.3em] font-black leading-none uppercase">SECURE</h4>
          <div className="relative z-10 text-center">
            <div className="bg-white text-black text-[11px] font-black tracking-[0.8em] px-16 py-8 rounded-full shadow-[0_0_100px_rgba(255,255,255,0.2)] hover:scale-110 hover:bg-accent transition-all cursor-pointer uppercase">
              Initialize System
            </div>
          </div>
          <div className="mt-40 flex gap-20 text-[11px] font-mono text-white/10 font-bold uppercase tracking-[0.4em]">
            <span>Grid Index: active</span>
            <span>Audits: 8.2k</span>
            <span>Latency: 14ms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatBox({ value, label, sub, delay, accent }: { value: number, label: string, sub: string, delay: number, accent: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      let s = 0;
      const t = setInterval(() => {
        s += value / 120;
        if (s >= value) { setV(value); clearInterval(t); }
        else setV(Math.floor(s));
      }, 16);
    }, delay * 1000);
    return () => clearTimeout(timer);
  }, [value, delay]);

  const color = accent === 'gold' ? 'text-accent' : accent === 'indigo' ? 'text-indigo-400' : 'text-danger';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      className="text-center group"
    >
      <div className={cn("text-8xl md:text-[7rem] font-display mb-2 transition-transform group-hover:scale-110 duration-700", color)}>
        {v.toLocaleString()}
      </div>
      <div className="text-[12px] font-black tracking-[0.6em] text-white/40 mb-1 uppercase">{label}</div>
      <div className="text-[9px] font-mono font-bold text-white/10 uppercase tracking-widest">{sub}</div>
    </motion.div>
  );
}

function FeatureCard({ num, title, desc }: { num: string, title: string, desc: string }) {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      className="p-16 glass rounded-[4rem] relative overflow-hidden group"
    >
      <div className="absolute top-[-20%] right-[-20%] text-[15rem] font-display text-white/5 opacity-0 group-hover:opacity-10 transition-opacity duration-1000">
        {num}
      </div>
      <div className="w-16 h-2 bg-accent mb-12 rounded-full shadow-[0_0_20px_var(--color-accent)]" />
      <h4 className="text-4xl font-display text-white tracking-widest uppercase mb-6 group-hover:text-accent transition-colors">{title}</h4>
      <p className="text-white/30 text-lg leading-relaxed font-light">{desc}</p>
    </motion.div>
  );
}

function EliteDossier({ player, delay, key }: { player: any, delay: number, key?: any }) {
  const navigate = useNavigate();
  const rating = player.csRating || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.8 }}
      onClick={() => navigate(`/player/${player.steamId}`)}
      className="group relative p-[1px] rounded-[3rem] bg-gradient-to-br from-white/10 via-transparent to-white/10 hover:from-accent/40 hover:to-indigo-500/40 transition-all cursor-pointer h-full"
    >
      <div className="bg-[#040609] glass rounded-[2.95rem] p-10 flex flex-col h-full border border-white/5 overflow-hidden">
        <div className="absolute top-0 right-0 p-8 glass rounded-bl-[3rem] text-[10px] font-mono text-white/20 select-none">NODE {player.steamId.slice(-4)}</div>

        <div className="relative mt-8 mb-12 flex justify-center">
          <div className="absolute inset-0 bg-accent/20 blur-[50px] scale-0 group-hover:scale-150 transition-transform duration-1000" />
          <img src={player.avatar} className="w-44 h-44 rounded-[3.5rem] border-2 border-white/5 group-hover:rotate-12 transition-all duration-700 relative z-10 shadow-2xl" />
          <div className="absolute -bottom-6 bg-accent text-black font-black text-[14px] px-8 py-2 rounded-2xl shadow-2xl z-20 group-hover:scale-110 transition-transform">
            {rating ? rating.toLocaleString() : 'PENDING'}
          </div>
        </div>

        <div className="text-center flex-1 mt-6">
          <h5 className="text-3xl font-display text-white tracking-widest uppercase mb-4 group-hover:text-accent transition-colors">{player.name}</h5>
          <div className="flex items-center justify-center gap-2 mb-10">
            <ShieldAlert className="w-3 h-3 text-white/20" />
            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Grid Status: Cleared</span>
          </div>

          <div className="w-full flex gap-4">
            <div className="flex-1 p-5 glass rounded-[2rem] flex flex-col items-center">
              <span className="text-[10px] text-white/20 uppercase tracking-widest mb-2 font-black">Efficiency</span>
              <span className="text-2xl font-display text-white">{Math.floor(player.winRate || 50)}%</span>
            </div>
            <div className="flex-1 p-5 glass rounded-[2rem] flex flex-col items-center">
              <span className="text-[10px] text-white/20 uppercase tracking-widest mb-2 font-black">Rep Score</span>
              <span className="text-2xl font-display text-accent">9.8</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

