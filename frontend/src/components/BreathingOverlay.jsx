import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp, updateDoc, increment, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const LEVELS = [
    { id: 'level1', label: 'Level 1', desc: 'Box Breathing', inhale: 4, hold: 4, exhale: 4 },
    { id: 'level2', label: 'Level 2', desc: 'Relax', inhale: 4, hold: 7, exhale: 8 },
    { id: 'level3', label: 'Level 3', desc: 'Energize', inhale: 2, hold: 2, exhale: 4 },
];

export default function BreathingOverlay() {
    const { currentUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [pattern, setPattern] = useState(LEVELS[0]);
    const [running, setRunning] = useState(false);
    const [phase, setPhase] = useState('Ready');
    const [phaseLeft, setPhaseLeft] = useState(0);
    const startedAt = useRef(null);

   
    useEffect(() => {
        const open = () => setIsOpen(true);
        window.addEventListener('echo-open-breathe', open);
        return () => window.removeEventListener('echo-open-breathe', open);
    }, []);

    
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === 'Escape' && !running) setIsOpen(false); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, running]);

    
    useEffect(() => {
        if (!running) return;
        startedAt.current = Date.now();
        let cancelled = false;

        const run = async () => {
            const cycle = async (p) => {
                if (cancelled) return;
                setPhase('Inhale');
                for (let i = p.inhale; i > 0; i--) { if (cancelled) return; setPhaseLeft(i); await new Promise((r) => setTimeout(r, 1000)); }

                if (p.hold > 0) {
                    setPhase('Hold');
                    for (let i = p.hold; i > 0; i--) { if (cancelled) return; setPhaseLeft(i); await new Promise((r) => setTimeout(r, 1000)); }
                }

                setPhase('Exhale');
                for (let i = p.exhale; i > 0; i--) { if (cancelled) return; setPhaseLeft(i); await new Promise((r) => setTimeout(r, 1000)); }

                if (!cancelled) cycle(p);
            };
            await cycle(pattern);
        };

        run();
        return () => { cancelled = true; };
    }, [running, pattern]);

    const stopAndLog = async () => {
        const spent = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
        if (currentUser && spent > 3) {
            await addDoc(collection(db, 'users', currentUser.uid, 'breathingSessions'), {
                pattern: pattern.label, patternId: pattern.id, secondsSpent: spent, endedAt: serverTimestamp(),
            });
            await updateDoc(doc(db, 'users', currentUser.uid), { breathingSessionsDone: increment(1) });
            
            sessionStorage.setItem('echo_breathed_today', new Date().toLocaleDateString('en-CA'));
        }
        setRunning(false);
        setPhase('Ready');
        setPhaseLeft(0);
        startedAt.current = null;
    };

    if (!isOpen) return null;

    const scale = phase === 'Inhale' || phase === 'Hold' ? 1.25 : phase === 'Exhale' ? 0.85 : 1;
    const glowIntensity = phase === 'Inhale' || phase === 'Hold' ? '60px' : phase === 'Exhale' ? '10px' : '30px';

   
    const transitionDuration = phase === 'Inhale' ? `${pattern.inhale * 1000}ms`
        : phase === 'Exhale' ? `${pattern.exhale * 1000}ms`
            : '1000ms';

    return (
        <div style={styles.backdrop} onClick={(e) => { if (e.target === e.currentTarget && !running) setIsOpen(false); }}>
            <style>{`
                @keyframes spin-slow { 100% { transform: rotate(360deg); } }
                @keyframes spin-slow-reverse { 100% { transform: rotate(-360deg); } }
                .wavy-ring-1 { animation: spin-slow 15s linear infinite; }
                .wavy-ring-2 { animation: spin-slow-reverse 20s linear infinite; }
            `}</style>
            <div className="animate-scale-in" style={styles.panel}>

                {/* Header */}
                <div style={styles.header}>
                    <h2 style={styles.title}>Breathe</h2>
                    {!running && (
                        <button
                            onClick={() => setIsOpen(false)}
                            style={styles.closeBtn}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                        </button>
                    )}
                </div>

                
                <div style={styles.visualizerWrap}>
                    <div className="animate-float-up" style={{ position: 'relative', width: '210px', height: '210px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                        
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transform: `scale(${scale})`,
                            transition: `transform ${transitionDuration} ease-in-out`
                        }}>
                            
                            <div className="wavy-ring-1" style={{
                                position: 'absolute', inset: '0px',
                                border: '1.5px solid var(--primary)',
                                borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
                                opacity: 0.6
                            }} />

                            
                            <div className="wavy-ring-2" style={{
                                position: 'absolute', inset: '10px',
                                border: '1.5px solid var(--primary-container)',
                                borderRadius: '50% 40% 30% 70% / 60% 40% 70% 50%',
                                opacity: 0.8
                            }} />

                           
                            <div style={{
                                position: 'absolute', inset: '25px',
                                borderRadius: '50%',
                                border: '14px solid var(--primary-container)',
                                boxShadow: `inset 0 0 0 6px var(--surface-container-highest), 0 0 ${glowIntensity} var(--glow-primary)`,
                                background: 'var(--surface-container-low)',
                                transition: `box-shadow ${transitionDuration} ease-in-out`
                            }} />

                        </div>

                       
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            animation: running ? 'spin-slow 24s linear infinite' : 'none',
                        }}>
                            
                            <div style={{ ...styles.dot, top: '-5%', left: '15%', width: '10px', height: '10px', background: 'var(--primary)' }} />
                            <div style={{ ...styles.dot, top: '5%', right: '10%', width: '14px', height: '14px', background: 'var(--primary-container)' }} />
                            <div style={{ ...styles.dot, top: '25%', right: '-15%', width: '8px', height: '8px', border: '1.5px solid var(--primary)', background: 'transparent' }} />
                            <div style={{ ...styles.dot, top: '45%', left: '-10%', width: '16px', height: '16px', border: '2px solid var(--primary-container)', background: 'transparent' }} />
                            <div style={{ ...styles.dot, bottom: '35%', right: '-5%', width: '10px', height: '10px', background: 'var(--primary)' }} />
                            <div style={{ ...styles.dot, bottom: '15%', left: '5%', width: '20px', height: '20px', border: '1.5px solid var(--primary)', background: 'transparent' }} />
                            <div style={{ ...styles.dot, bottom: '-5%', right: '20%', width: '12px', height: '12px', background: 'var(--primary-container)' }} />
                            <div style={{ ...styles.dot, bottom: '5%', right: '45%', width: '6px', height: '6px', background: 'var(--primary)' }} />
                            <div style={{ ...styles.dot, top: '15%', left: '35%', width: '6px', height: '6px', background: 'var(--primary-container)' }} />
                            <div style={{ ...styles.dot, top: '35%', left: '-20%', width: '8px', height: '8px', background: 'var(--primary)' }} />
                        </div>

                       
                        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', transition: 'opacity 0.3s ease', opacity: running ? 1 : 0.4 }}>
                            <p style={{ ...styles.phaseText, opacity: running ? 1 : 0 }}>{phase}</p>
                            <p style={styles.phaseTimer}>
                                {running ? phaseLeft : null}
                            </p>
                        </div>
                    </div>
                </div>

                
                <div style={styles.controlsWrap} className="animate-float-up delay-1">

                   
                    <div style={{ ...styles.levelSelector, opacity: running ? 0.3 : 1, pointerEvents: running ? 'none' : 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '8px' }}>
                            {LEVELS.map((p) => {
                                const active = pattern.id === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => setPattern(p)}
                                        style={{
                                            ...styles.levelBtn,
                                            color: active ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                                            fontWeight: active ? 800 : 500,
                                            opacity: active ? 1 : 0.6,
                                        }}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>
                        <p style={styles.levelDesc}>{pattern.desc}</p>
                    </div>

                    
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                        {!running ? (
                            <button
                                onClick={() => setRunning(true)}
                                style={styles.startBtn}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px var(--glow-primary)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 4px 14px var(--glow-primary)';
                                }}
                            >
                                Start
                            </button>
                        ) : (
                            <button
                                onClick={stopAndLog}
                                style={styles.stopBtn}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(255, 80, 80, 0.15)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255, 80, 80, 0.05)';
                                }}
                            >
                                Stop
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

