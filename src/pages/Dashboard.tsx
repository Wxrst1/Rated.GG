import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings, MessageSquare, ThumbsUp, ThumbsDown, Edit, Trash2, Shield, Activity, Lock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setUser(data.user);
        } else {
          navigate('/login');
        }
        setLoading(false);
      })
      .catch(() => {
        navigate('/login');
        setLoading(false);
      });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-t-2 border-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return null;

  // Extract real steam profile data from the passport user object
  const profile = user._json || {};

  return (
    <div className="min-h-screen bg-background text-white p-6 md:p-12 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 relative z-10">
        
        {/* Modern Sidebar */}
        <div className="w-full lg:w-80 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-8 text-center shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent to-transparent"></div>
            <div className="relative mb-6">
              <img 
                src={profile.avatarfull || "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg"} 
                alt={profile.personaname} 
                className="w-32 h-32 rounded-[2rem] mx-auto border-4 border-white/5 group-hover:scale-105 transition-transform duration-500" 
              />
              <div className="absolute -bottom-2 -right-2 bg-accent p-2 rounded-xl shadow-lg">
                <Shield className="w-4 h-4 text-background" />
              </div>
            </div>
            <h2 className="text-3xl font-display tracking-tight mb-2">{profile.personaname}</h2>
            <div className="flex items-center justify-center gap-2 text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-6">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Identity Verified
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
              <div>
                <div className="text-2xl font-display text-accent">100</div>
                <div className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Rep Score</div>
              </div>
              <div>
                <div className="text-2xl font-display text-white">0</div>
                <div className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Votes</div>
              </div>
            </div>
          </motion.div>

          <nav className="flex flex-col gap-2">
            <NavBtn active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={18}/>} label="COMMAND CENTER" />
            <NavBtn active={activeTab === 'received'} onClick={() => setActiveTab('received')} icon={<MessageSquare size={18}/>} label="INTEL RECEIVED" />
            <NavBtn active={activeTab === 'given'} onClick={() => setActiveTab('given')} icon={<Edit size={18}/>} label="REPORTS FILED" />
            <NavBtn active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={18}/>} label="SYSTEM CONFIG" />
          </nav>
        </div>

        {/* Dynamic Content Area */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <header>
                  <h1 className="text-5xl font-display tracking-tight mb-2">DASHBOARD <span className="text-accent underline decoration-accent/20 underline-offset-8">OVERVIEW</span></h1>
                  <p className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.3em]">Authorized access only // Protocol v2.4</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-card/30 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 group hover:border-accent/30 transition-all">
                    <div className="flex items-center gap-4 mb-8">
                       <Activity className="text-accent w-6 h-6" />
                       <h3 className="text-gray-400 font-mono text-xs uppercase tracking-[0.2em] font-bold">Profile Telemetry</h3>
                    </div>
                    <div className="space-y-6">
                      <ProfileStat label="Persona Name" value={profile.personaname} />
                      <ProfileStat label="Network identifier" value={profile.steamid} copyable />
                      <ProfileStat label="Account Locality" value={profile.loccountrycode || "Global"} />
                    </div>
                  </div>

                  <div className="bg-card/30 backdrop-blur-xl border border-white/5 rounded-[2rem] p-8 group hover:border-accent/30 transition-all">
                    <div className="flex items-center gap-4 mb-8">
                       <Shield className="text-accent w-6 h-6" />
                       <h3 className="text-gray-400 font-mono text-xs uppercase tracking-[0.2em] font-bold">Security Status</h3>
                    </div>
                    <div className="space-y-4">
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                         <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Trust Index</span>
                         <span className="text-accent font-bold">OPTIMIZED</span>
                       </div>
                       <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between">
                         <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">VAC Integrity</span>
                         <span className="text-green-500 font-bold">SECURE</span>
                       </div>
                    </div>
                    <button 
                      onClick={() => navigate(`/player/${profile.steamid}`)}
                      className="w-full mt-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-mono uppercase tracking-widest hover:bg-accent hover:text-background transition-all"
                    >
                      View Public Profile <ExternalLink className="inline ml-2 w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <SettingsPanel key="settings-panel" />
            )}

            {(activeTab === 'received' || activeTab === 'given') && (
              <motion.div 
                key="placeholder" 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="h-[400px] flex flex-col items-center justify-center bg-card/20 backdrop-blur-md rounded-[2.5rem] border border-white/5 border-dashed"
              >
                <Lock className="w-12 h-12 text-gray-700 mb-4" />
                <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest">Data segment encrypted // Awaiting node activity</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function NavBtn({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 px-6 py-5 rounded-2xl transition-all text-left group relative overflow-hidden",
        active 
          ? "bg-accent text-background shadow-lg shadow-accent/20 font-bold" 
          : "bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:border-white/10"
      )}
    >
      <span className={cn("transition-transform duration-300", active ? "scale-110" : "group-hover:scale-110")}>{icon}</span>
      <span className="text-[10px] font-mono uppercase tracking-[0.2em]">{label}</span>
      {active && <motion.div layoutId="nav-active" className="absolute right-4 w-1 h-6 bg-background rounded-full" />}
    </button>
  );
}

