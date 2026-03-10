import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldCheck, Zap, Activity, ArrowRight, MousePointer2, Fingerprint, Globe, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [titleIndex, setTitleIndex] = useState(0);
  const [stats, setStats] = useState({ playersIndexed: 9700000, activeUsers: 559100, reportsSubmitted: 8200 });
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [livePreview, setLivePreview] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const titles = ["Expose Cheaters", "Verify Enemies", "Know Truth"];
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  
  useEffect(() => {
    // Cycle Title
    const interval = setInterval(() => {
      setTitleIndex((prev) => (prev + 1) % titles.length);
    }, 4500);

    // Fetch Real Stats
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => {});

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
    <div className="flex flex-col items-center bg-background min-h-screen relative overflow-x-hidden selection:bg-accent selection:text-black font-sans">
      {/* --- ELITE DESIGN LAYERS --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 mesh-gradient opacity-30" />
        <div className="absolute inset-0 noise" />
        
        {/* Animated Background Depth */}
        <motion.div 
          style={{ y: y1 }}
          className="absolute top-[-10%] left-[-10%] w-[120vw] h-[120vh] bg-accent/[0.03] rounded-full blur-[200px]" 
        />
        <motion.div 
          style={{ y: y2 }}
          className="absolute bottom-[-20%] right-[-10%] w-[100vw] h-[100vh] bg-indigo-500/[0.04] rounded-full blur-[220px]" 
        />
      </div>

      {/* --- HERO SECTION --- */}
      <section className="w-full max-w-7xl mx-auto px-6 pt-64 pb-48 relative z-10 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ opacity }}
          className="mb-10 flex items-center gap-3 px-6 py-2 glass rounded-full"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_12px_var(--color-accent)] animate-pulse" />
          <span className="text-[10px] font-mono font-black text-white/40 uppercase tracking-[0.4em]">Grid Deployment Active Node // c7x-9</span>
        </motion.div>

        {/* Improved Dynamic Headline with no cutoff */}
        <div className="h-[14rem] md:h-[22rem] mb-12 flex items-center justify-center w-full relative">
           <AnimatePresence mode="wait">
             <motion.h1 
               key={titles[titleIndex]}
               initial={{ opacity: 0, y: 60, scale: 0.95, filter: 'blur(20px)' }}
               animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
               exit={{ opacity: 0, y: -60, scale: 1.05, filter: 'blur(20px)' }}
               transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
               className="text-[6rem] md:text-[14rem] font-display text-white tracking-tighter leading-[0.85] text-center select-none"
             >
               {titles[titleIndex]}
             </motion.h1>
           </AnimatePresence>
        </div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ opacity }}
          className="text-lg md:text-xl text-white/30 max-w-2xl text-center font-sans mb-24 leading-relaxed font-light mt-[-2rem]"
        >
          Transcend the scoreboard. Audit behavioral patterns and 
          uncover the forensic truth of every competitor.
        </motion.p>

        {/* High-End Search Interface */}
        <div className="w-full max-w-4xl relative mb-32">
          <motion.form 
            onSubmit={handleSearch}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="relative h-fit"
          >
            <div className={cn(
              "absolute inset-[-2px] bg-gradient-to-r from-accent to-indigo-500 rounded-[3rem] blur-[30px] transition-all duration-1000 opacity-0 group-hover:opacity-20",
              isFocused && "opacity-40 scale-[1.05]"
            )} />
            
            <div className={cn(
              "relative glass rounded-[3rem] p-6 pr-8 flex items-center transition-all duration-700 overflow-hidden",
              isFocused ? "border-accent/40 shadow-[0_0_100px_rgba(255,199,0,0.1)]" : "border-white/5"
            )}>
              {/* Scanline Effect inside Search Bar */}
              {isFocused && <div className="scanline opacity-[0.1]" />}
              
              <Search className={cn("w-8 h-8 ml-6 mr-6 transition-all duration-700", isFocused ? "text-accent scale-110" : "text-white/20")} />
              <input 
                type="text" 
                value={searchQuery}
                spellCheck={false}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                placeholder="ID, URL, or SteamID... (Scanning for nodes)" 
                className="bg-transparent border-none outline-none text-white text-2xl w-full placeholder:text-white/5 font-mono font-medium tracking-tight"
              />
              <button 
                type="submit" 
                className="bg-accent text-black font-black px-12 py-5 rounded-[2.2rem] transition-all transform active:scale-95 hover:brightness-110 shadow-[0_0_50px_rgba(255,199,0,0.3)] tracking-widest text-[11px] leading-none"
              >
                DEPLOY
              </button>
            </div>

            {/* PREVIEW DROPDOWN REDESIGN */}
            <AnimatePresence>
              {(isFocused && (searchQuery.length >= 3 || (topPlayers && topPlayers.length > 0))) && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.98 }}
                  className="absolute top-[120%] left-0 right-0 glass rounded-[3.5rem] overflow-hidden shadow-[0_100px_300px_rgba(0,0,0,1)] z-[200] p-4 border-white/5"
                >
                  <div className="px-12 py-8 flex items-center justify-between border-b border-white/5 mb-4">
                    <span className="text-[10px] text-white/20 font-black uppercase tracking-[0.5em] flex items-center gap-5">
                      <Fingerprint className="w-4 h-4" /> Identification Queue
                    </span>
                    {isSearching && <span className="text-[10px] text-accent animate-pulse font-black uppercase tracking-widest">Processing Data Grid...</span>}
                  </div>
                  
                  <div className="space-y-3 pb-4">
                    {livePreview && (
                      <div 
                        className="mx-3 p-8 glass hover:bg-accent/[0.08] hover:border-accent/30 transition-all cursor-pointer flex items-center justify-between"
                        onClick={() => navigate(`/player/${livePreview.steamId}`)}
                      >
                        <div className="flex items-center gap-10">
                          <img src={livePreview.avatar} className="w-24 h-24 rounded-[2.5rem] border-2 border-white/10" />
                          <div>
                            <div className="text-3xl font-bold text-white tracking-tight mb-2">{livePreview.name}</div>
                            <div className="flex items-center gap-4">
                              <span className="text-[11px] text-accent font-black uppercase tracking-widest px-4 py-1.5 bg-accent/20 rounded-xl">{livePreview.cs2Rank}</span>
                              <span className="text-[11px] text-white/30 font-mono">NODE IDENTIFIED</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-12 mr-10 scale-125 origin-right">
                           <div className="text-right">
                             <div className="text-3xl font-display text-white">{livePreview.score}%</div>
                             <div className="text-[9px] font-black text-white/20 tracking-widest uppercase">Reputation</div>
                           </div>
                           <ArrowRight className="w-6 h-6 text-white/20" />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>
        </div>

        {/* Shortcut Guide - Extreme Beauty Redesign */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="w-full max-w-2xl relative p-[1px] rounded-[3rem] bg-gradient-to-r from-transparent via-white/20 to-transparent group"
        >
          <div className="bg-background glass backdrop-blur-[100px] rounded-[2.95rem] p-10 flex items-center gap-10 overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 blur-[100px] pointer-events-none" />
             <div className="p-6 glass rounded-[2.2rem] group-hover:rotate-[15deg] transition-transform duration-700 shadow-2xl">
               <MousePointer2 className="w-10 h-10 text-accent" />
             </div>
             <div className="text-left flex-1">
                <span className="text-accent font-black tracking-[0.6em] text-[10px] mb-3 block uppercase">System Shortcut</span>
                <p className="text-white text-[16px] leading-relaxed font-sans font-light">
                   Prepend <span className="bg-accent text-black px-2 py-0.5 rounded-md font-black mx-1">i</span> to <span className="text-white font-mono opacity-40">steamcommunity.com</span> for instant reputation auditing.
                </p>
                <div className="mt-4 flex items-center gap-3">
                   <div className="px-4 py-1.5 glass rounded-full text-[10px] font-mono text-white/20 group-hover:text-accent/60 transition-colors uppercase tracking-widest">
                     isteamcommunity.com/id/propain
                   </div>
                </div>
             </div>
          </div>
        </motion.div>

        {/* Giant Stats Interface */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-24 mt-52 w-full max-w-5xl relative">
          <StatBox value={stats.playersIndexed} label="ID DATASET" sub="TOTAL SCRAPED NODES" accent="gold" delay={0.9} />
          <StatBox value={stats.activeUsers} label="ACTIVE SCANS" sub="REAL-TIME REQUESTS" accent="indigo" delay={1.0} />
          <StatBox value={stats.reportsSubmitted} label="TRUTH VERDICTS" sub="AUDITED INTEGRITY" accent="danger" delay={1.1} />
        </div>
      </section>

      {/* --- THE PROTOCOL --- */}
      <section className="w-full py-80 relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-52">
             <h2 className="text-[10rem] md:text-[18rem] font-display text-white tracking-widest absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.015] select-none pointer-events-none uppercase">Grid</h2>
             <span className="text-accent font-black tracking-[0.8em] text-[12px] mb-8 block uppercase">Process Architecture</span>
             <h3 className="text-7xl md:text-9xl font-display text-white tracking-tighter">THE CSWH PROTOCOL</h3>
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