const styles = {
    backdrop: {
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
    },
    panel: {
        position: 'relative', width: '100%', maxWidth: '380px',
        background: 'var(--surface-container-low)',
        border: '1px solid var(--glass-border)',
        borderRadius: '32px',
        padding: '24px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px var(--glass-border)',
        display: 'flex', flexDirection: 'column', gap: '24px',
    },
    header: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    },
    title: {
        margin: 0, fontSize: '19px', fontWeight: 700,
        fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)',
        letterSpacing: '0', position: 'relative', zIndex: 1
    },
    closeBtn: {
        width: '36px', height: '36px', borderRadius: '12px',
        border: '1px solid var(--glass-border)', background: 'transparent',
        color: 'var(--on-surface-variant)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s ease',
    },
    visualizerWrap: {
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        padding: '24px 0',
    },
    ring: {
        position: 'absolute',
        transitionProperty: 'transform, border-radius, border-color',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: 'none',
    },
    mainCircle: {
        position: 'relative', width: '150px', height: '150px',
        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transitionProperty: 'transform, box-shadow, background, border-color',
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
    phaseText: {
        margin: '0 0 4px', fontSize: '11px', fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.3em',
        color: 'var(--primary-container)', fontFamily: 'Inter, sans-serif',
    },
    phaseTimer: {
        margin: 0, fontSize: '56px', fontWeight: 300,
        color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif',
        lineHeight: 1,
    },
    controlsWrap: {
        display: 'flex', flexDirection: 'column', gap: '24px',
    },
    levelSelector: {
        textAlign: 'center', transition: 'opacity 0.3s ease',
    },
    levelBtn: {
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '15px', fontFamily: 'Inter, sans-serif',
        padding: '4px 8px', transition: 'all 0.2s ease',
    },
    levelDesc: {
        margin: 0, fontSize: '12px', color: 'var(--on-surface-variant)',
        opacity: 0.6, fontFamily: 'Inter, sans-serif',
    },
    startBtn: {
        padding: '14px 40px', borderRadius: '99px',
        border: 'none', cursor: 'pointer',
        background: 'var(--primary-container)',
        color: 'var(--on-primary)',
        fontSize: '14px', fontWeight: 800,
        fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em',
        textTransform: 'uppercase',
        boxShadow: '0 4px 14px var(--glow-primary)',
        transition: 'all 0.3s var(--ease-cinematic)',
    },
    stopBtn: {
        padding: '14px 40px', borderRadius: '99px',
        border: '1px solid var(--error)', cursor: 'pointer',
        background: 'rgba(255, 80, 80, 0.05)',
        color: 'var(--error)',
        fontSize: '14px', fontWeight: 800,
        fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em',
        textTransform: 'uppercase',
        transition: 'all 0.3s var(--ease-cinematic)',
    },
    dot: {
        position: 'absolute',
        borderRadius: '50%',
        opacity: 0.8,
        pointerEvents: 'none',
    },
};
