import React, { useState, useEffect, useRef } from 'react';

const CYCLE = [
    { phase: 'Inhale', seconds: 4, color: 'var(--primary-container)'  },
    { phase: 'Hold',   seconds: 4, color: 'var(--primary-fixed)'      },
    { phase: 'Exhale', seconds: 4, color: 'var(--on-surface-variant)' },
];
const TOTAL_CYCLE = CYCLE.reduce((s, p) => s + p.seconds, 0); // 12 s

function useBreathe(active) {
    const [tick, setTick] = useState(0);
    const timerRef        = useRef(null);

    useEffect(() => {
        if (!active) { setTick(0); return; }
        setTick(0);
        timerRef.current = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(timerRef.current);
    }, [active]);

    const pos = tick % TOTAL_CYCLE;
    let acc = 0, phaseIdx = 0;
    for (let i = 0; i < CYCLE.length; i++) {
        if (pos < acc + CYCLE[i].seconds) { phaseIdx = i; break; }
        acc += CYCLE[i].seconds;
    }
    const { phase, color } = CYCLE[phaseIdx];
    const remaining = CYCLE[phaseIdx].seconds - (pos - acc);
    return { phase, remaining, color, phaseIdx };
}

function ringScale(phase) {
    if (phase === 'Inhale') return 'scale(1.16)';
    if (phase === 'Exhale') return 'scale(0.87)';
    return 'scale(1)';
}
function ringDuration(phase) {
    return phase === 'Hold' ? '600ms' : '3800ms';
}

