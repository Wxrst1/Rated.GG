import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Crosshair, Target, Clock, Activity, 
  ChevronLeft, Layout, Zap, Flame,
  Wind, Ghost, Settings, Users,
  BarChart3, Info, Star, Share2, Play, Video,
  Calendar, MapPin, Globe, ArrowRight, MousePointer2
} from 'lucide-react';
import { cn } from '../lib/utils';

// --- UI COMPONENTS ---

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

function StatBadge({ icon, label, value }: { icon: any, label: string, value: string }) {
   return (
      <div className="flex items-center gap-3 px-6 py-2.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/5">
         {React.cloneElement(icon, { className: "w-4 h-4 text-white/40" })}
         <div className="flex flex-col">
            <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">{label}</span>
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">{value}</span>
         </div>
      </div>
   );
}

function TabButton({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative whitespace-nowrap",
        active ? "text-accent" : "text-white/20 hover:text-white/40"
      )}
    >
      {label}
      {active && (
        <motion.div 
          layoutId="activeTabMatch"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent shadow-[0_0_15px_var(--color-accent)]"
        />
      )}
    </button>
  );
}

function StatCard({ label, value, sub, color = "white" }: { label: string, value: any, sub?: string, color?: string }) {
   return (
      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col justify-between">
         <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] mb-4">{label}</span>
         <div className="flex items-baseline gap-2">
            <span className={cn("text-4xl font-display uppercase italic", color === 'accent' ? 'text-accent' : 'text-white/80')}>
               {value}
            </span>
            {sub && <span className="text-[10px] text-white/20 font-mono">{sub}</span>}
         </div>
      </div>
   );
}

function ScorePanel({ team, score, isWinner, label }: { team: string, score: number, isWinner: boolean, label: string }) {
   return (
      <div className={cn(
         "flex-1 p-10 rounded-[3rem] border transition-all relative overflow-hidden",
         isWinner ? "bg-accent/[0.03] border-accent/20 shadow-[0_0_100px_rgba(255,199,0,0.05)]" : "bg-white/[0.01] border-white/5"
      )}>
         <div className="flex flex-col items-center relative z-10">
            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.8em] mb-6">{label}</span>
            <div className={cn(
               "text-9xl font-display italic leading-none mb-4",
               isWinner ? "text-accent text-glow" : "text-white/40"
            )}>
               {score}
            </div>
            {isWinner && (
               <div className="px-6 py-1.5 bg-accent text-black text-[9px] font-black uppercase tracking-[0.3em] rounded-full shadow-lg">
                  Dominance
               </div>
            )}
         </div>
         {isWinner && <div className="scanline opacity-10" />}
      </div>
   );
}

function CyberFrame({ children, className, title, innerClassName }: { children: React.ReactNode, className?: string, title?: string, innerClassName?: string }) {
  return (
    <div className={cn("relative group/frame", className)}>
      <div className="absolute -top-1 -left-1 w-8 h-8 border-t-2 border-l-2 border-accent/20 rounded-tl-xl transition-all group-hover/frame:scale-110 group-hover/frame:border-accent z-20" />
      <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-2 border-r-2 border-accent/20 rounded-br-xl transition-all group-hover/frame:scale-110 group-hover/frame:border-accent z-20" />
      {title && (
        <div className="absolute -top-3 left-10 px-6 py-1.5 bg-background border border-white/10 rounded-full flex items-center gap-3 z-30 shadow-2xl">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] italic">{title}</span>
        </div>
      )}
      <div className={cn("glass-heavy rounded-[3rem] p-10 border border-white/5 relative overflow-hidden h-full", innerClassName)}>
         <div className="absolute inset-0 bg-accent/[0.01] group-hover/frame:bg-accent/[0.03] transition-colors" />
         {children}
      </div>
    </div>
  );
}

