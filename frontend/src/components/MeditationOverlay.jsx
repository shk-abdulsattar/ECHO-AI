import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const EXERCISES = [
    {
        id: 'body-scan', name: 'Body Scan', category: 'Body Scan', durationSec: 420,
        difficulty: 'Moderate', icon: 'airline_seat_flat', color: 'var(--primary-container)',
        description: 'Slow attention from crown to toes, releasing hidden tension layer by layer.',
        steps: ['Lie down or sit comfortably and close your eyes.', 'Take 3 deep breaths to settle in.', 'Begin at the crown of your head and slowly move attention downward.', 'Pause at each body area — notice tension without judgment.', 'Continue to your toes, then rest in whole-body awareness.'],
        rules: ['Do not try to change what you feel — only observe.', 'If your mind wanders, gently return to where you left off.', 'Keep breathing slowly and naturally throughout.'],
        lines: ['Feel contact points where you are supported.', 'Scan the face and jaw for hidden tension.', 'Invite warmth into the heart space.', 'Move down through hips and legs.', 'Rest in whole-body awareness.'],
    },
    {
        id: 'mindful-pause', name: 'Mindful Pause', category: 'Mindfulness', durationSec: 180,
        difficulty: 'Gentle', icon: 'pause_circle', color: '#6BAAFF',
        description: 'A short reset between tasks to reclaim presence and calm.',
        steps: ['Stop what you are doing and sit upright.', 'Take one slow, full breath in and out.', 'Name 3 things you can hear right now.', 'Feel the temperature of the air on your skin.', 'Return to the present moment with intention.'],
        rules: ['Keep eyes open or softly closed — your choice.', 'Stay in this moment only — not past, not future.', 'This is a reset, not a sleep exercise.'],
        lines: ['Name three things you hear.', 'Feel the temperature of the air.', 'Return to the room gently.', 'Choose the next moment on purpose.'],
    },
    {
        id: 'lake-visual', name: 'Still Lake', category: 'Visualization', durationSec: 360,
        difficulty: 'Moderate', icon: 'water', color: '#00E5CC',
        description: 'Visualize a perfectly calm surface reflecting sky and deep stillness.',
        steps: ['Close your eyes and picture a quiet lake at dawn.', 'See the surface — perfectly still, reflecting the sky.', 'With each exhale, imagine ripples slowing to nothing.', 'Let your mind become as still as that water.', 'Hold this image gently for the full session.'],
        rules: ['Treat intruding thoughts as passing clouds — let them drift.', 'Breathe naturally, do not force any rhythm.', 'Return to the lake image whenever you drift away.'],
        lines: ['Picture a quiet lake at dawn.', 'Ripples slow and smooth into stillness.', 'Your mind can mirror that calm.', 'Breathe as if the water breathes with you.'],
    },
    {
        id: 'sleep-descent', name: 'Sleep Descent', category: 'Sleep', durationSec: 600,
        difficulty: 'Soft', icon: 'bedtime', color: '#B39DDB',
        description: 'Gradual unwinding for night transitions and deep, natural rest.',
        steps: ['Lie down in a comfortable position in dim or dark light.', 'Close your eyes and let the day close behind you.', 'Imagine a slow elevator descending, floor by floor.', 'With each floor, feel your body grow heavier and relaxed.', 'Allow yourself to drift without chasing sleep.'],
        rules: ['Do not check the time during this exercise.', 'If thoughts arise, acknowledge them and release them.', 'Allow yourself to fall asleep if it happens naturally.'],
        lines: ['Let the day finish behind you.', 'Each number is an elevator floor downward.', 'Muscles heavy, breath quiet.', 'Drift without chasing sleep.'],
    },
];


