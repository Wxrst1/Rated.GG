import { Shield, Github, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-background border-t border-white/5 py-24 relative overflow-hidden">
      <div className="scanline opacity-[0.02]" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start gap-16">
          <div className="flex flex-col gap-6 max-w-sm">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 group hover:border-accent/40 transition-all">
                  <Shield className="w-5 h-5 text-white/20 group-hover:text-accent" />
               </div>
               <span className="font-display text-3xl text-white uppercase italic tracking-tighter">Rated.gg</span>
            </div>
            <p className="text-[11px] font-mono text-white/20 uppercase tracking-[0.4em] leading-relaxed">
               Maintaining competitive integrity via decentralized behavioral forensics. 
               The truth of the grid is absolute.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-24">
             <div className="flex flex-col gap-6">
                <span className="text-[10px] font-black text-accent uppercase tracking-[0.5em]">Command</span>
                <div className="flex flex-col gap-4 text-[11px] font-bold text-white/40 uppercase tracking-widest">
                   <a href="#" className="hover:text-white transition-colors">Nodes</a>
                   <a href="#" className="hover:text-white transition-colors">Leaderboards</a>
                   <a href="#" className="hover:text-white transition-colors">API Intel</a>
                </div>
             </div>
             <div className="flex flex-col gap-6">
                <span className="text-[10px] font-black text-accent uppercase tracking-[0.5em]">Protocol</span>
                <div className="flex flex-col gap-4 text-[11px] font-bold text-white/40 uppercase tracking-widest">
                   <a href="#" className="hover:text-white transition-colors">Privacy</a>
                   <a href="#" className="hover:text-white transition-colors">Terms</a>
                   <a href="#" className="hover:text-white transition-colors">Compliance</a>
                </div>
             </div>
             <div className="flex flex-col gap-6">
                <span className="text-[10px] font-black text-accent uppercase tracking-[0.5em]">Connect</span>
                <div className="flex gap-4">
                   <button className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-accent/40 transition-all text-white/20 hover:text-accent"><Github size={18} /></button>
                   <button className="p-3 bg-white/5 rounded-xl border border-white/10 hover:border-accent/40 transition-all text-white/20 hover:text-accent"><Twitter size={18} /></button>
                </div>
             </div>
          </div>
        </div>
        
        <div className="mt-24 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
           <span className="text-[9px] font-mono text-white/10 uppercase tracking-[0.6em]">© {new Date().getFullYear()} Grid Core Systems // Node-X</span>
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Global Terminal Status: Operational</span>
           </div>
        </div>
      </div>
    </footer>
  );
}
