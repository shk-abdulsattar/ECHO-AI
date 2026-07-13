import React, { useEffect, useState, useCallback } from 'react';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';


const MOODS = [
    { id: 'Angry', emoji: '😠', value: 0, label: 'Angry', color: '#FF6B6B' },
    { id: 'Stressed', emoji: '😰', value: 1, label: 'Stressed', color: '#FFB347' },
    { id: 'Neutral', emoji: '😐', value: 3, label: 'Neutral', color: '#90BCBC' },
    { id: 'Sad', emoji: '😢', value: 2, label: 'Sad', color: '#6BAAFF' },
    { id: 'Happy', emoji: '😊', value: 5, label: 'Happy', color: '#00E5CC' },
];


const SLIDER_ORDER = ['Angry', 'Stressed', 'Neutral', 'Sad', 'Happy'];

export default function MoodTrackerOverlay() {
    const { currentUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [sliderIdx, setSliderIdx] = useState(2); 
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [lastLoggedToday, setLastLoggedToday] = useState(null);

    const localDateStr = useCallback((d = new Date()) => d.toLocaleDateString('en-CA'), []);

   
    useEffect(() => {
        if (!currentUser) return;
        const q = query(collection(db, 'users', currentUser.uid, 'moodLogs'), orderBy('timestamp', 'desc'), limit(1));
        return onSnapshot(q, (snap) => {
            if (snap.empty) {
                setLastLoggedToday(null);
                return;
            }
            const data = snap.docs[0].data();
            if (!data.timestamp?.toDate) return;

            const todayStr = localDateStr();
            const logStr = localDateStr(data.timestamp.toDate());

            if (todayStr === logStr) {
                setLastLoggedToday(data.mood);
                
                const idx = SLIDER_ORDER.indexOf(data.mood);
                if (idx !== -1 && !isOpen) {
                    setSliderIdx(idx);
                }
            } else {
                setLastLoggedToday(null);
            }
        });
    }, [currentUser, localDateStr, isOpen]);

    
    useEffect(() => {
        const open = () => {
            setSaved(false);
            
            if (!lastLoggedToday) setSliderIdx(2);
            setIsOpen(true);
        };
        window.addEventListener('echo-open-mood', open);
        return () => window.removeEventListener('echo-open-mood', open);
    }, [lastLoggedToday]);

    
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    const close = useCallback(() => {
        setIsOpen(false);
        setSaved(false);
    }, []);

    const currentMood = MOODS.find(m => m.id === SLIDER_ORDER[sliderIdx]);

    const handleSave = async () => {
        if (!currentUser || saving || saved) return;
        setSaving(true);
        try {
            await addDoc(collection(db, 'users', currentUser.uid, 'moodLogs'), {
                mood: currentMood.id,
                timestamp: serverTimestamp(),
            });
            setSaved(true);
         
            setTimeout(() => close(), 1200);
        } catch (err) {
            console.error('Mood log error:', err);
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
       
        <div
            onClick={(e) => { if (e.target === e.currentTarget) close(); }}
            style={styles.backdrop}
            role="dialog"
            aria-modal="true"
            aria-label="Mood tracker"
        >
          
            <div className="animate-scale-in" style={styles.panel}>

                <div style={{
                    position: 'absolute', top: '-40px', right: '-40px',
                    width: '160px', height: '160px', borderRadius: '50%',
                    background: currentMood.color,
                    filter: 'blur(70px)',
                    opacity: 0.12,
                    pointerEvents: 'none',
                    transition: 'background 0.5s ease',
                }} />

             
                <div style={styles.header}>
                    <div>
                        <h2 style={styles.title}>How are you feeling?</h2>
                        <p style={styles.subtitle}>Move the slider to track your current mood</p>
                    </div>
                    <button
                        onClick={close}
                        style={styles.closeBtn}
                        aria-label="Close mood tracker"
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                    </button>
                </div>

                
                <div style={styles.bigEmojiWrap}>
                    <div
                        style={{
                            ...styles.bigEmojiRing,
                            boxShadow: `0 0 0 1px ${currentMood.color}22, 0 0 40px ${currentMood.color}30`,
                            borderColor: `${currentMood.color}33`,
                        }}
                    >
                        <span
                            key={currentMood.id}
                            className="animate-scale-in"
                            style={{ fontSize: '52px', lineHeight: 1, display: 'block', transition: 'filter 0.3s ease', filter: `drop-shadow(0 0 16px ${currentMood.color}80)` }}
                            role="img"
                            aria-label={currentMood.label}
                        >
                            {currentMood.emoji}
                        </span>
                    </div>
                    <p style={{ ...styles.moodLabel, color: currentMood.color }}>
                        {currentMood.label}
                    </p>
                </div>

              
                <div style={styles.emojiRow}>
                    {SLIDER_ORDER.map((id, idx) => {
                        const m = MOODS.find(x => x.id === id);
                        const isActive = idx === sliderIdx;
                        return (
                            <button
                                key={id}
                                onClick={() => setSliderIdx(idx)}
                                title={m.label}
                                style={{
                                    ...styles.emojiBtn,
                                    transform: isActive ? 'scale(1.25)' : 'scale(1)',
                                    opacity: isActive ? 1 : 0.45,
                                    filter: isActive ? `drop-shadow(0 0 8px ${m.color}90)` : 'none',
                                }}
                            >
                                <span role="img" aria-label={m.label} style={{ fontSize: '26px' }}>
                                    {m.emoji}
                                </span>
                            </button>
                        );
                    })}
                </div>

               
                <div style={styles.sliderWrap}>
                    <input
                        type="range"
                        min={0}
                        max={4}
                        step={1}
                        value={sliderIdx}
                        onChange={(e) => setSliderIdx(Number(e.target.value))}
                        className="mood-slider"
                        style={{
                            ...styles.slider,
                            background: `linear-gradient(to right, ${currentMood.color} ${(sliderIdx / 4) * 100}%, var(--surface-container-high) ${(sliderIdx / 4) * 100}%)`,
                            '--thumb-color': currentMood.color,
                        }}
                        aria-label="Mood slider"
                        aria-valuetext={currentMood.label}
                    />
                </div>

               
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        ...styles.saveBtn,
                        background: saved
                            ? 'var(--surface-container)'
                            : `linear-gradient(135deg, ${currentMood.color}, ${currentMood.color}BB)`,
                        boxShadow: saved ? 'none' : `0 4px 24px ${currentMood.color}55`,
                        color: saved ? currentMood.color : 'var(--on-primary)',
                        cursor: saving ? 'wait' : 'pointer',
                        transition: 'all 0.4s var(--ease-cinematic)',
                    }}
                >
                    {saved ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            Mood Logged ✓
                        </span>
                    ) : saving ? (
                        'Saving…'
                    ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}>save</span>
                            Save Mood
                        </span>
                    )}
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'center' }}>
                    {lastLoggedToday && (
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: 'var(--primary-container)', opacity: 0.85 }}>
                            ✓ You already logged {lastLoggedToday} today
                        </p>
                    )}
                    <p style={styles.hint}>
                        Your mood is read by ECHO in every chat session
                    </p>
                </div>
            </div>
        </div>
    );
}


