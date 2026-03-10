import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Globe, Zap, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleLogin = () => {
    setIsConnecting(true);
    // Real redirection to the backend authentication endpoint
    window.location.href = '/api/auth/steam';
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-accent/20 rounded-full blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[150px] [animation-delay:2s] animate-pulse"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl relative z-10"
      >
        <div className="bg-card/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-12 shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Internal Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-50"></div>
          
          <div className="flex flex-col items-center text-center mb-12">
            <motion.div 
              whileHover={{ rotate: 360 }}
              transition={{ duration: 1, ease: "circOut" }}
              className="w-20 h-20 bg-background border border-white/10 rounded-3xl flex items-center justify-center mb-8 relative group"
            >
              <div className="absolute inset-0 bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <ShieldCheck className="w-10 h-10 text-accent relative z-10" />
            </motion.div>
            
            <h1 className="text-5xl font-display text-white tracking-[0.2em] mb-4">
              SECURE <span className="text-accent underline decoration-accent/30 underline-offset-8">ACCESS</span>
            </h1>
            <p className="text-gray-400 font-mono text-xs uppercase tracking-[0.3em]">
              The Trusted Authority for CS2 Reputation
            </p>
          </div>

          <div className="space-y-6 relative">
            <AnimatePresence mode="wait">
              {!isConnecting ? (
                <motion.button 
                  key="login-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={handleLogin}
                  className="w-full flex items-center justify-center gap-4 bg-gradient-to-b from-[#1e232b] to-[#121418] hover:from-[#2a3039] hover:to-[#171a21] text-white py-6 rounded-2xl font-bold transition-all border border-white/10 hover:border-accent/50 shadow-xl group overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-accent/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current text-white group-hover:text-accent transition-colors relative z-10">
                    <path d="M11.979 0C5.353 0 0 5.353 0 11.979c0 4.88 2.922 9.08 7.151 10.97l2.128-6.19c-.48-.24-.92-.54-1.32-.88l-2.89 4.14c-1.85-1.74-3.02-4.22-3.02-6.99 0-5.26 4.28-9.54 9.54-9.54 5.26 0 9.54 4.28 9.54 9.54 0 5.26-4.28 9.54-9.54 9.54-1.63 0-3.17-.41-4.54-1.13l1.84-5.36c.86.37 1.8.58 2.79.58 3.94 0 7.14-3.2 7.14-7.14 0-3.94-3.2-7.14-7.14-7.14-3.94 0-7.14 3.2-7.14 7.14 0 .68.1 1.34.28 1.97l-2.88 4.13c-.4-.34-.84-.64-1.32-.88l2.13-6.19c4.23-1.89 7.15-6.09 7.15-10.97C23.958 5.353 18.605 0 11.979 0zm-4.83 14.86c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm9.66 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/>
                  </svg>
                  <span className="tracking-[0.15em] text-sm relative z-10">CONTINUE WITH STEAM</span>
                </motion.button>
              ) : (
                <motion.div 
                  key="connecting"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full flex flex-col items-center gap-6 py-8"
                >
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [16, 32, 16], opacity: [0.3, 1, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                        className="w-1.5 bg-accent rounded-full"
                      />
                    ))}
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent animate-pulse">
                    Authenticating with Steam Network...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Verification Badges */}
            <div className="grid grid-cols-3 gap-4 mt-8 opacity-40">
              <div className="flex flex-col items-center gap-2">
                <Lock className="w-5 h-5 text-gray-400" />
                <span className="text-[8px] font-mono uppercase tracking-tighter">Encrypted</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Globe className="w-5 h-5 text-gray-400" />
                <span className="text-[8px] font-mono uppercase tracking-tighter">Worldwide</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Cpu className="w-5 h-5 text-gray-400" />
                <span className="text-[8px] font-mono uppercase tracking-tighter">Verified</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-[10px] text-gray-600 font-mono tracking-widest leading-loose uppercase">
            By accessing this terminal, you authorize CSWH to retrieve your public <br />
            Steam Community identifiers for reputation mapping.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
