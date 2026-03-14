import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  ThumbsUp, Clock, Trophy, Activity, 
  ShieldAlert, Globe, 
  User, ShieldCheck, Target, 
  ArrowUpRight, ChevronRight, Shield,
  Calendar, History, ChevronDown, ActivitySquare,
  AlertTriangle, Settings, Archive
} from 'lucide-react';
import { cn } from '../lib/utils';

// --- UTILS ---
const getAccountAge = (timestamp?: number) => {
  if (!timestamp) return 'Loading...';
  const date = new Date(timestamp * 1000);
  const diff = Date.now() - date.getTime();
  const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  const months = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30));
  return `${years}y ${months}m`;
}

const getJoinDate = (timestamp?: number) => {
   if (!timestamp) return '---';
   const date = new Date(timestamp * 1000);
   return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const getMapThumbnail = (mapName: string) => {
   const m = (mapName || '').toLowerCase();
   const baseUrl = 'https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/map_icons/maps';
   if (m.includes('mirage')) return `${baseUrl}/de_mirage.png`;
   if (m.includes('dust')) return `${baseUrl}/de_dust2.png`;
   if (m.includes('inferno')) return `${baseUrl}/de_inferno.png`;
   if (m.includes('anubis')) return `${baseUrl}/de_anubis.png`;
   if (m.includes('overpass')) return `${baseUrl}/de_overpass.png`;
   if (m.includes('ancient')) return `${baseUrl}/de_ancient.png`;
   if (m.includes('nuke')) return `${baseUrl}/de_nuke.png`;
   if (m.includes('vertigo')) return `${baseUrl}/de_vertigo.png`;
   return 'https://api.dicebear.com/7.x/identicon/svg?seed=map';
}

function StatBar({ label, value, unit, progress, reverseColor = false }: { label: string, value: string | number, unit?: string, progress: number, reverseColor?: boolean }) {
   // RATED.GG Styling: Using Gold/Accent or Danger for critical ones
   const isGood = reverseColor ? (progress < 50) : (progress > 50);
   const colorClass = isGood ? 'bg-accent' : 'bg-danger';
   const textColor = isGood ? 'text-accent' : 'text-danger';
   
   return (
      <div className="flex flex-col gap-1 w-full relative">
         <div className="flex justify-between items-center text-[10px] uppercase font-bold tracking-wider">
            <span className="text-muted">{label}</span>
            <span className={cn(textColor)}>{value}{unit}</span>
         </div>
         <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-1000", colorClass)} style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
         </div>
      </div>
   );
}

export default function PlayerProfile() {
  const { steamId } = useParams<{ steamId: string }>();
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [activeSubTab, setActiveSubTab] = useState('CSRep');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const playerRes = await fetch(`/api/player/${steamId}`);
        if (playerRes.ok) setPlayer(await playerRes.json());
      } catch (error) {
        console.error('Failed to fetch player data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [steamId]);

  useEffect(() => {
    if (player) {
      console.log(`[DEBUG] Identity: ${player.name} | Premier Rating: ${player.premierRating} | World Rank: ${player.worldRank}`);
    }
  }, [player]);

  // AUTOMATIC MAP STATS CALCULATION FROM BOT DATA
  const mapStats = useMemo(() => {
    if (!player?.matches) return [];
    const stats: Record<string, any> = {};
    
    player.matches.forEach((m: any) => {
      const mapName = m.map || 'Unknown';
      if (!stats[mapName]) {
        stats[mapName] = { name: mapName, matches: 0, wins: 0, kills: 0, deaths: 0, adrSum: 0, hsSum: 0, count: 0 };
      }
      stats[mapName].matches++;
      if (m.result === 'WIN') stats[mapName].wins++;
      stats[mapName].kills += (m.kills || 0);
      stats[mapName].deaths += (m.deaths || 0);
      stats[mapName].adrSum += (m.adr || 0);
      stats[mapName].hsSum += parseFloat(m.hs || '0');
      stats[mapName].count++;
    });

    return Object.values(stats).map((s: any) => ({
      name: s.name,
      matches: s.matches,
      wins: s.wins,
      losses: s.matches - s.wins,
      winRate: Math.round((s.wins / s.matches) * 100),
      kd: (s.kills / (s.deaths || 1)).toFixed(2),
      adr: (s.adrSum / s.count).toFixed(1),
      hs: (s.hsSum / s.count).toFixed(1) + '%'
    })).sort((a, b) => b.matches - a.matches).slice(0, 4);
  }, [player?.matches]);

  if (loading) return (
     <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-2 border-transparent border-t-accent rounded-full animate-spin mb-4" />
        <span className="text-xs text-muted uppercase tracking-widest font-mono">Accessing Forensic Database...</span>
     </div>
  );

  if (!player) return <div className="min-h-screen bg-background flex items-center justify-center text-muted text-xl tracking-widest uppercase font-display">Identity Not Found</div>;

  const trustScore = player.reputation?.score || 100;
  const detailed = player.detailedStats || {};
  const stats = player.stats || {};

  return (
    <div className="min-h-screen bg-background text-text font-sans selection:bg-accent/20 selection:text-white pb-20 pt-8 forensic-grid">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
         
         <div className="flex flex-col xl:flex-row gap-6 items-start">
            
            {/* SIDEBAR - Identity Dossier */}
            <aside className="w-full xl:w-[320px] flex-shrink-0 flex flex-col gap-4">
               <div className="glass-heavy rounded-xl p-6 flex flex-col items-center relative overflow-hidden">
                  <div className="scanline" />
                  
                  <div className="text-center mb-6 z-10 w-full">
                     <div className="flex flex-col items-center justify-center gap-1 mb-6">
                        <div className="flex items-center gap-2">
                           <span className="w-6 h-6 rounded-full border border-accent text-accent flex items-center justify-center text-[10px] font-bold">
                              {player.level || 0}
                           </span>
                           <h1 className="text-xl font-display font-black tracking-wider truncate max-w-[180px] uppercase">{player.name}</h1>
                        </div>
                        <div className="text-[10px] text-muted uppercase font-bold tracking-widest flex items-center gap-2">
                           <span>Joined: {getJoinDate(player.timeCreated)}</span>
                           <span className="w-1 h-1 rounded-full bg-white/10" />
                           <span className="text-accent/60">{getAccountAge(player.timeCreated)}</span>
                        </div>
                        <div className="text-[10px] text-[#00bcd4] font-black uppercase tracking-[0.2em] mt-1 pulse-opacity">Network Online</div>
                     </div>
                  </div>

                  <div className="relative mb-6 z-10 w-full flex justify-center">
                     <div className="relative inline-block">
                        <img src={player.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'} className="w-32 h-32 object-cover rounded-lg border border-white/10 shadow-xl" alt="Avatar" />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#00bcd4] border-2 border-surface" />
                     </div>
                     <div className="absolute -top-3 -right-2 w-10 h-10 rounded-full border-2 border-accent/40 flex items-center justify-center shadow-lg overflow-hidden bg-surface glass">
                        <Trophy className="w-6 h-6 text-accent" />
                     </div>
                  </div>

                  {/* External Links */}
                  <div className="flex items-center justify-center gap-2 w-full mb-6 z-10">
                     {[
                        { icon: User, url: player.trackers?.steam, tip: 'Steam' },
                        { icon: Target, url: player.trackers?.csstats, tip: 'CSStats', color: 'text-blue-400' },
                        { icon: ActivitySquare, url: player.trackers?.leetify, tip: 'Leetify', color: 'text-red-500' },
                        { icon: Shield, url: player.trackers?.faceit, tip: 'FACEIT', color: 'text-orange-500' }
                     ].map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noreferrer" className="w-9 h-9 rounded bg-white/5 border border-white/5 flex items-center justify-center hover:bg-accent/10 hover:border-accent/40 transition-all group">
                           <link.icon className={cn("w-4 h-4 transition-colors", link.color || "text-text", "group-hover:text-accent")} />
                        </a>
                     ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full mb-6 z-10">
                     <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5 flex flex-col">
                        <span className="text-[9px] text-muted uppercase font-black tracking-widest mb-1">Playtime</span>
                        <span className="text-sm font-mono font-bold text-accent">{stats.hours || 0}h</span>
                     </div>
                     <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5 flex flex-col">
                        <span className="text-[9px] text-muted uppercase font-black tracking-widest mb-1">Stock Portfolio</span>
                        <span className="text-sm font-mono font-bold text-accent">{player.inventoryValue || '$0'}</span>
                     </div>
                  </div>

                  {/* Ranks */}
                  <div className="flex gap-2 w-full mb-6 z-10 h-12">
                     <div className="flex-1 bg-white/5 rounded flex flex-col items-center justify-center relative overflow-hidden border border-white/5 shadow-inner">
                        <div className="absolute left-0 bottom-0 top-0 w-3 bg-blue-600 skew-x-[-20deg] origin-bottom -ml-1 border-r border-background" />
                        <span className="font-display text-blue-400 italic text-xl drop-shadow leading-none">{player.premierRating > 0 ? player.premierRating.toLocaleString() : "Unranked"}</span>
                        {player.worldRank > 0 && (
                           <span className="text-[7px] font-black text-blue-400/40 uppercase tracking-tighter mt-0.5">#{player.worldRank.toLocaleString()} GLOBAL</span>
                        )}
                     </div>
                     <div className="flex-1 bg-white/5 rounded flex items-center justify-center border border-white/5 gap-2 shadow-inner">
                        <div className="w-3.5 h-3.5 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent-glow)]" />
                        <span className="font-display text-xl text-accent">{player.faceit?.level || 1}</span>
                     </div>
                  </div>

                  {/* Medals */}
                  <div className="grid grid-cols-4 gap-2 w-full mb-6 z-10">
                     {Array(8).fill(null).map((_, i) => (
                        <div key={i} className="aspect-square bg-white/[0.03] rounded flex items-center justify-center border border-white/5 saturate-50 hover:saturate-100 transition-all cursor-help">
                           <Trophy className="w-5 h-5 text-accent opacity-40 group-hover:opacity-100" />
                        </div>
                     ))}
                  </div>

                  {/* Reputation Metrics */}
                  <div className="flex items-center justify-around w-full rounded-lg py-3 mb-2 z-10 border-t border-b border-white/5">
                     <div className="flex flex-col items-center gap-1">
                        <ThumbsUp className="w-4 h-4 text-accent" />
                        <span className="text-[10px] font-bold text-muted">{player.reputation?.positive || 0}</span>
                     </div>
                     <div className="flex flex-col items-center gap-1">
                        <ShieldAlert className="w-4 h-4 text-accent" />
                        <span className="text-[10px] font-bold text-muted">{player.reputation?.total || 0}</span>
                     </div>
                  </div>

                  <div className="flex items-center w-full gap-3 mb-3 z-10 mt-2">
                     <button className="flex-1 bg-accent/5 hover:bg-accent/10 text-accent text-[9px] font-black italic tracking-tighter py-2.5 rounded border border-accent/20 transition-all uppercase">+Reputation</button>
                     <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-muted">0</div>
                     <button className="flex-1 bg-danger/5 hover:bg-danger/10 text-danger text-[9px] font-black italic tracking-tighter py-2.5 rounded border border-danger/20 transition-all uppercase">-Evidence</button>
                  </div>
                  
                  <button className="w-full bg-danger/10 hover:bg-danger/20 text-danger border border-danger/20 rounded-lg py-3 text-xs font-black uppercase tracking-widest transition-all z-10 hover:shadow-[0_0_20px_rgba(255,77,77,0.15)] mt-4">
                     Report Misconduct
                  </button>

                  <div className="text-[9px] text-muted font-mono uppercase tracking-widest mt-6 z-10 flex items-center gap-2 opacity-50">
                     Dossier updated recently <History className="w-3 h-3" />
                  </div>
               </div>
            </aside>

            {/* MAIN DATA FEED */}
            <main className="flex-1 flex flex-col gap-6 w-full overflow-hidden">
               {/* Navigation Tabs */}
               <nav className="glass-heavy rounded-xl flex overflow-x-auto no-scrollbar p-1">
                  {['Overview', 'Matches', 'Highlights', 'Encounters', 'Inventory', 'Community'].map((t) => (
                     <button 
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className={cn(
                           "flex-1 px-6 py-3 text-xs font-black uppercase tracking-widest transition-all text-center rounded-lg whitespace-nowrap min-w-[120px]",
                           activeTab === t ? "bg-accent text-background shadow-lg" : "text-muted hover:text-text hover:bg-white/[0.03]"
                        )}
                     >
                        {t}
                     </button>
                  ))}
               </nav>

               {activeTab === 'Overview' && (
                  <div className="glass-heavy rounded-xl flex flex-col overflow-hidden">
                     {/* Integration Tabs */}
                     <div className="flex border-b border-white/5 overflow-x-auto no-scrollbar bg-black/20">
                        {['CSRep', 'FACEIT', 'Leetify', 'GamersClub'].map((t) => (
                           <button 
                              key={t}
                              onClick={() => setActiveSubTab(t)}
                              className={cn(
                                 "flex-1 px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all flex flex-col items-center justify-center gap-2 relative min-w-[150px]",
                                 activeSubTab === t ? "text-accent" : "text-muted hover:text-text"
                              )}
                           >
                              {t === 'CSRep' && <ShieldCheck className="w-5 h-5 mb-1" />}
                              {t === 'FACEIT' && <span className="font-display text-xl text-orange-500 mb-1">FACEIT</span>}
                              {t === 'Leetify' && <ActivitySquare className="w-5 h-5 text-red-500 mb-1" />}
                              {t === 'GamersClub' && <Globe className="w-5 h-5 text-blue-400 mb-1" />}
                              {t}
                              {activeSubTab === t && <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-accent shadow-[0_0_10px_var(--color-accent)]" />}
                           </button>
                        ))}
                     </div>

                     <div className="p-4 lg:p-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                           <div className="flex items-center gap-3">
                              <ShieldCheck className="w-6 h-6 text-accent" />
                              <h2 className="text-xl font-display font-black tracking-wider uppercase">Integrity Analysis</h2>
                           </div>
                           <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded text-[10px] font-bold text-muted uppercase tracking-widest cursor-default">
                              <Calendar className="w-3 h-3" /> Historical Data
                           </div>
                        </div>
                        <p className="text-xs text-muted mb-8 italic border-l-2 border-accent pl-4 py-1">Algorithmic evaluation of performance telemetry and behavioral patterns from demo archives.</p>

                        <div className="flex flex-col xl:flex-row gap-12 mb-10">
                           {/* Trust Pulse */}
                           <div className="flex flex-col items-center justify-center w-[220px] shrink-0 mx-auto xl:mx-0">
                              <div className="relative w-48 h-48 drop-shadow-[0_0_30px_var(--color-accent-soft)]">
                                 <svg className="w-full h-full -rotate-90">
                                    <circle cx="50%" cy="50%" r="44%" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                                    <circle cx="50%" cy="50%" r="44%" fill="none" stroke="var(--color-accent)" strokeWidth="8" strokeDasharray="276.4" strokeDashoffset={276.4 - (276.4 * trustScore) / 100} className="transition-all duration-1000 ease-out" />
                                 </svg>
                                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-mono font-black text-accent">{trustScore}%</span>
                                    <span className="text-[9px] text-muted font-black tracking-widest uppercase mt-1">Trust Rating</span>
                                 </div>
                              </div>
                              <div className={cn("mt-6 px-6 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.2em]", trustScore >= 90 ? "bg-accent/10 border-accent/30 text-accent" : "bg-danger/10 border-danger/30 text-danger")}>
                                 {trustScore >= 90 ? 'Secure Trace' : 'Suspicious Pulse'}
                              </div>
                           </div>

                           {/* Forensic Stats */}
                           <div className="flex-1 flex flex-col w-full">
                              <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-2 w-full">
                                 <div className="flex items-center gap-2 text-xs font-black text-accent uppercase tracking-[0.2em]"><Activity className="w-4 h-4" /> Telemetry Breakdown</div>
                                 <div className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] text-muted font-mono">STABLE</div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mb-10 w-full">
                                 <StatBar label="Time to Damage" value={detailed.ttd ? Number(detailed.ttd).toFixed(1) : '---'} unit="ms" progress={detailed.ttd ? (Number(detailed.ttd) / 8).toFixed(0) as any : 0} reverseColor />
                                 <StatBar label="Reaction Time" value={detailed.reaction ? Number(detailed.reaction).toFixed(1) : '---'} unit="ms" progress={detailed.reaction ? (Number(detailed.reaction) / 6).toFixed(0) as any : 0} reverseColor />
                                 <StatBar label="Crosshair Placement" value={detailed.chp ? Number(detailed.chp).toFixed(1) : '---'} unit="°" progress={detailed.chp ? (Number(detailed.chp) * 10).toFixed(0) as any : 0} reverseColor />
                                 <StatBar label="Preaim" value={detailed.preaim ? Number(detailed.preaim).toFixed(1) : '---'} unit="°" progress={detailed.preaim ? (Number(detailed.preaim) * 8).toFixed(0) as any : 0} reverseColor />
                                 <StatBar label="K/D Ratio" value={Number(stats.kd || 0).toFixed(2)} progress={((stats.kd || 0.5) / 2) * 100} />
                                 <StatBar label="ADR" value={Number(detailed.adr || 0).toFixed(1)} progress={detailed.adr || 0} />
                                 <StatBar label="Aim Accuracy" value={Number(detailed.accuracy || 0).toFixed(1)} unit="%" progress={detailed.accuracy || 0} />
                                 <StatBar label="Head Accuracy" value={Number(detailed.aim || 0).toFixed(1)} unit="%" progress={detailed.aim || 0} />
                                 <StatBar label="Wallbang Kill %" value={detailed.wallbang || 0} unit=" kills" progress={((detailed.wallbang || 0) / 20) * 100} />
                                 <StatBar label="Smoke Kill %" value={detailed.smoke || 0} unit=" kills" progress={((detailed.smoke || 0) / 20) * 100} />
                                 <StatBar label="HLTV Rating 2.0" value={Number(detailed.hltv || 0).toFixed(2)} progress={((detailed.hltv || 0.5) / 2) * 100} />
                                 <StatBar label="KAST" value={Number(detailed.kast || 0).toFixed(1)} unit="%" progress={detailed.kast || 0} />
                              </div>

                              <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-2">
                                 <div className="flex items-center gap-2 text-xs font-black text-danger uppercase tracking-[0.2em]"><ShieldAlert className="w-4 h-4" /> Anomaly Indicators</div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-lg border border-white/5">
                                    <div className="w-10 h-10 rounded bg-background flex items-center justify-center border border-accent/20 text-accent"><ArrowUpRight className="w-5 h-5" /></div>
                                    <div className="flex flex-col">
                                       <span className="text-[10px] font-black uppercase text-muted tracking-widest">Skill Deviation</span>
                                       <span className="text-xs font-bold">{stats.kd > 1.5 ? 'Significant Mismatch' : 'Nominal Trace'}</span>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-lg border border-white/5">
                                    <div className="w-10 h-10 rounded bg-background flex items-center justify-center border border-accent/20 text-accent"><Clock className="w-5 h-5" /></div>
                                    <div className="flex flex-col">
                                       <span className="text-[10px] font-black uppercase text-muted tracking-widest">Archive History</span>
                                       <span className="text-xs font-bold">{stats.totalMatches > 5 ? 'Verified User' : 'Incomplete History'}</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Network Reputation Grid */}
                        <div className="mt-8 pt-8 border-t border-white/5">
                           <div className="flex justify-between items-center mb-6">
                              <h3 className="text-xs font-black text-accent uppercase tracking-[0.2em]">Metadata Dossier</h3>
                           </div>
                           
                           <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                              {[
                                 { label: 'Dossier Age', val: getAccountAge(player.timeCreated) },
                                 { label: 'Archive Hours', val: `${stats.hours || 0}h` },
                                 { label: 'Asset Value', val: player.inventoryValue || 'Unknown' },
                                 { label: 'Network Level', val: `LVL ${player.level || 0}` },
                                 { label: 'Trophies', val: player.collectibles || '0' }
                              ].map((stat, i) => (
                                 <div key={i} className="bg-white/5 rounded-lg border border-white/5 p-4 flex flex-col justify-between h-[85px] hover:bg-accent/5 transition-colors cursor-default">
                                    <span className="text-[9px] text-muted font-black uppercase tracking-widest">{stat.label}</span>
                                    <span className="text-xl font-display font-black tracking-wider text-accent truncate uppercase">{stat.val}</span>
                                 </div>
                              ))}
                           </div>
                           
                           <div className="mt-6 flex items-start gap-3 p-4 bg-accent/5 border border-accent/10 rounded-lg text-[10px] text-muted font-medium">
                              <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                              <p className="leading-relaxed"><strong className="text-accent font-black uppercase tracking-widest">Warning:</strong> Data extracted via automated forensic scanners. Statistical variance should be expected. This report constitutes a guideline for integrity verification and is not a definitive declaration of status.</p>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {activeTab === 'Matches' && (
                  <div className="flex flex-col gap-4 mb-20">
                     <div className="glass-heavy rounded-xl p-6 mb-2">
                        <div className="flex items-center gap-3 mb-2">
                           <History className="w-5 h-5 text-accent" />
                           <h2 className="text-lg font-display font-black uppercase tracking-wider">Historical Archives</h2>
                        </div>
                        <p className="text-[10px] text-muted uppercase tracking-widest">Chronological catalog of engagement telemetry retrieved from demo files.</p>
                     </div>

                     <div className="grid grid-cols-1 gap-4">
                        {player.matches && player.matches.length > 0 ? player.matches.map((m: any, i: number) => (
                           <div key={i} className="glass-heavy rounded-xl p-4 flex items-center justify-between group hover:bg-accent/5 transition-all border-l-4 border-l-transparent hover:border-l-accent overflow-hidden relative">
                              <div className="flex items-center gap-6 z-10">
                                 <div className="relative w-16 h-16 rounded overflow-hidden flex-shrink-0 border border-white/10">
                                    <img src={getMapThumbnail(m.map)} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" alt={m.map} />
                                    <div className="absolute inset-0 bg-background/40" />
                                    <div className="absolute inset-0 flex items-center justify-center font-black text-[10px] uppercase drop-shadow-lg">{m.map.replace('de_', '')}</div>
                                 </div>

                                 <div className="flex flex-col gap-1">
                                    <div className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                       <span className={cn(m.result === 'WIN' ? 'text-accent' : 'text-danger')}>
                                          {m.result === 'WIN' ? 'Success' : 'Failed'}
                                       </span>
                                       <span className="text-muted/30">/</span>
                                       <span className="text-text">{m.score}</span>
                                    </div>
                                    <div className="text-[10px] text-muted font-mono uppercase">
                                       {new Date(m.time * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                 </div>
                              </div>

                              <div className="flex items-center gap-8 pr-4 z-10">
                                 <div className="hidden md:flex flex-col items-center">
                                    <span className="text-[9px] text-muted font-black uppercase tracking-widest">Kills</span>
                                    <span className="font-display text-lg text-text">{m.kills}</span>
                                 </div>
                                 <div className="hidden md:flex flex-col items-center">
                                    <span className="text-[9px] text-muted font-black uppercase tracking-widest">Deaths</span>
                                    <span className="font-display text-lg text-danger">{m.deaths}</span>
                                 </div>
                                 <div className="hidden md:flex flex-col items-center">
                                    <span className="text-[9px] text-muted font-black uppercase tracking-widest">Assists</span>
                                    <span className="font-display text-lg text-text">{m.assists}</span>
                                 </div>
                                 <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-accent">Rating</span>
                                    <span className="font-display text-xl text-accent">{m.rating.toFixed(2)}</span>
                                 </div>
                                 <button className="w-8 h-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center hover:bg-accent/20 hover:border-accent/40 transition-all">
                                    <ChevronRight className="w-4 h-4 text-muted group-hover:text-accent" />
                                 </button>
                              </div>
                           </div>
                        )) : (
                           <div className="glass-heavy rounded-xl p-12 flex flex-col items-center justify-center text-muted gap-4 opacity-50">
                              <Archive className="w-12 h-12" />
                              <span className="text-xs uppercase font-black tracking-[0.2em]">No Archived Data Found</span>
                           </div>
                        )}
                     </div>
                  </div>
               )}

               {activeTab === 'Overview' && mapStats.length > 0 && (
                  <div className="glass-heavy rounded-xl flex flex-col p-6 mb-20">
                     <div className="flex items-center gap-3 mb-2">
                        <Globe className="w-5 h-5 text-accent" />
                        <h2 className="text-lg font-display font-black uppercase tracking-wider">Map Sector Analysis</h2>
                     </div>
                     <p className="text-[10px] text-muted uppercase tracking-widest mb-8 border-b border-white/5 pb-4">Performance telemetry synchronized from the last archives for each regional sector.</p>

                     <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                        {mapStats.map((map, i) => {
                           const winRateNum = map.winRate;
                           const wrClass = winRateNum >= 55 ? 'border-accent text-accent' : winRateNum < 45 ? 'border-danger text-danger' : 'border-muted text-text';

                           return (
                           <div key={map.name} className="bg-white/5 border border-white/5 rounded-xl overflow-hidden flex flex-col group relative">
                              <div className="h-32 relative">
                                 <img src={getMapThumbnail(map.name)} className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" alt={map.name} />
                                 <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                                 <div className="absolute top-3 left-3 bg-black/80 backdrop-blur px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter border border-white/10">{map.name}</div>
                              </div>
                              
                              <div className="p-4 flex flex-col -mt-8 z-10">
                                 <div className="flex justify-between text-center px-1 mb-6 gap-2">
                                    <div className="flex flex-col gap-2 items-center flex-1">
                                       <span className="text-[8px] font-black uppercase text-muted tracking-tighter">SUCCESS</span>
                                       <div className={cn("w-12 h-12 flex items-center justify-center rounded-full border-2 font-black text-[10px] bg-background", wrClass)}>
                                          {map.winRate}%
                                       </div>
                                    </div>
                                    <div className="flex flex-col gap-2 items-center flex-1">
                                       <span className="text-[8px] font-black uppercase text-muted tracking-tighter">LETHALITY</span>
                                       <div className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-accent/20 font-black text-[10px] bg-background text-accent">
                                          {map.kd}
                                       </div>
                                    </div>
                                    <div className="flex flex-col gap-2 items-center flex-1">
                                       <span className="text-[8px] font-black uppercase text-muted tracking-tighter">IMPACT</span>
                                       <div className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-accent/20 font-black text-[10px] bg-background text-accent">
                                          {Math.round(map.adr)}
                                       </div>
                                    </div>
                                 </div>

                                 <div className="grid grid-cols-3 gap-2 text-center pb-4 mb-4 border-b border-white/5">
                                    <div className="flex flex-col">
                                       <span className="text-[8px] text-muted font-bold uppercase">MATCHES</span>
                                       <span className="font-mono text-xs font-bold">{map.matches}</span>
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="text-[8px] font-bold text-accent uppercase">WINS</span>
                                       <span className="font-mono text-xs font-bold text-accent">{map.wins}</span>
                                    </div>
                                    <div className="flex flex-col">
                                       <span className="text-[8px] font-bold text-danger uppercase">LOSS</span>
                                       <span className="font-mono text-xs font-bold text-danger">{map.losses}</span>
                                    </div>
                                 </div>

                                 <div className="flex justify-between px-1 text-[9px] font-bold text-muted uppercase tracking-tighter">
                                    <span>Headshot: <span className="text-text">{map.hs}</span></span>
                                    <span>Rating: <span className="text-accent">A+</span></span>
                                 </div>
                              </div>
                           </div>
                           )
                        })}
                     </div>
                  </div>
               )}
            </main>

         </div>
      </div>
      <style>{`
         .clip-star {
            clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
         }
         .pulse-opacity { animation: pulse-op 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
         @keyframes pulse-op {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
         }
         .glass-heavy {
            background: rgba(10, 13, 20, 0.7);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.05);
         }
      `}</style>
    </div>
  );
}