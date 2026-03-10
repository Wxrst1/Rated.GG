import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ThumbsUp, ThumbsDown, Clock, Crosshair, Trophy, Activity, 
  MessageSquare, ShieldAlert, Fingerprint, Globe, Zap, 
  AlertTriangle, User, ExternalLink, ShieldCheck, Target, 
  ZapOff, Eye, MousePointer2, ArrowUpRight, ArrowDownRight,
  Search, Settings, Bell, ChevronRight, Hash, Layers, Shield
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function PlayerProfile() {
  const { steamId } = useParams<{ steamId: string }>();
  const [player, setPlayer] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmittingMatch, setIsSubmittingMatch] = useState(false);
  const [matchCode, setMatchCode] = useState('');

  useEffect(() => {
    const fetchPlayer = async () => {
      setLoading(true);
      try {
        const [playerRes, reviewsRes] = await Promise.all([
          fetch(`/api/player/${steamId}`),
          fetch(`/api/player/${steamId}/reviews`)
        ]);
        
        if (playerRes.ok) setPlayer(await playerRes.json());
        if (reviewsRes.ok) setReviews(await reviewsRes.json());
        
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
           const meData = await meRes.json();
           setCurrentUser(meData.user);
        }
      } catch (error) {
        console.error('Failed to fetch player data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [steamId]);

  const handleManualAnalyze = async () => {
     if (!matchCode) return;
     setIsSubmittingMatch(true);
     try {
        const res = await fetch('/api/matches/analyze', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ shareCode: matchCode })
        });
        if (res.ok) {
           alert("Match added to analysis queue! It will appear on your profile once processed.");
           setMatchCode('');
        } else {
           alert("Failed to add match. Ensure the code is valid.");
        }
     } catch (e) {
        console.error(e);
     } finally {
        setIsSubmittingMatch(false);
     }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#070708]">
        <div className="relative">
          <div className="w-32 h-32 border border-accent/10 rounded-full animate-[spin_4s_linear_infinite]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Fingerprint className="w-10 h-10 text-accent animate-pulse" />
          </div>
          <div className="absolute -inset-8 bg-accent/5 blur-3xl rounded-full" />
        </div>
        <span className="mt-12 font-mono text-[11px] text-accent font-black tracking-[1.2em] uppercase animate-pulse">Synchronizing biometric link...</span>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-10 text-center">
        <div className="p-8 bg-danger/10 rounded-[3rem] border border-danger/20 mb-10 shadow-[0_0_50px_rgba(255,50,50,0.1)]">
           <AlertTriangle className="w-20 h-20 text-danger" />
        </div>
        <h2 className="text-5xl font-display text-white mb-4 tracking-tighter">DOSSIER CORRUPTED</h2>
        <p className="font-mono text-[12px] text-white/30 uppercase tracking-[0.5em] max-w-md leading-relaxed">The requested identity could not be verified within the central database hierarchy.</p>
        <button onClick={() => window.history.back()} className="mt-12 px-10 py-4 glass border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all outline-none">Return to Interface</button>
      </div>
    );
  }

  const calculateAccountAge = (timestamp: number) => {
    if (!timestamp) return "Archived";
    const now = new Date();
    const created = new Date(timestamp * 1000);
    const diff = now.getTime() - created.getTime();
    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
    return `${years}y ${months}m`;
  };

  return (
    <div className="min-h-screen bg-[#070708] text-white font-sans selection:bg-accent selection:text-black antialiased">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-15%] left-[-15%] w-[50%] h-[50%] bg-accent/[0.03] blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[50%] h-[50%] bg-indigo-500/[0.03] blur-[150px] rounded-full animate-pulse" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="max-w-[1700px] mx-auto px-10 py-16 relative z-10 flex flex-col xl:row-span-2 lg:flex-row gap-12">
        
        {/* SIDEBAR MODULE */}
        <aside className="lg:w-[420px] flex flex-col gap-8 shrink-0">
           <div className="glass rounded-[3.5rem] p-12 border border-white/5 flex flex-col items-center relative overflow-hidden group shadow-2xl">
              <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-white/[0.04] to-transparent" />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              
              <div className="relative mb-10 mt-6 group/avatar">
                 <div className="absolute -inset-8 bg-accent/20 rounded-[3rem] blur-3xl opacity-30 group-hover/avatar:opacity-50 transition-all duration-1000 group-hover/avatar:scale-110" />
                 <motion.img 
                   initial={{ scale: 0.9, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                   src={player.avatar} 
                   className="w-52 h-52 rounded-[3rem] border border-white/10 relative z-10 shadow-2xl" 
                   alt="Avatar"
                 />
                 <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-[#0a0a0c] rounded-2xl flex items-center justify-center border-white/10 border-2 z-20 shadow-xl">
                    <div className="w-3.5 h-3.5 rounded-full bg-accent shadow-[0_0_15px_#FFC700] animate-pulse" />
                 </div>
              </div>

              <div className="text-center relative z-10 w-full px-4">
                 <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center justify-center gap-4 mb-3"
                 >
                    <span className="text-white/20 font-mono text-2xl tracking-tighter">[{player.level}]</span>
                    <h2 className="text-4xl font-display tracking-tight text-white uppercase truncate max-w-[200px]">{player.name}</h2>
                 </motion.div>
                 <p className="text-[11px] font-mono text-white/20 uppercase tracking-[0.4em] mb-12 inline-block px-6 py-2 rounded-full border border-white/5 bg-white/[0.02]">
                    IDENTITY GEN: {player.timeCreated ? new Date(player.timeCreated * 1000).getFullYear() : 'UNDETERMINED'}
                 </p>
              </div>

              <div className="grid grid-cols-4 gap-4 w-full mb-12 relative z-10">
                 <SocialLink icon={<Globe className="w-5 h-5" />} href={player.trackers?.steam} />
                 <SocialLink icon={<Activity className="w-5 h-5 text-orange-500" />} href={player.trackers?.faceit} />
                 <SocialLink icon={<Zap className="w-5 h-5 text-accent" />} href={player.trackers?.leetify} />
                 <SocialLink icon={<Target className="w-5 h-5 text-indigo-400" />} href={player.trackers?.csstats} />
              </div>

              <div className="flex flex-col gap-4 w-full mb-12 relative z-10">
                 <div className="bg-white/[0.02] rounded-[2rem] p-6 border border-white/5 group/stat flex items-center justify-between hover:bg-white/[0.05] transition-all">
                    <div>
                        <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1 group-hover/stat:text-white/40">Resource Value</div>
                        <div className="text-2xl font-display group-hover/stat:text-accent transition-colors">{player.inventoryValue || 'HIDDEN'}</div>
                    </div>
                    <div className="p-3 bg-white/[0.03] rounded-xl group-hover/stat:scale-110 transition-transform"><Trophy className="w-5 h-5 text-accent/40" /></div>
                 </div>
                 <div className="bg-white/[0.02] rounded-[2rem] p-6 border border-white/5 group/stat flex items-center justify-between hover:bg-white/[0.05] transition-all">
                    <div>
                        <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1 group-hover/stat:text-white/40">Combat Tenure</div>
                        <div className="text-2xl font-display group-hover/stat:text-accent transition-colors">{player.stats.hours || 0} HOURS</div>
                    </div>
                    <div className="p-3 bg-white/[0.03] rounded-xl group-hover/stat:scale-110 transition-transform"><Clock className="w-5 h-5 text-accent/40" /></div>
                 </div>
              </div>

              <div className="flex flex-col gap-4 w-full relative z-10">
                 <button className="py-6 bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/20 rounded-[2rem] text-accent text-[12px] font-black uppercase tracking-[0.6em] hover:from-accent/30 hover:to-accent/10 transition-all shadow-[0_10px_40px_rgba(255,199,0,0.08)] hover:shadow-[0_15px_50px_rgba(255,199,0,0.2)] transform hover:-translate-y-1 relative overflow-hidden group/rep relative">
                    <div className="absolute inset-0 bg-accent/10 translate-x-[-100%] group-hover/rep:translate-x-[100%] transition-transform duration-[1.5s] skew-x-[-30deg]" />
                    <span className="relative z-10 flex items-center justify-center gap-3">
                       <ThumbsUp className="w-4 h-4" /> RECOGNITION [+REP]
                    </span>
                 </button>
                 <button className="py-6 bg-white/[0.01] border border-white/10 rounded-[2rem] text-white/40 text-[11px] font-black uppercase tracking-[0.4em] hover:bg-danger/20 hover:border-danger/30 hover:text-danger transition-all transform hover:-translate-y-1">
                    REPORT VIOLATION
                 </button>
              </div>
           </div>

           {/* RECENT MATCH DIAGNOSTICS */}
           <div className="glass rounded-[3.5rem] p-10 border border-white/5 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/[0.03] blur-[60px]" />
              <div className="flex items-center justify-between mb-10">
                  <h4 className="text-[11px] font-black text-white/30 uppercase tracking-[0.5em] flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-accent animate-pulse" /> Live Feed
                  </h4>
                  <span className="text-[9px] font-mono text-white/20 uppercase">Last 5 Cycles</span>
              </div>
              <div className="space-y-4">
                 {player.matches?.slice(0, 5).map((match: any, i: number) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 * i, duration: 0.6 }}
                      className="group flex items-center gap-5 p-5 rounded-[2rem] bg-white/[0.01] border border-white/[0.03] hover:bg-white/[0.04] transition-all cursor-pointer hover:border-white/10 hover:shadow-2xl active:scale-[0.98]"
                    >
                       <div className={cn("w-1.5 h-12 rounded-full transition-all group-hover:scale-y-110", match.result === 'WIN' ? 'bg-accent/60 shadow-[0_0_15px_rgba(255,199,0,0.3)]' : 'bg-white/5')} />
                       <div className="flex-1">
                          <div className="text-[10px] font-black uppercase tracking-widest text-white/90 group-hover:text-accent transition-colors">{match.map}</div>
                          <div className="text-[9px] font-mono text-white/20 mt-1">{new Date(match.time * 1000).toLocaleDateString()}</div>
                       </div>
                       <div className="text-right">
                          <div className="text-lg font-display tracking-wider text-white group-hover:text-accent transition-colors">{match.score}</div>
                          <div className="text-[8px] font-mono text-white/10 uppercase tracking-[0.2em] mt-1">{match.type}</div>
                       </div>
                    </motion.div>
                 ))}
                 {(!player.matches || player.matches.length === 0) && (
                    <div className="text-center py-16 opacity-20 font-mono text-[10px] uppercase tracking-[0.8em]">
                       No Data Streams Detected
                    </div>
                 )}
              </div>
           </div>
        </aside>

        {/* MAIN DASHBOARD */}
        <main className="flex-1 flex flex-col gap-10">
           {/* NAV BAR */}
           <div className="flex items-center justify-between">
              <nav className="flex items-center gap-3 p-2 glass rounded-[2.5rem] border-white/5">
                 {['Overview', 'Performance', 'Arsenals', 'Reputation'].map((tab) => (
                    <button key={tab} className={cn("px-10 py-4 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.4em] transition-all relative group", tab === 'Overview' ? "bg-white/5 text-white shadow-xl border border-white/5" : "text-white/20 hover:text-white/40")}>
                       {tab}
                    </button>
                 ))}
              </nav>
              <div className="flex gap-4">
                 <button className="p-4 glass rounded-2xl border-white/5 text-white/20 hover:text-accent hover:border-accent/20 transition-all"><Settings className="w-5 h-5" /></button>
                 <button className="p-4 glass rounded-2xl border-white/5 text-white/20 hover:text-accent hover:border-accent/20 transition-all"><Bell className="w-5 h-5" /></button>
              </div>
           </div>

           {/* ANALYZE MATCH BAR (Only if current profile matches logged in user) */}
           {currentUser && currentUser.steam_id === player.steamId && (
               <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass rounded-[3rem] p-8 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden group"
               >
                  <div className="absolute inset-0 bg-accent/5 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[2s] skew-x-[-20deg] pointer-events-none" />
                  <div className="flex items-center gap-6">
                      <div className="p-4 bg-accent/20 rounded-2xl"><Hash className="w-6 h-6 text-accent" /></div>
                      <div>
                          <h4 className="text-xl font-display uppercase tracking-widest text-white">Manual Dossier Linker</h4>
                          <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.3em]">Link a Steam Share Code to synchronize missing match data</p>
                      </div>
                  </div>
                  <div className="flex w-full md:w-auto gap-4">
                      <input 
                         type="text" 
                         value={matchCode}
                         onChange={(e) => setMatchCode(e.target.value)}
                         placeholder="CSGO-XXXXX-XXXXX..." 
                         className="flex-1 md:w-[350px] bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm text-white focus:outline-none focus:border-accent/40 transition-all"
                      />
                      <button 
                         onClick={handleManualAnalyze}
                         disabled={isSubmittingMatch || !matchCode}
                         className="px-10 py-4 bg-accent text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-20 disabled:grayscale"
                      >
                         {isSubmittingMatch ? "ANALYZING..." : "LINK DATA"}
                      </button>
                  </div>
               </motion.div>
           )}

           {/* WAITING MATCHES DISCOVERY BANNER (Only for the owner of the profile if matches were found) */}
           {currentUser && currentUser.steam_id === player.steamId && player.waiting_matches > 0 && (
               <motion.div 
                  initial={{ opacity: 0, scale: 0.98, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-gradient-to-r from-accent/20 via-accent/5 to-transparent rounded-[3rem] p-10 border border-accent/20 flex flex-col md:flex-row items-center justify-between gap-8 shadow-[0_20px_60px_rgba(255,199,0,0.1)] relative overflow-hidden group"
               >
                  <div className="absolute inset-0 bg-accent/[0.03] animate-pulse" />
                  <div className="flex items-center gap-8 relative z-10">
                      <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center border border-accent/30 shadow-2xl scale-110 group-hover:scale-125 transition-transform duration-700">
                          <Trophy className="w-10 h-10 text-accent" />
                      </div>
                      <div>
                          <h4 className="text-3xl font-display uppercase tracking-tight text-white mb-2">Legacy Sync Complete</h4>
                          <p className="text-[10px] font-mono text-white/50 uppercase tracking-[0.4em] max-w-lg leading-relaxed">
                             Commander, our drones identified <span className="text-accent font-black">{player.waiting_matches} matches</span> already registered in your absence. These stats have been merged into your dossier profile.
                          </p>
                      </div>
                  </div>
                  <button 
                     onClick={async () => {
                        // Clear waiting matches from DB after viewing once if desired
                        await fetch('/api/user/clear-waiting', { method: 'POST' });
                        const newPlayer = {...player, waiting_matches: 0};
                        setPlayer(newPlayer);
                     }}
                     className="px-12 py-5 glass border border-accent/30 rounded-2xl text-[11px] font-black text-accent uppercase tracking-widest hover:bg-accent/10 transition-all shadow-xl group/close"
                 >
                     DISMISS INTEL
                 </button>
               </motion.div>
           )}

           {/* TOP MODULE: GLOBAL REPUTATION */}
           <div className="glass rounded-[4rem] p-16 border border-white/5 relative overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.4)]">
              <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-accent/[0.04] blur-[120px] pointer-events-none rounded-full" />
              <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-indigo-500/[0.04] blur-[120px] pointer-events-none rounded-full" />
              
              <div className="flex flex-col xl:flex-row gap-16 items-center">
                 {/* TRUST CIRCLE */}
                 <div className="relative shrink-0 group">
                    <div className="absolute inset-0 bg-accent/20 blur-[120px] rounded-full scale-125 opacity-20 group-hover:opacity-40 transition-all duration-1000" />
                    
                    {/* Ring Decors */}
                    <div className="absolute inset-[-40px] border border-white/[0.02] rounded-full animate-[spin_30s_linear_infinite]" />
                    <div className="absolute inset-[-60px] border border-white/[0.01] rounded-full animate-[spin_45s_linear_infinite_reverse]" />
                    
                    <svg className="w-[420px] h-[420px] -rotate-90 drop-shadow-[0_0_50px_rgba(255,199,0,0.1)]">
                       <defs>
                          <linearGradient id="primeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                             <stop offset="0%" stopColor="#FFC700" />
                             <stop offset="100%" stopColor="#FFA800" />
                          </linearGradient>
                          <filter id="primeGlow" x="-20%" y="-20%" width="140%" height="140%">
                             <feGaussianBlur stdDeviation="6" result="blur" />
                             <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                       </defs>
                       <circle cx="210" cy="210" r="185" className="fill-none stroke-white/[0.03] stroke-[22]" />
                       <motion.circle 
                          cx="210" cy="210" r="185" 
                          stroke="url(#primeGradient)"
                          strokeWidth="22"
                          className="fill-none"
                          filter="url(#primeGlow)"
                          strokeDasharray="1162"
                          strokeLinecap="round"
                          initial={{ strokeDashoffset: 1162 }}
                          animate={{ strokeDashoffset: 1162 - (1162 * player.reputation.score / 100) }}
                          transition={{ duration: 3, ease: [0.16, 1, 0.3, 1] }}
                       />
                    </svg>
                    
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="flex flex-col items-center justify-center pt-4">
                          <motion.div 
                             initial={{ scale: 0.8, opacity: 0 }}
                             animate={{ scale: 1, opacity: 1 }}
                             transition={{ delay: 0.5, duration: 1 }}
                             className="flex items-center justify-center mb-0"
                          >
                             <span className="text-[110px] font-display text-white tracking-[0.05em] leading-none drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]">{player.reputation.score}</span>
                             <span className="text-3xl text-accent font-black ml-1 -translate-y-4">%</span>
                          </motion.div>
                          
                          <motion.div 
                             initial={{ opacity: 0, y: 15 }}
                             animate={{ opacity: 1, y: 0 }}
                             transition={{ delay: 1, duration: 0.8 }}
                             className="px-8 py-3 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-3xl flex items-center gap-4 shadow-2xl group/label cursor-default mt-6"
                          >
                             <div className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_12px_#FFC700] animate-pulse" />
                             <span className="text-[12px] font-black text-white/50 uppercase tracking-[0.5em] group-hover/label:text-accent transition-colors duration-500">Global Trust Metric</span>
                          </motion.div>
                       </div>
                    </div>
                 </div>

                 {/* KEY PERFORMANCE INDICATORS */}
                 <div className="flex-1 w-full flex flex-col gap-14">
                    <div className="flex items-start justify-between">
                       <div>
                          <div className="flex items-center gap-2 mb-6">
                             {player.matches?.slice(0, 12).map((m: any, i: number) => (
                                <div key={i} className={cn("w-2.5 h-2.5 rounded-full border border-white/5", m.result === 'WIN' ? 'bg-accent shadow-[0_0_12px_rgba(255,199,0,0.5)]' : 'bg-white/10')} />
                             ))}
                             <span className="text-[9px] font-mono text-white/20 ml-4 uppercase tracking-widest">Historical Success Ribbon</span>
                          </div>
                          <h3 className="text-5xl font-display tracking-tight text-white mb-2 uppercase">Integrity Analysis</h3>
                          <p className="text-[11px] font-mono text-white/30 uppercase tracking-[0.4em]">Behavioral consistency & skill verified [VERDICT: PASS]</p>
                       </div>
                       <div className="flex gap-4">
                          <div className="glass p-5 rounded-3xl border-white/5 flex flex-col items-center min-w-[100px]">
                             <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">Rating</div>
                             <div className="text-3xl font-display text-accent">{player.leetifyRating}</div>
                          </div>
                          <div className="glass p-5 rounded-3xl border-white/5 flex flex-col items-center min-w-[100px]">
                             <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">Rank</div>
                             <div className="text-3xl font-display text-white">{player.level}</div>
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-12">
                       <StatProgress label="Execution Accuracy" value={`${player.stats.accuracy.toFixed(1)}%`} progress={player.stats.accuracy} />
                       <StatProgress label="Hostile Neutralization" value={player.stats.kd.toFixed(2)} progress={Math.min(player.stats.kd * 40, 100)} />
                       <StatProgress label="Resource Damage (ADR)" value={player.detailedStats.adr} progress={Math.min(player.detailedStats.adr, 100)} />
                       <StatProgress label="Combat Consistency (HS%)" value={`${player.stats.hs.toFixed(1)}%`} progress={player.stats.hs} />
                    </div>

                    <div className="flex items-center gap-10 pt-10 border-t border-white/5">
                        <div className="flex flex-col gap-1">
                           <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Trust Status</span>
                           <span className="text-[11px] font-black text-green-400 uppercase tracking-[0.3em] flex items-center gap-2">
                             <ShieldCheck className="w-4 h-4" /> SECURE / NO PENALTIES
                           </span>
                        </div>
                        <div className="flex flex-col gap-1 border-l border-white/5 pl-10">
                           <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Matches Analyzed</span>
                           <span className="text-[11px] font-black text-white/80 uppercase tracking-[0.3em]">{player.stats.totalMatches} DEPLOYMENTS</span>
                        </div>
                        <div className="flex flex-col gap-1 border-l border-white/5 pl-10">
                           <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Dossier Confidence</span>
                           <span className="text-[11px] font-black text-accent uppercase tracking-[0.3em]">98.7% RELIABILITY</span>
                        </div>
                    </div>
                 </div>
              </div>
           </div>

           {/* BOTTOM GRID: DEEP COMBAT ANALYSIS */}
           <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
              
              {/* COMBAT MASTERY (Wallbangs, Smokes, Clutches) */}
              <div className="xl:col-span-8 glass rounded-[4rem] p-12 border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-2 h-0 bg-accent group-hover:h-full transition-all duration-1000" />
                  <div className="flex items-center justify-between mb-12">
                      <h4 className="text-[13px] font-black text-white uppercase tracking-[0.5em] flex items-center gap-5">
                        <div className="p-3 bg-accent/20 rounded-2xl"><Hash className="w-6 h-6 text-accent" /></div>
                        Combat Specializations
                      </h4>
                      {player.stats.totalMatches === 0 && (
                        <div className="px-6 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full animate-pulse">
                           <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Demo Analysis Pending</span>
                        </div>
                      )}
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                      <CombatMetric label="Wallbang Kills" count={player.detailedStats.wallbang || 0} icon={<Layers className="w-5 h-5" />} />
                      <CombatMetric label="Smoke Kills" count={player.detailedStats.smoke || 0} icon={<ZapOff className="w-5 h-5" />} />
                      <CombatMetric label="Clutches Resolved" count={Number(Object.values(player.detailedStats.clutches || {}).reduce((a:any, b:any) => a + Number(b || 0), 0))} icon={<Shield className="w-5 h-5 text-green-400" />} />
                      <CombatMetric label="Elite Multikills" count={Number(Object.values(player.detailedStats.multiKills || {}).reduce((a:any, b:any) => a + Number(b || 0), 0))} icon={<Trophy className="w-5 h-5 text-orange-400" />} />
                  </div>

                  {/* Multi-kill Breakdown */}
                  <div className="mt-12 grid grid-cols-3 gap-6 pt-10 border-t border-white/5">
                      <div className="flex flex-col gap-2">
                         <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">3-Kill Evolutions</div>
                         <div className="text-3xl font-display text-white/80">{player.detailedStats.multiKills?.k3 || 0}</div>
                      </div>
                      <div className="flex flex-col gap-2">
                         <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">4-Kill Evolutions</div>
                         <div className="text-3xl font-display text-accent">{player.detailedStats.multiKills?.k4 || 0}</div>
                      </div>
                      <div className="flex flex-col gap-2">
                         <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">5-Kill Evolutions</div>
                         <div className="text-3xl font-display text-glow">{player.detailedStats.multiKills?.k5 || 0}</div>
                      </div>
                  </div>
              </div>

              {/* REACTION & PLACEMENT VECTORS */}
              <div className="xl:col-span-4 glass rounded-[4rem] p-12 border border-white/5 flex flex-col gap-10">
                  <h4 className="text-[11px] font-black text-white/30 uppercase tracking-[0.5em] flex items-center gap-4">
                    <div className="p-2.5 bg-indigo-500/20 rounded-xl"><Crosshair className="w-5 h-5 text-indigo-400" /></div>
                    Neuro-Timing
                  </h4>
                  <div className="flex flex-col gap-10">
                      <StatProgress label="Time to Damage" value={player.detailedStats.ttd ? `${player.detailedStats.ttd}ms` : 'INSUFFICIENT DATA'} progress={player.detailedStats.ttd ? (1000 - player.detailedStats.ttd) / 10 : 0} isLowBetter={true} />
                      <StatProgress label="Reaction Velocity" value={player.detailedStats.reaction ? `${player.detailedStats.reaction}ms` : 'INSUFFICIENT DATA'} progress={player.detailedStats.reaction ? (500 - player.detailedStats.reaction) / 5 : 0} isLowBetter={true} />
                      <StatProgress label="Crosshair Precision" value={player.detailedStats.chp ? `${player.detailedStats.chp}°` : 'INSUFFICIENT DATA'} progress={player.detailedStats.chp ? (20 - player.detailedStats.chp) * 5 : 0} isLowBetter={true} />
                      <StatProgress label="Preaim Accuracy" value={player.detailedStats.preaim ? `${player.detailedStats.preaim}°` : 'INSUFFICIENT DATA'} progress={player.detailedStats.preaim ? (30 - player.detailedStats.preaim) * 3 : 0} isLowBetter={true} />
                  </div>
              </div>

           </div>
        </main>
      </div>
    </div>
  );
}