export default function MeditationOverlay() {
    const { currentUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [active, setActive] = useState(null);        
    const [running, setRunning] = useState(false);     
    const [remaining, setRemaining] = useState(0);
    const [lineIdx, setLineIdx] = useState(0);
    const [showSteps, setShowSteps] = useState(true);
    const startedAt = useRef(null);
    const timerRef = useRef(null);
    const lineRef = useRef(null);

    
    useEffect(() => {
        const open = () => { setActive(null); setRunning(false); setIsOpen(true); };
        window.addEventListener('echo-open-meditate', open);
        return () => window.removeEventListener('echo-open-meditate', open);
    }, []);

    
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === 'Escape' && !running) handleBack(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen, running]);

    
    useEffect(() => {
        if (!running || !active) return;
        startedAt.current = Date.now();
        let r = active.durationSec;
        setRemaining(r);
        setLineIdx(0);
        timerRef.current = setInterval(() => {
            r -= 1; setRemaining(r);
            if (r <= 0) { clearInterval(timerRef.current); clearInterval(lineRef.current); finishSession(true); }
        }, 1000);
        lineRef.current = setInterval(() => setLineIdx(i => i + 1), 30000);
        return () => { clearInterval(timerRef.current); clearInterval(lineRef.current); };
    }, [running, active?.id]);

    const handleBack = () => {
        if (active) { setActive(null); }
        else { setIsOpen(false); }
        stopTimer();
    };

    const stopTimer = () => {
        clearInterval(timerRef.current);
        clearInterval(lineRef.current);
        setRunning(false);
        setRemaining(0);
        startedAt.current = null;
    };

    const close = () => { stopTimer(); setActive(null); setIsOpen(false); };

    const selectExercise = (ex) => {
        setActive(ex);
        setRemaining(ex.durationSec);
        setShowSteps(true);
        setRunning(false);
    };

    const handleStartStop = () => {
        if (running) {
          
            finishSession(false);
        } else {
            setRunning(true);
        }
    };

    const finishSession = async (completed) => {
        const spent = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : 0;
        stopTimer();
        if (currentUser && spent > 3) {
            await addDoc(collection(db, 'users', currentUser.uid, 'meditationSessions'), {
                name: active.name, category: active.category, secondsSpent: spent, completed, endedAt: serverTimestamp(),
            });
            await updateDoc(doc(db, 'users', currentUser.uid), { meditationsDone: increment(1) });
        }
        if (completed) {
            setActive(null);
        }
    };

    const progress = active ? ((active.durationSec - remaining) / active.durationSec) * 100 : 0;
    const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
    const secs = String(remaining % 60).padStart(2, '0');
    const guidance = active ? active.lines[lineIdx % active.lines.length] : '';

    if (!isOpen) return null;

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget && !running) close(); }}
            style={S.backdrop} role="dialog" aria-modal="true" aria-label="Meditation"
        >
            <div className="animate-scale-in" style={{ ...S.panel, maxWidth: active ? '420px' : '460px' }}>

              
                <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: active ? active.color : 'var(--glow-primary)', filter: 'blur(80px)', opacity: 0.1, pointerEvents: 'none', transition: 'background 0.5s ease' }} />

               
                {!active && (
                    <>
                        <div style={S.header}>
                            <div>
                                <h2 style={S.title}>Meditation</h2>
                                <p style={S.subtitle}>Choose your practice for today</p>
                            </div>
                            <button onClick={close} style={S.iconBtn} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {EXERCISES.map(ex => (
                                <button key={ex.id} onClick={() => selectExercise(ex)} style={S.card}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = ex.color + '55'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.background = 'var(--surface-container)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'var(--surface-container-low)'; }}
                                >
                                    <div style={{ width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ex.color + '1A', border: `1px solid ${ex.color}33`, marginBottom: 10 }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 22, color: ex.color, fontVariationSettings: "'FILL' 1, 'wght' 300" }}>{ex.icon}</span>
                                    </div>
                                    <div style={{ textAlign: 'left', width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}>{ex.name}</p>
                                            <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: ex.color, opacity: 0.85 }}>{ex.difficulty}</span>
                                        </div>
                                        <p style={{ margin: '4px 0 0', fontSize: 11, fontFamily: 'Inter, sans-serif', color: 'var(--on-surface-variant)', opacity: 0.6, lineHeight: 1.4 }}>{ex.description}</p>
                                        <p style={{ margin: '7px 0 0', fontSize: 10, color: ex.color, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>{Math.round(ex.durationSec / 60)} min</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                )}

               
                {active && (
                    <>
                        
                        {!running && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                                <button onClick={handleBack} style={S.iconBtn} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
                                </button>
                            </div>
                        )}

                       
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10 }}>
                            <div style={{ width: 76, height: 76, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active.color + '1A', border: `1.5px solid ${active.color}40`, boxShadow: `0 0 36px ${active.color}30`, transition: 'box-shadow 0.4s ease' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 36, color: active.color, fontVariationSettings: "'FILL' 1, 'wght' 300" }}>{active.icon}</span>
                            </div>
                            <div>
                                <p style={{ margin: 0, fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: active.color, opacity: 0.75, fontFamily: 'Inter, sans-serif' }}>{active.category}</p>
                                <h2 style={{ margin: '3px 0 0', fontSize: 20, fontWeight: 700, fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}>{active.name}</h2>
                            </div>

                          
                            <div style={{ fontSize: 48, fontWeight: 200, fontFamily: 'Manrope, sans-serif', color: running ? active.color : 'var(--on-surface)', letterSpacing: '-0.02em', lineHeight: 1, transition: 'color 0.4s ease', filter: running ? `drop-shadow(0 0 12px ${active.color}80)` : 'none' }}>
                                {running ? `${mins}:${secs}` : `${String(Math.floor(active.durationSec / 60)).padStart(2, '0')}:00`}
                            </div>

                            
                            {running && (
                                <p key={lineIdx} className="animate-scale-in" style={{ margin: 0, fontSize: 12, fontStyle: 'italic', fontFamily: 'Manrope, sans-serif', fontWeight: 300, color: 'var(--on-surface-variant)', opacity: 0.8, lineHeight: 1.6 }}>
                                    "{guidance}"
                                </p>
                            )}
                        </div>

                  
                        <button
                            onClick={handleStartStop}
                            style={{
                                ...S.startBtn,
                                background: running ? 'transparent' : active.color !== 'var(--primary-container)' ? active.color : 'var(--primary-container)',
                                border: running ? `1px solid ${active.color}` : 'none',
                                color: running ? active.color : 'var(--on-primary)',
                                boxShadow: running ? 'none' : `0 4px 20px ${active.color}44`,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                                {running ? 'stop_circle' : 'play_arrow'}
                            </span>
                            {running ? 'Stop Session' : 'Begin Session'}
                        </button>

               
                        <div style={{ background: 'var(--surface-container)', border: '1px solid var(--glass-border)', borderRadius: 18, overflow: 'hidden' }}>
                            {/* Tab row */}
                            <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)' }}>
                                {[{ key: true, label: 'How to meditate', icon: 'menu_book' }, { key: false, label: 'Rules', icon: 'rule' }].map(({ key, label, icon }) => (
                                    <button key={String(key)} onClick={() => setShowSteps(key)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 6px', border: 'none', background: showSteps === key ? 'var(--surface-container-high)' : 'transparent', cursor: 'pointer', transition: 'background 0.2s ease' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 12, color: showSteps === key ? active.color : 'var(--on-surface-variant)', fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'Inter, sans-serif', color: showSteps === key ? 'var(--on-surface)' : 'var(--on-surface-variant)', opacity: showSteps === key ? 1 : 0.5 }}>{label}</span>
                                    </button>
                                ))}
                            </div>

                            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {(showSteps ? active.steps : active.rules).map((item, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: active.color + '20', border: `1px solid ${active.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                                            {showSteps
                                                ? <span style={{ fontSize: 9, fontWeight: 800, color: active.color, fontFamily: 'Inter, sans-serif' }}>{i + 1}</span>
                                                : <span className="material-symbols-outlined" style={{ fontSize: 11, color: active.color, fontVariationSettings: "'FILL' 1" }}>check</span>
                                            }
                                        </div>
                                        <p style={{ margin: 0, fontSize: 12, fontFamily: 'Inter, sans-serif', color: 'var(--on-surface-variant)', lineHeight: 1.55, flex: 1 }}>{item}</p>
                                    </div>
                                ))}
                            </div>

                            <p style={{ margin: 0, padding: '0 16px 10px', fontSize: 10, fontFamily: 'Inter, sans-serif', color: active.color, opacity: 0.55, textAlign: 'center' }}>
                                {Math.round(active.durationSec / 60)} min · {active.difficulty}
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const S = {
    backdrop: { position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' },
    panel: { position: 'relative', width: '100%', background: 'var(--surface-container-low)', border: '1px solid var(--glass-border)', borderRadius: '28px', padding: '24px', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '92vh', overflowY: 'auto', transition: 'max-width 0.4s ease' },
    header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' },
    title: { margin: 0, fontSize: '19px', fontWeight: 700, fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' },
    subtitle: { margin: '4px 0 0', fontSize: '12px', fontFamily: 'Inter, sans-serif', color: 'var(--on-surface-variant)', opacity: 0.55 },
    iconBtn: { flexShrink: 0, width: 32, height: 32, borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--on-surface-variant)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s ease' },
    card: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '14px', borderRadius: '18px', border: '1px solid var(--glass-border)', background: 'var(--surface-container-low)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.25s ease' },
    startBtn: { width: '100%', padding: '13px', borderRadius: '14px', fontSize: '14px', fontWeight: 700, fontFamily: 'Inter, sans-serif', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.3s ease' },
};