const styles = {
    backdrop: {
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
    },
    panel: {
        position: 'relative',
        width: '100%',
        maxWidth: '380px',
        background: 'var(--surface-container-low)',
        border: '1px solid var(--glass-border)',
        borderRadius: '28px',
        padding: '28px 28px 24px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px var(--glass-border)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    header: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px',
    },
    eyebrow: {
        margin: 0,
        fontSize: '9px',
        fontWeight: 900,
        textTransform: 'uppercase',
        letterSpacing: '0.28em',
        fontFamily: 'Inter, sans-serif',
        color: 'var(--primary-container)',
        opacity: 0.65,
        marginBottom: '6px',
    },
    title: {
        margin: 0,
        fontSize: '18px',
        fontWeight: 700,
        fontFamily: 'Manrope, sans-serif',
        color: 'var(--on-surface)',
        lineHeight: 1.25,
    },
    subtitle: {
        margin: '4px 0 0',
        fontSize: '12px',
        fontFamily: 'Inter, sans-serif',
        color: 'var(--on-surface-variant)',
        opacity: 0.55,
    },
    closeBtn: {
        flexShrink: 0,
        width: '32px',
        height: '32px',
        borderRadius: '10px',
        border: '1px solid var(--glass-border)',
        background: 'transparent',
        color: 'var(--on-surface-variant)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s ease',
        marginTop: '2px',
    },
    bigEmojiWrap: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
    },
    bigEmojiRing: {
        width: '96px',
        height: '96px',
        borderRadius: '50%',
        border: '1.5px solid',
        background: 'var(--surface-container)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'box-shadow 0.4s ease, border-color 0.4s ease',
    },
    moodLabel: {
        margin: 0,
        fontSize: '13px',
        fontWeight: 700,
        fontFamily: 'Inter, sans-serif',
        letterSpacing: '0.04em',
        transition: 'color 0.4s ease',
    },
    emojiRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 4px',
    },
    emojiBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '10px',
        transition: 'transform 0.25s var(--ease-spring), opacity 0.25s ease, filter 0.25s ease',
        lineHeight: 1,
    },
    sliderWrap: {
        padding: '0 2px',
    },
    slider: {
        width: '100%',
        appearance: 'none',
        WebkitAppearance: 'none',
        height: '4px',
        borderRadius: '99px',
        background: 'var(--surface-container-high)',
        outline: 'none',
        cursor: 'pointer',
    },
    saveBtn: {
        width: '100%',
        padding: '14px',
        borderRadius: '14px',
        border: 'none',
        fontSize: '13.5px',
        fontWeight: 700,
        fontFamily: 'Inter, sans-serif',
        letterSpacing: '0.02em',
    },
    hint: {
        margin: 0,
        fontSize: '10.5px',
        fontFamily: 'Inter, sans-serif',
        color: 'var(--on-surface-variant)',
        opacity: 0.4,
        textAlign: 'center',
    },
};