export default function PanicOverlay({ isOpen, onClose, emergencyContacts = [] }) {
    const { phase, remaining, color, phaseIdx } = useBreathe(isOpen);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const t = setTimeout(() => setVisible(true), 16);
            return () => clearTimeout(t);
        }
        setVisible(false);
    }, [isOpen]);

    if (!isOpen) return null;

    const validContacts = (emergencyContacts || []).filter(c => c?.name && c?.phone);
    const HOTLINES = [
        { label: 'iCall',      number: '9152987821',  desc: 'Mental Health' },
        { label: 'Vandrevala', number: '18602662345', desc: '24/7 Crisis'   },
    ];

    return (
        <div
            className="fixed inset-0 z-[9999] flex flex-col overflow-hidden"
            style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.5s ease' }}
        >
           
            <div
                className="absolute inset-0"
                style={{ background: 'var(--background)', opacity: 0.97 }}
            />

            
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div
                    className="absolute top-[-20%] left-[-10%] w-[55vw] h-[55vw] rounded-full animate-parallax"
                    style={{ background: 'radial-gradient(circle, var(--glow-secondary) 0%, transparent 65%)', filter: 'blur(80px)' }}
                />
                <div
                    className="absolute bottom-[-20%] right-[-10%] w-[45vw] h-[45vw] rounded-full animate-parallax"
                    style={{ background: 'radial-gradient(circle, var(--glow-primary) 0%, transparent 65%)', filter: 'blur(90px)', animationDelay: '-7s' }}
                />
            </div>



           
            <div className="relative z-10 flex-1 flex flex-col items-center justify-between px-6 py-8 max-w-2xl mx-auto w-full">

               
                <div className="flex flex-col items-center text-center gap-2 animate-float-up">
                    <div
                        className="flex items-center justify-center w-11 h-11 rounded-full mb-1"
                        style={{
                            background: 'var(--glass-bg)',
                            border: '1px solid var(--glass-border-hover)',
                            boxShadow: '0 0 24px var(--glow-primary)',
                            backdropFilter: 'blur(20px)',
                        }}
                    >
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '22px', color: 'var(--primary-container)', fontVariationSettings: "'FILL' 1, 'wght' 300" }}
                        >
                            shield
                        </span>
                    </div>
                    <h1
                        className="m-0 text-glow"
                        style={{
                            fontFamily: 'Manrope, sans-serif',
                            fontSize: 'clamp(1.5rem, 4vw, 2.4rem)',
                            fontWeight: 200,
                            fontStyle: 'italic',
                            letterSpacing: '-0.02em',
                            color: 'var(--primary)',
                            lineHeight: 1.15,
                        }}
                    >
                        You are Safe and Secured.
                    </h1>
                    <p
                        className="m-0"
                        style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '0.875rem',
                            fontStyle: 'italic',
                            color: 'var(--on-surface-variant)',
                            fontWeight: 300,
                        }}
                    >
                        Breathe with ECHO until the calm returns.
                    </p>
                </div>

              
                <div
                    className="relative flex items-center justify-center animate-float-up"
                    style={{ width: '200px', height: '200px', animationDelay: '0.08s' }}
                >
                   
                    <div
                        className="absolute inset-0 rounded-full"
                        style={{
                            border: '1px solid var(--glass-border)',
                            boxShadow: `0 0 50px ${color}44, 0 0 100px ${color}22`,
                            transform: ringScale(phase),
                            transition: `transform ${ringDuration(phase)} cubic-bezier(0.4,0,0.2,1), box-shadow 1.5s ease`,
                        }}
                    />
                 
                    <div
                        className="absolute rounded-full"
                        style={{
                            inset: '14px',
                            border: `2px solid ${color}`,
                            boxShadow: `0 0 24px ${color}88, inset 0 0 24px ${color}22`,
                            transform: ringScale(phase),
                            transition: `transform ${ringDuration(phase)} cubic-bezier(0.4,0,0.2,1), border-color 1.5s ease, box-shadow 1.5s ease`,
                        }}
                    />
               
                    <div
                        className="absolute rounded-full"
                        style={{
                            inset: '38px',
                            background: `radial-gradient(circle, ${color}30 0%, transparent 70%)`,
                            transform: ringScale(phase),
                            transition: `transform ${ringDuration(phase)} cubic-bezier(0.4,0,0.2,1), background 1.5s ease`,
                        }}
                    />
                 
                    <div className="absolute flex flex-col items-center gap-0" style={{ userSelect: 'none' }}>
                        <span
                            style={{
                                fontFamily: 'Inter, sans-serif',
                                fontSize: '9px',
                                fontWeight: 900,
                                letterSpacing: '0.42em',
                                textTransform: 'uppercase',
                                color,
                                transition: 'color 0.8s ease',
                                opacity: 0.9,
                            }}
                        >
                            {phase}
                        </span>
                        <span
                            className="text-glow leading-none"
                            style={{
                                fontFamily: 'Manrope, sans-serif',
                                fontSize: '4.5rem',
                                fontWeight: 100,
                                color,
                                transition: 'color 0.8s ease',
                                lineHeight: 1,
                            }}
                        >
                            {remaining}
                        </span>
                    </div>

                 
                    <div className="absolute flex gap-1.5" style={{ bottom: '10px' }}>
                        {CYCLE.map((_, i) => (
                            <div
                                key={i}
                                className="rounded-full transition-all duration-500"
                                style={{
                                    width: i === phaseIdx ? '16px' : '5px',
                                    height: '5px',
                                    background: i === phaseIdx ? 'var(--primary-container)' : 'var(--glass-border-hover)',
                                    opacity: i === phaseIdx ? 1 : 0.4,
                                }}
                            />
                        ))}
                    </div>
                </div>

             
                <div className="w-full flex flex-col gap-3 animate-float-up" style={{ animationDelay: '0.16s' }}>
                   
                    {validContacts.length > 0 && (
                        <div>
                            <p className="m-0 mb-2 uppercase" style={{ fontFamily: 'Inter, sans-serif', fontSize: '8px', fontWeight: 900, letterSpacing: '0.35em', color: 'var(--primary-container)', opacity: 0.6 }}>
                                Your Contacts
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                {validContacts.slice(0, 2).map(c => (
                                    <a
                                        key={c.phone}
                                        href={`tel:${c.phone}`}
                                        className="glass-card flex items-center gap-3 p-3 no-underline"
                                        style={{ textDecoration: 'none' }}
                                    >
                                        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full" style={{ background: 'var(--glow-primary)', border: '1px solid var(--glass-border-hover)' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--primary-container)', fontVariationSettings: "'FILL' 1" }}>person</span>
                                        </div>
                                        <div className="flex flex-col items-start gap-0 min-w-0">
                                            <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, color: 'var(--primary)', fontSize: '0.82rem' }}>{c.name}</span>
                                            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: 'var(--on-surface-variant)' }}>{c.phone}</span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                   
                    <div>
                        <p className="m-0 mb-2 uppercase" style={{ fontFamily: 'Inter, sans-serif', fontSize: '8px', fontWeight: 900, letterSpacing: '0.35em', color: 'var(--primary-container)', opacity: 0.6 }}>
                            Crisis Support Lines
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {HOTLINES.map(({ label, number, desc }) => (
                                <a
                                    key={label}
                                    href={`tel:${number}`}
                                    className="glass-card flex items-center gap-3 p-3 no-underline group"
                                    style={{ textDecoration: 'none' }}
                                >
                                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full" style={{ background: 'var(--glow-secondary)', border: '1px solid var(--glass-border-hover)' }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '15px', color: 'var(--primary-container)', fontVariationSettings: "'FILL' 1" }}>support_agent</span>
                                    </div>
                                    <div className="flex flex-col items-start gap-0 min-w-0">
                                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '8px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--primary-container)', opacity: 0.7 }}>{desc}</span>
                                        <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, color: 'var(--primary)', fontSize: '0.82rem' }}>{label} · {number}</span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

               
                <button
                    onClick={onClose}
                    className="btn-primary-glow rounded-full animate-float-up"
                    style={{
                        animationDelay: '0.24s',
                        padding: '13px 44px',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '10px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.45em',
                        color: 'var(--on-primary)',
                    }}
                >
                    Return to ECHO AI
                </button>

            </div>
        </div>
    );
}