function ProfileStat({ label, value, copyable = false }: { label: string, value: string, copyable?: boolean }) {
  return (
    <div>
      <p className="text-gray-600 text-[8px] font-mono uppercase tracking-[0.2em] mb-1">{label}</p>
      <div className="flex items-center justify-between group/stat">
        <p className="text-white font-bold tracking-tight text-lg">{value}</p>
        {copyable && <span className="opacity-0 group-hover/stat:opacity-100 text-[8px] font-mono text-accent cursor-pointer">COPY_ID</span>}
      </div>
    </div>
  );
}

function SettingsPanel() {
  const [authCode, setAuthCode] = useState('');
  const [matchId, setMatchId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/user/settings')
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          console.error(`Settings Fetch Error (${res.status}):`, text);
          throw new Error(`Failed to load settings: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setAuthCode(data.auth_code || '');
        setMatchId(data.latest_match_id || '');
      })
      .catch(err => {
        console.error("Dashboard Config Error:", err);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authCode, matchId })
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <header>
        <h1 className="text-5xl font-display tracking-tight mb-2">SYSTEM <span className="text-accent underline decoration-accent/20 underline-offset-8">CONFIG</span></h1>
        <p className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.3em]">Configure match history telemetry ingestion</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card/30 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 space-y-8">
          <div className="space-y-6">
             <div className="space-y-2">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block ml-1">Authentication Code</label>
                <input 
                  type="text" 
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  placeholder="XXXX-XXXXX-XXXX"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white font-mono focus:border-accent/40 outline-none transition-all"
                />
             </div>
             
             <div className="space-y-2">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block ml-1">Latest Match Sharing Code</label>
                <input 
                  type="text" 
                  value={matchId}
                  onChange={(e) => setMatchId(e.target.value)}
                  placeholder="CSGO-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                  className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white font-mono focus:border-accent/40 outline-none transition-all"
                />
             </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3",
              saved ? "bg-green-500 text-white" : "bg-accent text-background hover:scale-[1.02] active:scale-95 shadow-[0_0_50px_rgba(255,199,0,0.2)]"
            )}
          >
            {saving ? "SYNCING NODES..." : saved ? "SYSTEM UPDATED!" : "DEPLOY CONFIGURATION"}
          </button>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-10 flex flex-col justify-center">
           <h3 className="text-xl font-display mb-6 uppercase tracking-wider text-white/40">Access Protocol</h3>
           <div className="space-y-6 text-sm text-gray-500 font-sans leading-relaxed">
              <p>To enable personal match history auditing, follow these steps:</p>
              <ol className="list-decimal list-inside space-y-4 marker:text-accent marker:font-bold">
                 <li>Visit your <a href="https://help.steampowered.com/en/wizard/HelpWithGameIssue/?appid=730&issueid=128" target="_blank" className="text-accent hover:underline">Steam Personal Game Data</a> page.</li>
                 <li>Generate or copy your <b>Authentication Code</b>.</li>
                 <li>Locate your <b>Latest Match Sharing Code</b> (e.g. CSGO-XXXX...).</li>
                 <li>Paste both codes here to authorize the Vanguard Engine to fetch your telemetry.</li>
              </ol>
           </div>
        </div>
      </div>
    </motion.div>
  );
}

