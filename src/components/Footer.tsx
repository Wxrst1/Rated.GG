import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-12 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl text-accent">CSWH</span>
            <span className="text-gray-500 text-sm">© {new Date().getFullYear()} CSWH. All rights reserved.</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link to="/about" className="hover:text-accent transition-colors">About</Link>
            <Link to="/leaderboard" className="hover:text-accent transition-colors">Leaderboard</Link>
            <Link to="/privacy" className="hover:text-accent transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-accent transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
