import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import PrivateRoute from './components/PrivateRoute';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Chat from './components/Chat';
import SessionHistory from './components/SessionHistory';
import MeditationOverlay from './components/MeditationOverlay';
import BreathingOverlay from './components/BreathingOverlay';
import MemoryGameOverlay from './components/MemoryGameOverlay';
import Profile from './components/Profile';

import PanicOverlay from './components/PanicOverlay';
import MoodTrackerOverlay from './components/MoodTrackerOverlay';
import GoalsOverlay from './components/GoalsOverlay';
import LandingPage from './components/LandingPage';

import './index.css';

const NAV_LINKS = [
    { to: '/chat', icon: 'forum', label: 'Chat' },
    { to: '/mood', icon: 'mood', label: 'Mood', openMoodOverlay: true },
    { to: '/goals', icon: 'flag', label: 'Goals', openGoalsOverlay: true },

    { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },

    { to: '/meditation', icon: 'self_improvement', label: 'Meditate', openMeditateOverlay: true },
    { to: '/breathe', icon: 'air', label: 'Breathe', openBreatheOverlay: true },
    { to: '/game', icon: 'sports_esports', label: 'Game', openGameOverlay: true },
];

function AppContent() {
    const { currentUser, userData, loading, logout } = useAuth();
    const [isPanicOpen, setIsPanicOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const open = () => setIsPanicOpen(true);
        window.addEventListener('echo-open-panic', open);
        return () => window.removeEventListener('echo-open-panic', open);
    }, []);

    const handleLogout = useCallback(
        (reason) => {
            if (reason === 'idle') {
                try {
                    sessionStorage.setItem('echo_idle_logout', '1');
                } catch {
                    /* ignore */
                }
            }
            logout();
            navigate('/login');
        },
        [logout, navigate]
    );

    useEffect(() => {
        if (!currentUser) return;

        let idleTimer;
        const resetTimer = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => handleLogout('idle'), 20 * 60 * 1000);
        };

        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach((evt) => document.addEventListener(evt, resetTimer));
        resetTimer();

        return () => {
            clearTimeout(idleTimer);
            events.forEach((evt) => document.removeEventListener(evt, resetTimer));
        };
    }, [currentUser, handleLogout]);

    const panicContacts = userData?.emergencyContacts || [];

    const shell = (children) => (
        <>
            <PanicOverlay isOpen={isPanicOpen} onClose={() => setIsPanicOpen(false)} emergencyContacts={panicContacts} />
            <MoodTrackerOverlay />
            <GoalsOverlay />
            <BreathingOverlay />
            <MeditationOverlay />
            <MemoryGameOverlay />
            <SessionHistory />
            {children}
        </>
    );

  
    if (!currentUser) {
        return (
            <>
                <div className="min-h-screen w-full flex flex-col bg-background">
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="*" element={<LandingPage />} />
                    </Routes>
                </div>
            </>
        );
    }

    
    if (currentUser && (!userData || loading)) {
        return (
            <>
                <div className="min-h-screen w-full flex items-center justify-center bg-background nebula-bg">
                    <div className="text-center animate-float-up">
                        <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                            <img src="/logo-light.png" alt="ECHO Loading" className="w-full h-full object-contain animate-pulse" />
                        </div>
                        <p className="text-sm uppercase tracking-[0.3em] text-[var(--on-surface-variant)] font-headline">
                            Loading, please wait...
                        </p>
                    </div>
                </div>
            </>
        );
    }

   
    if (userData && !userData.isOnboarded) {
        return (
            <>
                <div className="min-h-screen w-full flex flex-col bg-background">
                    <Routes>
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route path="*" element={<Onboarding />} />
                    </Routes>
                </div>
            </>
        );
    }

   
    return shell(
        <div className="min-h-screen h-[100dvh] w-full max-w-full overflow-hidden relative flex nebula-bg flex-1" style={{ background: 'var(--background)' }}>

            
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute top-[-15%] left-[-5%] w-[55vw] h-[55vw] rounded-full animate-parallax"
                    style={{ background: 'radial-gradient(circle, var(--glow-secondary) 0%, transparent 65%)', filter: 'blur(60px)' }}
                />
                <div
                    className="absolute bottom-[-15%] right-[-5%] w-[45vw] h-[45vw] rounded-full animate-parallax"
                    style={{ background: 'radial-gradient(circle, var(--glow-primary) 0%, transparent 65%)', filter: 'blur(80px)', animationDelay: '-5s' }}
                />
            </div>

           
            {location.pathname !== '/profile' && (
                <div className="fixed bottom-0 left-0 w-full h-24 z-[190] group/dock bg-transparent flex justify-center">
                    <nav
                        className={`absolute bottom-6 z-[200] flex flex-row items-center px-4 py-2 gap-2 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${location.pathname === '/' || location.pathname === '/dashboard'
                            ? 'translate-y-0 opacity-100'
                            : 'translate-y-[150%] opacity-0 group-hover/dock:translate-y-0 group-hover/dock:opacity-100'
                            }`}
                        style={{
                            background: 'var(--glass-bg)',
                            backdropFilter: 'blur(40px)',
                            WebkitBackdropFilter: 'blur(40px)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '2rem',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                        }}
                    >


                      
                        <div className="flex flex-row items-center gap-1">
                            {NAV_LINKS.map(({ to, icon, label, openMoodOverlay, openGoalsOverlay, openBreatheOverlay, openMeditateOverlay, openHistoryOverlay, openGameOverlay }) => {
                                const isActive = location.pathname === to || (to === '/dashboard' && location.pathname === '/');
                                return (
                                    <Link
                                        key={to}
                                        to={to}
                                        onClick={(e) => {
                                            if (openMoodOverlay) {
                                                e.preventDefault();
                                                window.dispatchEvent(new Event('echo-open-mood'));
                                            }
                                            if (openGoalsOverlay) {
                                                e.preventDefault();
                                                window.dispatchEvent(new Event('echo-open-goals'));
                                            }
                                            if (openBreatheOverlay) {
                                                e.preventDefault();
                                                window.dispatchEvent(new Event('echo-open-breathe'));
                                            }
                                            if (openMeditateOverlay) {
                                                e.preventDefault();
                                                window.dispatchEvent(new Event('echo-open-meditate'));
                                            }
                                            if (openHistoryOverlay) {
                                                e.preventDefault();
                                                window.dispatchEvent(new Event('echo-open-history'));
                                            }
                                            if (openGameOverlay) {
                                                e.preventDefault();
                                                window.dispatchEvent(new Event('echo-open-memory-game'));
                                            }
                                        }}
                                        className={`relative flex items-center justify-center w-11 h-11 rounded-2xl group transition-all duration-300 ${isActive ? 'bg-[var(--glass-border)]' : 'hover:bg-[var(--surface-container-low)]'}`}>
                                        <span
                                            className={`material-symbols-outlined transition-all duration-300 ${isActive ? 'text-[var(--primary-container)]' : 'text-[var(--on-surface-variant)] group-hover:text-[var(--primary)]'}`}
                                            style={{ fontVariationSettings: isActive ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 200", fontSize: '22px' }}
                                        >
                                            {icon}
                                        </span>
                                       
                                        <span className="dock-tooltip">
                                            {label}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>
                </div>
            )}

         
            <main className="relative z-10 flex flex-col h-full overflow-hidden flex-1">
                <div className="page-transition-enter h-full flex flex-col min-h-0" key={location.pathname}>
                    <Routes>
                        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                        <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
                    
                        <Route path="/game" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                        <Route path="*" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    </Routes>
                </div>
            </main>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

export default App;