export default function MatchDetail() {
  const { matchId } = useParams<{ matchId: string }>();
  const [match, setMatch] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
   const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'forensics' | 'rounds'>('players');

  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(data => {
      if (data.authenticated) setCurrentUser(data.user);
    });

    const fetchMatch = async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}`);
        if (res.ok) {
          const data = await res.json();
          const rawRH = data.match.roundHistory || data.match.round_history;
          const normalizedRH = Array.isArray(rawRH) ? rawRH : (rawRH?.rounds || []);
          
          setMatch({
            ...data.match,
            roundHistory: normalizedRH,
            killLog: rawRH?.killLog || [],
            clutches: rawRH?.clutches || [],
            playerWeaponStats: rawRH?.playerWeaponStats || {},
            playerHitStats: rawRH?.playerHitStats || {},
            team1: data.team1 || [],
            team2: data.team2 || []
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMatch();
  }, [matchId]);

  if (loading) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center forensic-grid">
       <div className="w-16 h-16 border-t-2 border-accent border-solid rounded-full animate-spin mb-8" />
       <div className="text-[10px] font-black tracking-[1em] text-white/20 uppercase animate-pulse">Establishing Secure Stream...</div>
    </div>
  );

  if (!match) return <div className="min-h-screen bg-background flex items-center justify-center text-white/10 font-display text-4xl uppercase tracking-[1em]">Telemetry Record Not Found</div>;

  return (
    <div className="min-h-screen bg-background selection:bg-accent selection:text-black font-sans forensic-grid pb-40">
      <div className="scanline opacity-[0.02]" />

      {/* --- CINEMATIC HEADER --- */}
       <div className="relative w-full h-[65vh] overflow-hidden border-b border-white/5">
          <div className="absolute inset-0 z-0 scale-110">
             <img 
                src={getMapThumbnail(match.map)}
                className="w-full h-full object-cover opacity-10 blur-[2px] transition-opacity duration-1000" 
             />
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--color-accent-rgb),0.1)_0%,transparent_70%)]" />
             <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>

            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            
            <div className="absolute inset-0 flex flex-col justify-end pb-12">
               <div className="max-w-7xl mx-auto px-6 w-full">
                  <div className="flex flex-wrap items-center gap-6 mb-8">
                     <span className="px-5 py-2 bg-accent text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-lg shadow-xl shadow-accent/20">
                        {match.gameMode?.toUpperCase() || 'PREMIER'}
                     </span>
                     <div className="flex items-center gap-4 text-white/60">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xl font-display uppercase italic tracking-widest">{match.map?.split('_').pop()}</span>
                     </div>
                     <div className="flex items-center gap-4 text-white/40 border-l border-white/10 pl-6">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-mono">{match.playedAt ? new Date(match.playedAt).toLocaleString() : 'PENDING_LOG'}</span>
                     </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
                     <div className="flex items-center gap-12">
                        <div className="text-center">
                           <span className="text-[11px] font-black font-mono text-accent block mb-2">TEAM A</span>
                           <h2 className={cn("text-9xl font-display italic leading-none", match.scoreTeam1 > match.scoreTeam2 ? "text-white text-glow" : "text-white/20")}>
                              {match.scoreTeam1}
                           </h2>
                        </div>
                        <div className="flex flex-col items-center gap-4">
                           <div className="h-10 w-px bg-white/20" />
                           <div className={cn(
                              "px-6 py-2 rounded-full border text-[10px] font-black uppercase tracking-[0.3em] shadow-lg",
                              match.scoreTeam1 > match.scoreTeam2 ? "bg-accent/10 border-accent/40 text-accent" :
                              match.scoreTeam2 > match.scoreTeam1 ? "bg-danger/10 border-danger/40 text-danger" :
                              "bg-white/5 border-white/20 text-white/40"
                           )}>
                              {match.scoreTeam1 > match.scoreTeam2 ? 'WIN' : match.scoreTeam2 > match.scoreTeam1 ? 'LOSS' : 'DRAW'}
                           </div>
                           <div className="h-10 w-px bg-white/20" />
                        </div>
                        <div className="text-center">
                           <span className="text-[11px] font-black font-mono text-white/20 block mb-2">TEAM B</span>
                           <h2 className={cn("text-9xl font-display italic leading-none", match.scoreTeam2 > match.scoreTeam1 ? "text-white text-glow" : "text-white/20")}>
                              {match.scoreTeam2}
                           </h2>
                        </div>
                     </div>

                     <div className="flex flex-wrap gap-4">
                        <StatBadge icon={<Clock />} label="DURATION" value="34:12" />
                        <StatBadge icon={<Globe />} label="REGION" value="EU_WEST_2" />
                        <StatBadge icon={<Activity />} label="MATCH_AVG" value="10,405" />
                        <button 
                           onClick={async () => {
                              const res = await fetch(`/api/matches/${matchId}/reparse`, { method: 'POST' });
                              if (res.ok) alert('Match queued for re-analysis. Refresh in a few moments.');
                           }}
                           className="px-8 py-3.5 bg-accent/10 border border-accent/20 rounded-xl hover:bg-accent/20 transition-all text-[10px] font-black uppercase tracking-widest text-accent flex items-center gap-3"
                        >
                           <Settings className="w-4 h-4" /> Re-Analyze
                        </button>
                        <button className="px-8 py-3.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                           <Share2 className="w-4 h-4" /> Share
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* NAVIGATION BAR */}
         <div className="sticky top-24 z-[100] bg-background/80 backdrop-blur-3xl border-b border-white/5">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center gap-1">
               {['Overview', 'Rounds', 'Players', 'Weapons', 'Duels'].map((t) => (
                  <button
                     key={t}
                     onClick={() => setActiveTab(t.toLowerCase() as any)}
                     className={cn(
                        "px-10 py-4 text-[11px] font-black uppercase tracking-[0.3em] transition-all relative overflow-hidden h-full flex items-center",
                        activeTab === t.toLowerCase() 
                           ? "text-accent" 
                           : "text-white/20 hover:text-white/40"
                     )}
                  >
                     {t}
                     {activeTab === t.toLowerCase() && (
                        <motion.div 
                           layoutId="activeTabDet" 
                           className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent shadow-[0_0_15px_rgba(255,199,0,0.5)]" 
                        />
                     )}
                  </button>
               ))}
            </div>
         </div>

      {/* --- DYNAMIC CONTENTS --- */}
      <div className="max-w-7xl mx-auto px-6 relative z-10">
         <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
               <motion.div 
                 key="overview"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="space-y-12 py-12"
               >
                <ProfessionalScoreboard 
                    teamName="TEAM A" 
                    players={match.team1} 
                    score={match.scoreTeam1} 
                    isWinner={match.scoreTeam1 > match.scoreTeam2} 
                    totalRounds={match.scoreTeam1 + match.scoreTeam2}
                    currentUser={currentUser}
                  />
                  
                  {/* ROUND TIMELINE */}
                  <div className="flex flex-col items-center gap-6 py-8">
                     <div className="flex items-center gap-1">
                        {match.roundHistory.map((r: any, i: number) => (
                           <div key={i} className="flex flex-col items-center">
                              <div className={cn(
                                 "w-6 h-6 rounded flex items-center justify-center border transition-all relative overflow-hidden",
                                 r.winnerGroup === 0 
                                    ? "bg-accent/20 border-accent/40 text-accent" 
                                    : "bg-blue-500/20 border-blue-500/40 text-blue-500"
                              )}>
                                 <div className="absolute inset-0 scanline opacity-20" />
                                 <span className="text-[9px] font-black z-10">{i + 1}</span>
                              </div>
                              {/* Round visualization (skulls etc if desired, but let's stick to simple squares first like image) */}
                           </div>
                        ))}
                     </div>
                  </div>

                  <ProfessionalScoreboard 
                    teamName="TEAM B" 
                    players={match.team2} 
                    score={match.scoreTeam2} 
                    isWinner={match.scoreTeam2 > match.scoreTeam1} 
                    totalRounds={match.scoreTeam1 + match.scoreTeam2}
                    currentUser={currentUser}
                  />
               </motion.div>
            )}

            {activeTab === 'players' && (
               <motion.div 
                 key="players"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="space-y-40"
               >
                  <PlayerGrid teamName="TEAM A" players={match.team1} accent="gold" />
                  <PlayerGrid teamName="TEAM B" players={match.team2} accent="indigo" />
               </motion.div>
            )}

            {activeTab === 'rounds' && (
               <motion.div 
                 key="rounds"
                 initial={{ opacity: 0, scale: 0.98 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="space-y-12"
               >
                  <CyberFrame title="CHRONOLOGICAL_LOG">
                     <div className="divide-y divide-white/5">
                        {(match.roundHistory || []).map((r: any, i: number) => (
                           <div key={i} className="py-8 flex items-center justify-between group hover:bg-white/[0.01] px-4 transition-all">
                              <div className="flex items-center gap-10">
                                 <span className="text-[10px] font-mono text-white/10 uppercase tracking-widest font-black">R-ID_{i+1 < 10 ? `0${i+1}` : i+1}</span>
                                 <div className={cn(
                                    "px-4 h-10 rounded-xl flex items-center justify-center border transition-all",
                                    r.winnerGroup === 0 ? "border-accent/40 bg-accent/10 text-accent" : "border-blue-500/40 bg-blue-500/10 text-blue-500"
                                 )}>
                                    <span className="text-[10px] font-black italic tracking-widest">{r.winnerGroup === 0 ? 'TEAM A' : 'TEAM B'}</span>
                                 </div>
                                 <div>
                                    <div className="flex items-center gap-4">
                                       <span className="text-xl font-display text-white italic tracking-tighter uppercase">{r.resolution || 'Standard Engagement'}</span>
                                       {r.mvp_name && <span className="text-[9px] font-black text-accent uppercase tracking-widest opacity-60">MVP: {r.mvp_name}</span>}
                                    </div>
                                    <div className="text-[9px] font-mono text-white/20 uppercase tracking-[0.2em] mt-1">Duration: {r.round_duration || '1:42'}s // {r.clutches?.length || 0} Critical Events</div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-8">
                                 <div className="text-right">
                                    <div className="text-2xl font-display text-white italic tracking-tighter">{r.scoreTeam1} : {r.scoreTeam2}</div>
                                    <div className="text-[8px] font-black text-white/10 uppercase tracking-widest">Running Sync</div>
                                 </div>
                                 <ChevronLeft className="w-4 h-4 text-white/10 rotate-180 group-hover:text-accent transition-colors" />
                              </div>
                           </div>
                        ))}
                     </div>
                  </CyberFrame>
               </motion.div>
            )}

            {activeTab === 'weapons' && (
               <motion.div 
                 key="weapons"
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="grid grid-cols-1 lg:grid-cols-2 gap-12 py-12"
               >
                  <div className="space-y-8">
                     <h3 className="text-[11px] font-black text-white/20 uppercase tracking-[0.5em] mb-8">Firearm Telemetry</h3>
                     {(() => {
                        const weapons: Record<string, any> = {};
                        Object.values(match.playerWeaponStats || {}).forEach((pStats: any) => {
                           Object.entries(pStats || {}).forEach(([name, s]: [string, any]) => {
                              if (!weapons[name]) weapons[name] = { kills: 0, damage: 0, shots: 0, hits: 0, headshots: 0 };
                              weapons[name].kills += s.kills || 0;
                              weapons[name].damage += s.damage || 0;
                              weapons[name].shots += s.shots || 0;
                              weapons[name].hits += s.hits || 0;
                              weapons[name].headshots += s.headshots || 0;
                           });
                        });
                        return Object.entries(weapons)
                           .sort((a,b) => b[1].kills - a[1].kills)
                           .map(([name, w]) => (
                              <WeaponRow key={name} name={name} stats={w} />
                           ));
                     })()}
                  </div>

                  <div className="glass-heavy rounded-[3rem] p-16 border border-white/5 flex flex-col items-center">
                     <h3 className="text-[11px] font-black text-accent uppercase tracking-[1em] mb-12">Hit Distribution Mapping</h3>
                     <div className="relative w-full max-w-sm aspect-[1/2] rounded-[4rem] border border-white/5 bg-white/[0.02] flex items-center justify-center">
                        <padding className="w-64 h-64 text-white/5" />
                        {/* Simulation of hitgroups */}
                        <HitIndicator top="10%" left="50%" label="HEAD" value="12.4%" active />
                        <HitIndicator top="30%" left="50%" label="CHEST" value="44.8%" active />
                        <HitIndicator top="50%" left="50%" label="ABDOMEN" value="28.2%" />
                        <HitIndicator top="70%" left="30%" label="L_LEG" value="7.3%" />
                        <HitIndicator top="70%" left="70%" label="R_LEG" value="7.3%" />
                     </div>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>
    </div>
  );
}

function ProfessionalScoreboard({ teamName, players, score, isWinner, totalRounds, currentUser }: { teamName: string, players: any[], score: number, isWinner: boolean, totalRounds: number, currentUser?: any }) {
   return (
      <div className="glass-heavy rounded-xl overflow-hidden border border-white/5 mb-8">
         <div className="px-6 py-4 bg-white/[0.02] flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-4">
               <div className={cn(
                  "w-1 h-8 rounded-full",
                  isWinner ? "bg-accent shadow-[0_0_10px_var(--color-accent)]" : "bg-white/10"
               )} />
               <div className="flex flex-col">
                  <h3 className="text-sm font-black uppercase tracking-wider text-white/40">{teamName}</h3>
                  <span className={cn("text-2xl font-display italic leading-none", isWinner ? "text-accent" : "text-white/20")}>{score}</span>
               </div>
            </div>
            
            <div className="flex items-center gap-8">
               <div className="flex flex-col items-end">
                  <span className="text-[8px] font-black text-white/10 uppercase tracking-widest">Team Average Rating</span>
                  <span className="text-lg font-display text-accent italic">
                     {(players.reduce((acc, p) => acc + (p.rating || 0), 0) / (players.length || 1)).toFixed(2)}
                  </span>
               </div>
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
               <thead>
                  <tr className="bg-black/20">
                     <th className="pl-6 pr-4 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest w-[180px]">Player</th>
                     <th className="px-2 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest text-center">Rank</th>
                     <th className="px-2 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest text-center">TR</th>
                     <th className="px-2 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest text-center">K</th>
                     <th className="px-2 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest text-center">D</th>
                     <th className="px-2 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest text-center">A</th>
                     <th className="px-2 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest text-center">K/D</th>
                     <th className="px-2 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest text-center">K/R</th>
                     <th className="px-2 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest text-center">ADR</th>
                     <th className="px-2 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest text-center">HS%</th>
                     <th className="px-2 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest text-center">KAST</th>
                     <th className="px-2 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest text-center">MVP</th>
                     <th className="px-2 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest text-center">Restrictions</th>
                     <th className="px-2 py-4 text-[9px] font-black text-white/20 uppercase tracking-widest text-center">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {players.sort((a,b) => (b.rating || 0) - (a.rating || 0)).map((p, i) => (
                     <tr key={p.steamId || i} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="pl-6 pr-4 py-3">
                           <Link to={`/player/${p.steamId}`} className="flex items-center gap-3 group/name">
                              <div className="relative">
                                 <img src={p.avatar} className="w-8 h-8 rounded border border-white/10 group-hover/name:border-accent transition-all" />
                                 <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent border border-background" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                 <span className="text-[11px] font-bold text-white group-hover/name:text-accent transition-colors uppercase truncate max-w-[120px]">{p.name}</span>
                                 {p.steamId === currentUser?.steam_id && (
                                    <span className="text-[7px] font-black text-accent uppercase tracking-tighter">YOU</span>
                                 )}
                              </div>
                           </Link>
                        </td>
                        <td className="px-2 py-3 text-center">
                           <div className="inline-flex items-center bg-white/5 border border-white/5 rounded px-2 py-0.5 min-w-[60px] justify-center">
                              <span className="text-[10px] font-mono font-bold text-accent">
                                 {p.premierRatingAfter?.toLocaleString() || '---'}
                              </span>
                           </div>
                        </td>
                        <td className="px-2 py-3 text-center">
                           <span className={cn("text-[10px] font-black", (p.tr || 100) >= 90 ? "text-accent" : "text-danger")}>
                              {p.tr || 100}
                           </span>
                        </td>
                        <td className="px-2 py-3 text-center text-xs font-bold text-white/80">{p.kills}</td>
                        <td className="px-2 py-3 text-center text-xs font-bold text-white/40">{p.deaths}</td>
                        <td className="px-2 py-3 text-center text-xs font-bold text-white/20">{p.assists}</td>
                        <td className="px-2 py-3 text-center text-xs font-bold text-white/80">{(p.kd || 0).toFixed(2)}</td>
                        <td className="px-2 py-3 text-center text-xs font-bold text-white/40">{(p.kills / (totalRounds || 1)).toFixed(2)}</td>
                        <td className="px-2 py-3 text-center">
                           <div className="flex flex-col items-center">
                              <span className={cn("text-xs font-black", (p.adr || 0) > 90 ? "text-accent" : "text-white/60")}>{(p.adr || 0).toFixed(1)}</span>
                              <div className="w-10 h-0.5 bg-white/5 rounded-full mt-0.5 overflow-hidden">
                                 <div className={cn("h-full", (p.adr || 0) > 90 ? "bg-accent" : "bg-white/20")} style={{ width: `${Math.min(100, (p.adr || 0) / 1.2)}%` }} />
                              </div>
                           </div>
                        </td>
                        <td className="px-2 py-3 text-center text-xs font-bold text-white/60">{(p.hsPercent || 0).toFixed(1)}%</td>
                        <td className="px-2 py-3 text-center text-xs font-bold text-white/60">{(p.kast || 0).toFixed(1)}%</td>
                        <td className="px-2 py-3 text-center text-xs font-bold text-white/20">{p.mvps || '-'}</td>
                        <td className="px-2 py-3 text-center text-white/10">-</td>
                        <td className="px-2 py-3 text-center">
                           <div className="flex items-center justify-center gap-1">
                              <button className="w-5 h-5 rounded bg-white/5 flex items-center justify-center hover:bg-accent/20 border border-white/5 transition-colors">
                                 <Star className="w-2.5 h-2.5 text-accent opacity-40 hover:opacity-100" />
                              </button>
                              <button className="w-5 h-5 rounded bg-accent/10 flex items-center justify-center hover:bg-accent/20 border border-accent/20 transition-colors">
                                 <span className="text-[10px] font-black text-accent">+</span>
                              </button>
                              <button className="w-5 h-5 rounded bg-danger/10 flex items-center justify-center hover:bg-danger/20 border border-danger/20 transition-colors">
                                 <span className="text-[10px] font-black text-danger">-</span>
                              </button>
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   );
}

const WeaponRow: React.FC<{ name: string, stats: any }> = ({ name, stats }) => {
   return (
      <div className="glass-heavy p-8 rounded-[2.5rem] border border-white/5 hover:bg-white/[0.04] transition-all group">
         <div className="flex justify-between items-center mb-8">
            <h4 className="text-4xl font-display text-white italic uppercase tracking-widest group-hover:text-accent transition-colors">{name.replace('weapon_', '')}</h4>
            <span className="text-3xl font-display text-white/10 tracking-widest">{stats.kills}_K</span>
         </div>
         <div className="grid grid-cols-3 gap-8 pt-6 border-t border-white/5">
            <div>
               <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-2">DAMAGE</span>
               <span className="text-xl font-display text-white/60 italic">{stats.damage.toLocaleString()}</span>
            </div>
            <div>
               <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-2">HS_RATE</span>
               <span className="text-xl font-display text-white/60 italic">{stats.kills > 0 ? ((stats.headshots / stats.kills) * 100).toFixed(1) : '0'}%</span>
            </div>
            <div>
               <span className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-2">HIT_EFFICIENCY</span>
               <span className="text-xl font-display text-white/60 italic">{stats.shots > 0 ? ((stats.hits / stats.shots) * 100).toFixed(1) : '0'}%</span>
            </div>
         </div>
      </div>
   );
}

function HitIndicator({ top, left, label, value, active }: { top: string, left: string, label: string, value: string, active?: boolean }) {
   return (
      <div className="absolute flex items-center gap-3 translate-x-[-50%] translate-y-[-50%]" style={{ top, left }}>
         <div className={cn(
            "w-3 h-3 rounded-full border-2 transition-all",
            active ? "bg-accent border-accent shadow-[0_0_15px_rgba(255,199,0,0.5)] scale-125" : "bg-white/5 border-white/10"
         )} />
         <div className="flex flex-col">
            <span className="text-[7px] font-black text-white/10 uppercase tracking-widest leading-none mb-1">{label}</span>
            <span className={cn("text-[9px] font-mono leading-none", active ? "text-white/60" : "text-white/10")}>{value}</span>
         </div>
      </div>
   );
}

const ForensicWeapon: React.FC<{ name: string, kills: number, usage: string, accuracy: string, color?: string }> = ({ name, kills, usage, accuracy, color = "white" }) => {
   return (
      <CyberFrame title={`ARMAMENT_${name}`} innerClassName="space-y-8">
         <div className="flex justify-between items-start">
            <h4 className={cn("text-4xl font-display uppercase italic", color === 'accent' ? 'text-accent' : 'text-white')}>{name}</h4>
             <span className="text-2xl font-display text-white/20">{Number(kills || 0).toLocaleString()}_K</span>
         </div>
         <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
            <div>
               <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">ACCURACY</div>
               <div className="text-xl font-display text-white italic">{accuracy}</div>
            </div>
            <div>
               <div className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">GRID_USAGE</div>
               <div className="text-xl font-display text-white italic">{usage}</div>
            </div>
         </div>
      </CyberFrame>
   );
}

const PlayerGrid: React.FC<{ teamName: string, players: any[], accent: string }> = ({ teamName, players, accent }) => {
   return (
      <div className="space-y-16 py-12">
         <div className="flex items-center gap-10">
            <h3 className="text-7xl font-display text-white uppercase italic tracking-tighter leading-none">{teamName}</h3>
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">{players.length} Verified Nodes</span>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {players.sort((a:any, b:any) => (b.rating || 0) - (a.rating || 0)).map((p: any, i: number) => (
               <OperativeCard key={p.steamId || `player-${i}`} player={p} delay={i * 0.05} accent={accent} />
            ))}
         </div>
      </div>
   );
}

const OperativeCard: React.FC<{ player: any, delay: number, accent: string }> = ({ player, delay, accent }) => {
   return (
      <motion.div
         initial={{ opacity: 0, scale: 0.95 }}
         whileInView={{ opacity: 1, scale: 1 }}
         transition={{ delay }}
         className="bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-8 flex flex-col group hover:bg-white/[0.03] transition-all"
      >
         <div className="relative mb-10 flex flex-col items-center">
            <div className="absolute inset-0 bg-accent/20 blur-[50px] opacity-0 group-hover:opacity-100 transition-all duration-1000 -z-10" />
            <img src={player.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${player.steamId}`} className="w-28 h-28 rounded-[2rem] border border-white/10 group-hover:rotate-6 transition-all duration-500 scale-100 group-hover:scale-110" />
            <div className="mt-6 text-center w-full px-4">
               <div className="text-2xl font-display text-white uppercase tracking-wider mb-1 italic truncate">{player.name}</div>
               <div className="text-[8px] font-mono text-white/20 uppercase tracking-widest truncate">{player.steamId}</div>
            </div>
         </div>

          <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-white/5">
            <OperativeStat label="Tactical Rating" value={Number(player.rating || 0).toFixed(2)} color="accent" />
            <OperativeStat 
               label="Premier Node" 
               value={player.premierRatingAfter || (Number(player.rating || 0) * 10).toFixed(0)} 
               color={player.premierRatingAfter ? 'white' : 'white/20'} 
            />
         </div>
         <div className="space-y-1 mt-auto pt-4">
             <OperativeStat label="Extermination" value={`${player.kills || 0}/${player.deaths || 0}`} />
             <OperativeStat label="Engagement" value={`${Number(player.adr || 0).toFixed(1)} ADR`} />
             <OperativeStat label="Accuracy" value={`${Number(player.hsPercent || 0).toFixed(0)}% HS`} />
          </div>
      </motion.div>
   );
}

function OperativeStat({ label, value, color }: { label: string, value: any, color?: string }) {
   return (
      <div className="flex items-center justify-between py-3 border-b border-white/[0.03]">
         <span className="text-[8px] font-black text-white/10 uppercase tracking-[0.2em]">{label}</span>
         <span className={cn("text-[13px] font-display uppercase tracking-widest italic", color === 'accent' ? 'text-accent' : 'text-white/60')}>{value}</span>
      </div>
   );
}