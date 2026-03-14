/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PlayerProfile from './pages/PlayerProfile';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MatchDetail from './pages/MatchDetail';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-background text-text">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/player/:steamId" element={<PlayerProfile />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/match/:matchId" element={<MatchDetail />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
