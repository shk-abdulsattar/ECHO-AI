import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const NATURE = ['🌿', '🍃', '🌊', '☀️', '🪨', '🌙', '💧', '🔥', '🌲', '🦋'];
const LEVELS = {
    easy: { id: 'easy', label: 'Easy', rows: 3, cols: 4, pairs: 6, desc: 'A gentle start to warm up your mind.' },
    medium: { id: 'medium', label: 'Medium', rows: 4, cols: 4, pairs: 8, desc: 'A balanced challenge for focus.' },
    hard: { id: 'hard', label: 'Hard', rows: 4, cols: 5, pairs: 10, desc: 'Deep focus required to clear the board.' },
};

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export default function MemoryGameOverlay() {
    const { currentUser, userData } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [openKey, setOpenKey] = useState(0); 
    const [difficulty, setDifficulty] = useState(null);
    const [previewLevel, setPreviewLevel] = useState('easy');
    const [cards, setCards] = useState([]);
    const [flipped, setFlipped] = useState([]);
    const [matched, setMatched] = useState(new Set());
    const [moves, setMoves] = useState(0);
    const [startedAt, setStartedAt] = useState(null);
    const [elapsed, setElapsed] = useState(0);
    const [lock, setLock] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);
    const loggedRound = useRef(false);
    const timerRef = useRef(null);
    const revealTimeout = useRef(null);

    
    useEffect(() => {
        const open = () => {
            setDifficulty(null);
            setPreviewLevel('easy');
            setIsOpen(true);
            setOpenKey(k => k + 1); 
        };
        window.addEventListener('echo-open-memory-game', open);
        return () => window.removeEventListener('echo-open-memory-game', open);
    }, []);

  
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen]);

    const startGame = useCallback((levelId) => {
        const spec = LEVELS[levelId];
        const icons = NATURE.slice(0, spec.pairs);
        const deck = shuffle([...icons, ...icons].map((icon, i) => ({ id: i, icon, key: `${icon}-${i}` })));

        setDifficulty(levelId);
        setCards(deck);
        setFlipped([]);
        setMatched(new Set());
        setMoves(0);
        setElapsed(0);
        setLock(true); 
        setIsRevealed(true);
        loggedRound.current = false;

        clearTimeout(revealTimeout.current);
        clearInterval(timerRef.current);
        setStartedAt(null);

      
        revealTimeout.current = setTimeout(() => {
            setIsRevealed(false);
            setLock(false);
            setStartedAt(Date.now()); 
        }, 2000);

    }, []);

    
    useEffect(() => {
        if (!startedAt || matched.size === cards.length) {
            clearInterval(timerRef.current);
            return;
        }
        timerRef.current = setInterval(() => {
            setElapsed(Math.floor((Date.now() - startedAt) / 1000));
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [startedAt, matched.size, cards.length]);

    const done = cards.length > 0 && matched.size === cards.length;

    
    useEffect(() => {
        if (!done || !currentUser || loggedRound.current) return;
        loggedRound.current = true;
        const run = async () => {
            const sec = Math.floor((Date.now() - startedAt) / 1000);
            await addDoc(collection(db, 'users', currentUser.uid, 'memoryGameSessions'), {
                difficulty, completed: true, seconds: sec, moves, endedAt: serverTimestamp(),
            });
            const bestKey = `bestTime_${difficulty}`;
            const prev = userData?.[bestKey];
            if (prev == null || sec < prev) {
                await updateDoc(doc(db, 'users', currentUser.uid), { [bestKey]: sec });
            }
            sessionStorage.setItem('echo_memory_today', new Date().toLocaleDateString('en-CA'));
        };
        run();
    }, [done, currentUser, difficulty, moves, startedAt, userData]);

    const saveIncomplete = () => {
        if (!loggedRound.current && startedAt && moves > 0 && currentUser) {
            loggedRound.current = true;
            const sec = Math.floor((Date.now() - startedAt) / 1000);
            addDoc(collection(db, 'users', currentUser.uid, 'memoryGameSessions'), {
                difficulty, completed: false, seconds: sec, moves, endedAt: serverTimestamp(),
            }).catch(() => { });
        }
    };

    const handleBack = () => {
        if (difficulty && !done) saveIncomplete();
        clearTimeout(revealTimeout.current);
        clearInterval(timerRef.current);
        setDifficulty(null);
    };

    const handleClose = () => {
        if (difficulty && !done) saveIncomplete();
        clearTimeout(revealTimeout.current);
        clearInterval(timerRef.current);
        setDifficulty(null);
        setIsOpen(false);
    };

    const onCardClick = (idx) => {
        if (lock || matched.has(idx) || flipped.includes(idx)) return;
        const next = [...flipped, idx];
        setFlipped(next);
        if (next.length === 2) {
            setMoves((m) => m + 1);
            setLock(true);
            const [a, b] = next;
            if (cards[a].icon === cards[b].icon) {
                setMatched((prev) => new Set([...prev, a, b]));
                setFlipped([]);
                setLock(false);
            } else {
                setTimeout(() => { setFlipped([]); setLock(false); }, 1000);
            }
        }
    };


    const spec = difficulty ? LEVELS[difficulty] : null;
    const gridCols = spec ? `repeat(${spec.cols}, minmax(0, 1fr))` : 'none';
    const bestTime = difficulty && userData ? userData[`bestTime_${difficulty}`] : null;

    
    const matchedIcons = [];
    if (cards.length > 0) {
        const seen = new Set();
        matched.forEach(idx => {
            const icon = cards[idx].icon;
            if (!seen.has(icon)) {
                seen.add(icon);
                matchedIcons.push(icon);
            }
        });
    }

    return (
        <div
            onClick={(e) => { if (e.target === e.currentTarget && !difficulty) handleClose(); }}
            style={{
                ...S.backdrop,
                opacity: isOpen ? 1 : 0,
                pointerEvents: isOpen ? 'auto' : 'none',
                visibility: isOpen ? 'visible' : 'hidden',
            }}
        >
            <div key={openKey} className="animate-scale-in" style={{ ...S.panel, maxWidth: difficulty ? '540px' : '380px' }}>
                <div style={S.ambientOrb} />

              
                <div style={S.header}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        {difficulty && (
                            <button onClick={handleBack} style={S.iconBtn} title="Back">
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
                            </button>
                        )}
                        <div>
                            <h2 style={S.title}>Memory Game</h2>
                            {!difficulty && <p style={S.subtitle}>Select a stage to begin</p>}
                        </div>
                    </div>
                    {!difficulty && (
                        <button onClick={handleClose} style={S.iconBtn} title="Close">
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                        </button>
                    )}
                </div>

             
                {!difficulty && (() => {
                    const previewSpec = LEVELS[previewLevel];
                    const previewCols = `repeat(${previewSpec.cols}, minmax(0, 1fr))`;
                    const previewBest = userData?.[`bestTime_${previewLevel}`];

                    return (
                        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '8px' }}>

                           
                            <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800 }}>Best Time</span>
                                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary)', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                    {previewBest != null ? (
                                        <>🏆 {previewBest}s</>
                                    ) : (
                                        <span style={{ color: 'var(--on-surface-variant)', opacity: 0.5 }}>--</span>
                                    )}
                                </div>
                            </div>

                            
                            <div style={{ position: 'relative', margin: '4px 0', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>

                                <div style={{
                                    position: 'relative', zIndex: 1,
                                    display: 'grid',
                                    gridTemplateColumns: previewCols,
                                    gap: '8px',
                                    width: '100%',
                                    maxWidth: previewLevel === 'hard' ? '280px' : previewLevel === 'medium' ? '240px' : '200px',
                                    transition: 'max-width 0.3s ease',
                                }}>
                                    
                                    <div style={{
                                        position: 'absolute', inset: '-15px',
                                        zIndex: -1, opacity: 0.12, pointerEvents: 'none'
                                    }}>
                                        
                                        <div style={{ position: 'absolute', top: '8px', left: '15%', fontSize: '18px', transform: 'translateY(-100%) rotate(25deg)' }}>{NATURE[1]}</div>
                                        <div style={{ position: 'absolute', top: '12px', left: '78%', fontSize: '20px', transform: 'translateY(-100%) rotate(15deg)' }}>{NATURE[3]}</div>


                                   

                                        <div style={{ position: 'absolute', bottom: '4px', left: '48%', fontSize: '20px', transform: 'translateY(100%) rotate(10deg)', marginLeft: '-10px' }}>{NATURE[7]}</div>
                                        <div style={{ position: 'absolute', bottom: '-8px', left: '72%', fontSize: '24px', transform: 'translateY(100%) rotate(-20deg)' }}>{NATURE[8]}</div>

                                     
                                        <div style={{ position: 'absolute', top: '12%', left: '-12px', fontSize: '20px', transform: 'translateX(-100%) rotate(-10deg)' }}>{NATURE[0]}</div>
                                        <div style={{ position: 'absolute', top: '42%', left: '8px', fontSize: '24px', transform: 'translateX(-100%) rotate(20deg)' }}>{NATURE[2]}</div>

                                        
                                        <div style={{ position: 'absolute', top: '10%', right: '12px', fontSize: '24px', transform: 'translateX(100%) rotate(15deg)' }}>{NATURE[4]}</div>
                                        <div style={{ position: 'absolute', top: '65%', right: '4px', fontSize: '26px', transform: 'translateX(100%) rotate(10deg)' }}>{NATURE[7]}</div>
                                    </div>

                                    
                                    <div style={{
                                        position: 'absolute', inset: '-45px',
                                        zIndex: -1, opacity: 0.25, pointerEvents: 'none'
                                    }}>
                                     
                                        <div style={{ position: 'absolute', top: '-8px', left: '6%', fontSize: '28px', transform: 'translateY(-100%) rotate(5deg)', filter: 'blur(1px)' }}>{NATURE[8]}</div>
                                        <div style={{ position: 'absolute', top: '12px', left: '44%', fontSize: '22px', transform: 'translateY(-100%) rotate(-25deg)' }}>{NATURE[9]}</div>
                                        <div style={{ position: 'absolute', top: '-2px', left: '90%', fontSize: '25px', transform: 'translateY(-100%) rotate(30deg)', filter: 'blur(1px)' }}>{NATURE[0]}</div>

                                        <div style={{ position: 'absolute', bottom: '-1px', left: '12%', fontSize: '24px', transform: 'translateY(100%) rotate(-10deg)' }}>{NATURE[1]}</div>
                                        <div style={{ position: 'absolute', bottom: '4px', left: '88%', fontSize: '22px', transform: 'translateY(100%) rotate(-20deg)' }}>{NATURE[3]}</div>

                                        
                                        <div style={{ position: 'absolute', top: '78%', left: '8px', fontSize: '20px', transform: 'translateX(-100%) rotate(-15deg)' }}>{NATURE[5]}</div>

                                    
                                        <div style={{ position: 'absolute', top: '40%', right: '7px', fontSize: '22px', transform: 'translateX(100%) rotate(-30deg)' }}>{NATURE[6]}</div>

                                    </div>
                                    {Array.from({ length: previewSpec.cols * previewSpec.rows }).map((_, i) => (
                                        <div key={i} style={{
                                            aspectRatio: '1/1', borderRadius: '6px',
                                            background: 'var(--surface-container)',
                                            borderTop: '1px solid rgba(255,255,255,0.05)',
                                            borderBottom: '2px solid rgba(0,0,0,0.2)',
                                            borderLeft: '1px solid rgba(255,255,255,0.02)',
                                            borderRight: '1px solid rgba(0,0,0,0.1)',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        }} />
                                    ))}
                                </div>
                            </div>

                           
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', width: '100%', marginBottom: '4px' }}>
                                {Object.values(LEVELS).map(level => {
                                    const isSelected = previewLevel === level.id;

                                    return (
                                        <button
                                            key={level.id}
                                            onClick={() => setPreviewLevel(level.id)}
                                            style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                fontSize: '15px', fontFamily: 'Inter, sans-serif',
                                                padding: '4px 8px', transition: 'all 0.2s ease',
                                                color: isSelected ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                                                fontWeight: isSelected ? 800 : 500,
                                                opacity: isSelected ? 1 : 0.6,
                                            }}
                                        >
                                            {level.label}
                                        </button>
                                    )
                                })}
                            </div>

                        
                            <button
                                onClick={() => startGame(previewLevel)}
                                style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '50%',
                                    background: 'var(--primary-container)',
                                    color: 'var(--on-primary)',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    marginTop: '4px'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'; }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 34, marginLeft: '4px', fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                            </button>
                        </div>
                    );
                })()}

            
                {difficulty && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '10px', paddingBottom: '16px' }}>

                    
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 42, fontWeight: 800, fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                                {isRevealed ? '0' : elapsed}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--on-surface-variant)', opacity: 0.6, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                                Seconds
                            </div>
                        </div>

                 
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0 10px' }}>
                           
                            <div style={{ textAlign: 'left', flex: 1 }}>
                                <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', opacity: 0.7, marginBottom: '4px' }}>Stage</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--on-surface)' }}>{LEVELS[difficulty].label}</div>
                            </div>

                          
                            <div style={{ textAlign: 'center', flex: 2 }}>
                                <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', opacity: 0.7, marginBottom: '4px' }}>Items Cleared</div>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', minHeight: '20px', flexWrap: 'wrap' }}>
                                    {matchedIcons.length === 0 ? (
                                        <span style={{ fontSize: 12, color: 'var(--on-surface-variant)', opacity: 0.4 }}>None yet</span>
                                    ) : (
                                        matchedIcons.map((icon, i) => (
                                            <span key={i} style={{ fontSize: 14, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>{icon}</span>
                                        ))
                                    )}
                                </div>
                            </div>

                            
                            <div style={{ textAlign: 'right', flex: 1 }}>
                                <div style={{ fontSize: 12, color: 'var(--on-surface-variant)', opacity: 0.7, marginBottom: '4px' }}>Best Time</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--primary)' }}>emoji_events</span>
                                    {bestTime != null ? `${bestTime}s` : '--'}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '10px', width: '100%', maxWidth: '420px', perspective: '1000px' }}>
                                {cards.map((c, idx) => {
                                    const show = isRevealed || flipped.includes(idx) || matched.has(idx);
                                    const isMatched = matched.has(idx);
                                    const isFlippedNow = flipped.includes(idx);

                                    return (
                                        <button
                                            key={c.key}
                                            onClick={() => onCardClick(idx)}
                                            style={{
                                                aspectRatio: '1/1',
                                                borderRadius: '14px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '32px',
                                                cursor: (lock || matched.has(idx)) ? 'default' : 'pointer',
                                                transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                                transformStyle: 'preserve-3d',
                                                transform: show ? 'rotateY(0deg) scale(1)' : 'rotateY(180deg) scale(0.95)',

                                              
                                                background: show ? 'var(--surface-container-highest)' : 'var(--surface-container-low)',
                                                borderTop: `1px solid ${show ? 'rgba(255,255,255,0.1)' : 'var(--glass-border)'}`,
                                                borderLeft: `1px solid ${show ? 'rgba(255,255,255,0.05)' : 'var(--glass-border)'}`,
                                                borderRight: `1px solid ${show ? 'rgba(0,0,0,0.2)' : 'var(--glass-border)'}`,
                                                borderBottom: `4px solid ${show ? (isMatched ? 'var(--primary-container)' : 'rgba(0,0,0,0.3)') : 'var(--glass-border)'}`,

                                                boxShadow: isFlippedNow
                                                    ? '0 0 0 2px var(--primary), 0 8px 20px rgba(0,0,0,0.3)'
                                                    : (show ? '0 6px 12px rgba(0,0,0,0.2)' : '0 4px 8px rgba(0,0,0,0.1)'),

                                                opacity: isMatched ? 0.6 : 1, 
                                            }}
                                        >
                                    
                                            <div style={{
                                                position: 'absolute', inset: 0,
                                                backfaceVisibility: 'hidden',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: 'var(--surface-container-low)',
                                                borderRadius: '12px',
                                                transform: 'rotateY(180deg)',
                                            }}>
                                                <div style={{ width: '50%', height: '50%', borderRadius: '50%', background: 'var(--primary-container)', opacity: 0.1, filter: 'blur(10px)', position: 'absolute' }} />
                                            </div>

                                        
                                            <div style={{
                                                position: 'absolute', inset: 0,
                                                backfaceVisibility: 'hidden',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                borderRadius: '12px',
                                            }}>
                                                <span style={{
                                                    transform: show ? 'scale(1)' : 'scale(0.5)',
                                                    transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s',
                                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                                                }}>
                                                    {c.icon}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

            
                        {done && (
                            <div className="animate-fade-in" style={{
                                position: 'absolute', inset: 0, zIndex: 100,
                                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '28px'
                            }}>
                                <div className="animate-scale-in" style={{
                                    background: 'var(--surface-container-low)', border: '1px solid var(--glass-border)',
                                    borderRadius: '24px', padding: '32px 24px', textAlign: 'center',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)', width: '85%', maxWidth: '300px'
                                }}>
                                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
                                    <h3 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 800, color: 'var(--on-surface)' }}>Stage Complete!</h3>
                                    <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'var(--on-surface-variant)' }}>
                                        You finished in <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{elapsed}s</span>
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <button onClick={() => startGame(difficulty)} style={{ ...S.startBtnSmall, padding: '12px', background: 'var(--primary-container)', color: 'var(--on-primary)', borderColor: 'var(--primary-container)', width: '100%', fontSize: '13px' }}>
                                            Play Again
                                        </button>
                                        <button onClick={handleBack} style={{ ...S.startBtnSmall, padding: '12px', width: '100%', background: 'var(--surface-container)', color: 'var(--on-surface)', borderColor: 'var(--glass-border)', fontSize: '13px' }}>
                                            Go Back
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

const S = {
    backdrop: { position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', transition: 'opacity 0.2s ease, visibility 0.2s ease' },
    panel: { position: 'relative', width: '100%', background: 'var(--surface-container-low)', border: '1px solid var(--glass-border)', borderRadius: '28px', padding: '24px', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'max-width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)' },
    ambientOrb: { position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'var(--glow-primary)', filter: 'blur(80px)', opacity: 0.1, pointerEvents: 'none' },
    header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', position: 'relative', zIndex: 1 },
    title: { margin: 0, fontSize: '19px', fontWeight: 700, fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' },
    subtitle: { margin: '4px 0 0', fontSize: '12px', fontFamily: 'Inter, sans-serif', color: 'var(--on-surface-variant)', opacity: 0.55 },
    iconBtn: { flexShrink: 0, width: 32, height: 32, borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--on-surface-variant)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s ease', zIndex: 2 },
    card: { padding: '14px 16px', borderRadius: '20px', border: '1px solid var(--glass-border)', background: 'var(--surface-container)', display: 'flex', flexDirection: 'column', gap: '12px' },
    startBtnSmall: { padding: '8px 18px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', border: '1px solid var(--primary-container)', color: 'var(--primary-container)', background: 'transparent', transition: 'all 0.3s ease' },
};