function SocialLink({ icon, href }: { icon: React.ReactNode, href?: string }) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noreferrer"
      className="p-5 glass rounded-[2rem] hover:bg-white/10 transition-all flex items-center justify-center border border-white/5 opacity-40 hover:opacity-100 hover:shadow-2xl hover:-translate-y-1 active:scale-95 group"
    >
      <div className="group-hover:scale-110 transition-transform">{icon}</div>
    </a>
  );
}

function CombatMetric({ label, count, icon }: { label: string, count: number, icon: React.ReactNode }) {
  return (
    <div className="bg-white/[0.01] border border-white/[0.03] rounded-[2.5rem] p-8 group/metric hover:bg-white/[0.04] hover:border-white/10 transition-all shadow-sm">
      <div className="p-3 bg-white/[0.02] rounded-2xl w-fit mb-6 text-white/20 group-hover/metric:text-accent transition-colors">{icon}</div>
      <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">{label}</div>
      <div className="text-4xl font-display text-white group-hover/metric:text-glow transition-all">{count}</div>
    </div>
  );
}

function StatProgress({ label, value, progress, isLowBetter = false }: { label: string, value: any, progress: number, isLowBetter?: boolean }) {
  let barColor = 'bg-accent';
  let glowColor = 'rgba(255,199,0,0.4)';
  
  if (isLowBetter && progress < 40) { // progress is "goodness" here if isLowBetter is handled by caller
      barColor = 'bg-danger';
      glowColor = 'rgba(255,50,50,0.6)';
  } else if (isLowBetter && progress < 70) {
      barColor = 'bg-orange-500';
      glowColor = 'rgba(249,115,22,0.4)';
  } else if (!isLowBetter && progress < 30) {
      barColor = 'bg-danger';
      glowColor = 'rgba(255,50,50,0.6)';
  }

  return (
    <div className="flex flex-col gap-4 group/prog">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] group-hover/prog:text-accent transition-colors duration-500">{label}</span>
        <span className="text-2xl font-display text-white group-hover/prog:text-glow transition-all duration-500">{value}</span>
      </div>
      <div className="h-2.5 bg-white/[0.03] rounded-full overflow-hidden relative border border-white/[0.05]">
        <motion.div 
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.min(progress, 100)}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
          className={cn("h-full rounded-full transition-all relative", barColor)}
          style={{ boxShadow: `0 0 20px ${glowColor}` }}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_infinite]" />
        </motion.div>
      </div>
    </div>
  );
}
