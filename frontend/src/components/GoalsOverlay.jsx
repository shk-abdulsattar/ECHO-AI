import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    doc, getDoc, onSnapshot, updateDoc, runTransaction,
    collection, query, orderBy, limit,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';

const todayStr = () => new Date().toLocaleDateString('en-CA');


function getLast7Days() {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toLocaleDateString('en-CA');
    });
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


const FEATURE_META = {
    chat: { icon: 'forum', label: 'Open Chat', route: '/chat', event: null },
    mood: { icon: 'mood', label: 'Log Mood', route: null, event: 'echo-open-mood' },
    meditation: { icon: 'self_improvement', label: 'Meditate', route: null, event: 'echo-open-meditate' },
    breathing: { icon: 'air', label: 'Breathe', route: null, event: 'echo-open-breathe' },
    memory: { icon: 'sports_esports', label: 'Play Game', route: null, event: 'echo-open-memory-game' },
};

export default function GoalsOverlay() {
    const navigate = useNavigate();
    const { currentUser, userData, updateProfile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [tab, setTab] = useState('pending');
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [celebrate, setCelebrate] = useState(null);
    const [streakDays, setStreakDays] = useState({});
    const [hasMoodToday, setHasMoodToday] = useState(false);
    const [hasBreathedToday, setHasBreathedToday] = useState(false);
    const [hasMeditatedToday, setHasMeditatedToday] = useState(false);
    const [todayAllCompleted, setTodayAllCompleted] = useState(false);
    const goalsRef = useRef(null);
    const baselineRef = useRef(null);
    const panelRef = useRef(null);
    const streakAppliedRef = useRef(false); 
    const date = todayStr();

   
    useEffect(() => {
        const open = () => { setIsOpen(true); setTab('pending'); };
        window.addEventListener('echo-open-goals', open);
        return () => window.removeEventListener('echo-open-goals', open);
    }, []);

    
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isOpen]);

    
    useEffect(() => {
        if (!currentUser) return;
        const ref = doc(db, 'users', currentUser.uid, 'dailyGoals', date);
        return onSnapshot(ref, (snap) => {
            const data = snap.exists() ? snap.data() : {};
            setTodayAllCompleted(!!data.allCompleted);
            if (data.streakApplied) streakAppliedRef.current = true;
        });
    }, [currentUser, date]);

    
    useEffect(() => {
        if (!currentUser || !isOpen) return;
        const ref = doc(db, 'users', currentUser.uid, 'dailyGoals', date);
        goalsRef.current = ref;
        setLoading(true);
        return onSnapshot(ref, (snap) => {
            const data = snap.exists() ? snap.data() : {};
            setGoals(data.goals || []);
            setLoading(false);
        });
    }, [currentUser, date, isOpen]);

    useEffect(() => {
        if (userData && !baselineRef.current) {
            baselineRef.current = {
                meditationsDone: userData.meditationsDone ?? 0,
                msgCount: userData.msgCount ?? 0,
            };
        }
    }, [userData]);

    
    useEffect(() => {
        if (!currentUser) return;
        const q = query(
            collection(db, 'users', currentUser.uid, 'moodLogs'),
            orderBy('timestamp', 'desc'),
            limit(1)
        );
        return onSnapshot(q, (snap) => {
            if (snap.empty) { setHasMoodToday(false); return; }
            const ts = snap.docs[0].data().timestamp?.toDate?.();
            if (!ts) { setHasMoodToday(false); return; }
            setHasMoodToday(ts.toLocaleDateString('en-CA') === date);
        });
    }, [currentUser, date]);

    useEffect(() => {
        if (!currentUser) return;
        const q = query(
            collection(db, 'users', currentUser.uid, 'breathingSessions'),
            orderBy('endedAt', 'desc'), limit(1)
        );
        return onSnapshot(q, (snap) => {
            if (snap.empty) { setHasBreathedToday(false); return; }
            const ts = snap.docs[0].data().endedAt?.toDate?.();
            setHasBreathedToday(ts ? ts.toLocaleDateString('en-CA') === date : false);
        });
    }, [currentUser, date]);

    useEffect(() => {
        if (!currentUser) return;
        const q = query(
            collection(db, 'users', currentUser.uid, 'meditationSessions'),
            orderBy('endedAt', 'desc'), limit(1)
        );
        return onSnapshot(q, (snap) => {
            if (snap.empty) { setHasMeditatedToday(false); return; }
            const d = snap.docs[0].data();
            const ts = d.endedAt?.toDate?.();
            
            setHasMeditatedToday(ts ? ts.toLocaleDateString('en-CA') === date && (d.secondsSpent || 0) >= 3 : false);
        });
    }, [currentUser, date]);

    useEffect(() => {
        if (!goalsRef.current || !goals.length || !userData || !baselineRef.current) return;
        const baseline = baselineRef.current;
        const didChat = (userData.msgCount ?? 0) > baseline.msgCount;
        
        const didBreathe = hasBreathedToday;
        const didMeditate = hasMeditatedToday;
        const didMemory = sessionStorage.getItem('echo_memory_today') === date;
        const didMood = hasMoodToday;

        const shouldComplete = (type) => {
            if (type === 'chat') return didChat;
            if (type === 'meditation') return didMeditate;
            if (type === 'breathing') return didBreathe;
            if (type === 'memory') return didMemory;
            if (type === 'mood') return didMood;
            return false;
        };

       
        const shouldReset = (type) => {
            if (type === 'breathing') return !hasBreathedToday;
            if (type === 'meditation') return !hasMeditatedToday;
            if (type === 'mood') return !hasMoodToday;
            return false;
        };

        const updated = goals.map(g => {
            if (!g.completed && shouldComplete(g.type)) return { ...g, completed: true };
            if (g.completed && shouldReset(g.type)) return { ...g, completed: false };
            return g;
        });
        const changed = updated.some((g, i) => g.completed !== goals[i].completed);
        if (!changed) return;

        const allCompleted = updated.every(g => g.completed);
        updateDoc(goalsRef.current, { goals: updated, allCompleted }).catch(() => { });
    }, [userData, goals, date, hasMoodToday, hasBreathedToday, hasMeditatedToday]);

   
    useEffect(() => {
        if (!todayAllCompleted || !currentUser || streakAppliedRef.current) return;
        streakAppliedRef.current = true; 

        const dailyRef = doc(db, 'users', currentUser.uid, 'dailyGoals', date);
        const userRef = doc(db, 'users', currentUser.uid);

        
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayStr = yesterdayDate.toLocaleDateString('en-CA');

        runTransaction(db, async (t) => {
            const [dailySnap, userSnap] = await Promise.all([t.get(dailyRef), t.get(userRef)]);
            if (!dailySnap.exists() || !userSnap.exists()) return;
         
            if (dailySnap.data().streakApplied) return;

            const data = userSnap.data();
            const completedGoals = (dailySnap.data().goals || []).filter(g => g.completed).length;

        
            const lastStreakDate = data.lastStreakDate || null;
            const isConsecutive = lastStreakDate === yesterdayStr;
            const newStreak = isConsecutive ? (data.streak || 0) + 1 : 1;

            t.update(dailyRef, { streakApplied: true });
            t.update(userRef, {
                goalsAchieved: (data.goalsAchieved || 0) + completedGoals,
                streak: newStreak,
                bestStreak: Math.max(newStreak, data.bestStreak || 0),
                lastStreakDate: date,
            });
        }).catch((e) => {
            console.error('Streak transaction failed:', e);
            streakAppliedRef.current = false;
        });
    }, [todayAllCompleted, currentUser, date]);

    
    useEffect(() => {
        if (!currentUser || !isOpen) return;
        const days = getLast7Days();
        const pastDays = days.slice(0, 6); 

      
        async function fetchPastDays() {
            const results = {};
            await Promise.all(pastDays.map(async (d) => {
                const ref = doc(db, 'users', currentUser.uid, 'dailyGoals', d);
                const snap = await getDoc(ref);
                results[d] = { allCompleted: snap.exists() ? !!snap.data().allCompleted : false };
            }));
            setStreakDays(prev => ({ ...prev, ...results }));
        }
        fetchPastDays();

        const todayRef = doc(db, 'users', currentUser.uid, 'dailyGoals', date);
        const unsub = onSnapshot(todayRef, (snap) => {
            setStreakDays(prev => ({
                ...prev,
                [date]: { allCompleted: snap.exists() ? !!snap.data().allCompleted : false },
            }));
        });
        return unsub;
    }, [currentUser, isOpen, date]);

  
    const generateGoals = async () => {
        setGenerating(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/goals/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ date }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed');
            setGoals(data.goals || []);
        } catch (e) {
            console.error(e);
        } finally {
            setGenerating(false);
        }
    };

    const resetGoals = async () => {
        if (!goalsRef.current || !goals.length) return;
      
        const resetGoalsList = goals.map(g => ({ ...g, completed: false }));
        await updateDoc(goalsRef.current, {
            goals: resetGoalsList,
            allCompleted: false,
            streakApplied: false,
        }).catch(console.error);
        streakAppliedRef.current = false;
    
        sessionStorage.removeItem('echo_breathed_today');
        sessionStorage.removeItem('echo_meditated_today');
        sessionStorage.removeItem('echo_memory_today');
    };




    const completedGoals = goals.filter((g) => g.completed);
    const pendingGoals = goals.filter((g) => !g.completed);

    const visibleGoals = tab === 'completed' ? completedGoals : pendingGoals;

    const currentStreak = userData?.streak ?? 0;
    const days7 = getLast7Days();

    if (!isOpen) return null;

    return (
      
        <div
            onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
            style={S.backdrop}
            role="dialog"
            aria-modal="true"
            aria-label="Goals overlay"
        >
           
            <div ref={panelRef} className="animate-scale-in" style={S.panel}>

                
                <div style={S.ambientOrb} />

                <div style={S.header}>
                    <div>
                        <h2 style={S.title}>Goals</h2>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        style={S.closeBtn}
                        aria-label="Close goals overlay"
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                    </button>
                </div>

               
                <div style={S.streakSection}>
                   
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--primary-container)', fontVariationSettings: "'FILL' 1" }}>
                                local_fire_department
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-container)', letterSpacing: '0.04em' }}>
                                {currentStreak}-day streak
                            </span>
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--on-surface-variant)', opacity: 0.4 }}>last 7 days</span>
                    </div>

                  
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}>
                        {days7.map((d) => {
                            const isToday = d === date;
                            const isCompleted = streakDays[d]?.allCompleted === true;
                            const dayLabel = DAY_ABBR[new Date(d + 'T00:00:00').getDay()].slice(0, 3);
                            const dayNum = Number(d.split('-')[2]);

                            
                            const pillBg = isCompleted
                                ? 'var(--primary-container)'
                                : isToday
                                    ? 'var(--on-surface)'
                                    : 'transparent';

                           
                            const textColor = isCompleted
                                ? 'var(--on-primary)'
                                : isToday
                                    ? 'var(--surface-container-low)'  
                                    : 'var(--on-surface-variant)';

                            return (
                                <div key={d} style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    gap: '2px',
                                    padding: '8px 10px',
                                    borderRadius: '14px',
                                    background: pillBg,
                                    opacity: (!isToday && !isCompleted) ? 0.45 : 1,
                                    boxShadow: isCompleted ? '0 0 14px var(--glow-primary)' : 'none',
                                    transition: 'all 0.5s ease',
                                    minWidth: '38px',
                                }}>
                                    <span style={{
                                        fontSize: '10px',
                                        fontWeight: 500,
                                        color: textColor,
                                        fontFamily: 'Inter, sans-serif',
                                        letterSpacing: '0.02em',
                                    }}>{dayLabel}</span>
                                    <span style={{
                                        fontSize: '15px',
                                        fontWeight: 700,
                                        color: textColor,
                                        fontFamily: 'Inter, sans-serif',
                                        lineHeight: 1,
                                    }}>
                                        {isCompleted
                                            ? <span className="material-symbols-outlined" style={{ fontSize: '15px', fontVariationSettings: "'FILL' 1", verticalAlign: 'middle' }}>check</span>
                                            : dayNum
                                        }
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

             
                <div style={S.tabBar}>
                    {[
                        { key: 'pending', icon: 'schedule', label: `Pending (${pendingGoals.length})` },
                        { key: 'completed', icon: 'check_circle', label: `Done (${completedGoals.length})` },
                    ].map(({ key, icon, label }) => {
                        const active = tab === key;
                        return (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                style={{
                                    ...S.tabBtn,
                                    background: active ? 'var(--primary-container)' : 'transparent',
                                    color: active ? 'var(--on-primary)' : 'var(--on-surface-variant)',
                                    boxShadow: active ? '0 4px 16px var(--glow-primary)' : 'none',
                                    fontWeight: active ? 800 : 500,
                                    opacity: active ? 1 : 0.6,
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                                    {icon}
                                </span>
                                {label}
                            </button>
                        );
                    })}
                </div>

               
                <div style={S.goalsList}>
                    {loading ? (
                        [1, 2, 3].map((i) => (
                            <div key={i} className="skeleton" style={{ height: '68px', borderRadius: '16px' }} />
                        ))
                    ) : goals.length === 0 ? (
                     
                        <div style={S.emptyState}>
                            <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--primary-container)', opacity: 0.35, marginBottom: '8px' }}>
                                flag
                            </span>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--on-surface-variant)', opacity: 0.55, textAlign: 'center' }}>
                                No goals for today yet.
                            </p>
                            <button
                                onClick={generateGoals}
                                disabled={generating}
                                style={S.generateBtnSmall}
                            >
                                {generating ? 'Generating…' : '✦ Generate with AI'}
                            </button>
                        </div>
                    ) : visibleGoals.length === 0 ? (
                        <div style={S.emptyState}>
                            <p style={{ margin: 0, fontSize: '12px', color: 'var(--on-surface-variant)', opacity: 0.45, textAlign: 'center' }}>
                                {tab === 'completed' ? 'No completed goals yet.' : 'All goals done!'}
                            </p>
                        </div>
                    ) : (
                        visibleGoals.map((g) => {
                            const meta = FEATURE_META[g.type] || FEATURE_META.chat;

                            const handleGoTo = () => {
                                setIsOpen(false);
                                if (meta.event) {
                                  
                                    setTimeout(() => window.dispatchEvent(new Event(meta.event)), 80);
                                } else if (meta.route) {
                                    navigate(meta.route);
                                }
                            };

                            return (
                                <div
                                    key={g.id}
                                    style={{
                                        ...S.goalRow,
                                        borderColor: g.completed ? 'var(--glass-border-hover)' : 'var(--glass-border)',
                                        boxShadow: g.completed ? '0 0 18px var(--glow-primary)' : 'none',
                                        cursor: 'default',
                                    }}
                                >
                                    
                                    <div style={{
                                        ...S.checkbox,
                                        background: g.completed ? 'var(--primary-container)' : 'transparent',
                                        borderColor: g.completed ? 'var(--primary-container)' : 'var(--outline-variant)',
                                    }}>
                                        {g.completed && (
                                            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--on-primary)', fontVariationSettings: "'FILL' 1" }}>
                                                check
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ flex: 1, textAlign: 'left' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                            <span className="material-symbols-outlined" style={{
                                                fontSize: '14px',
                                                color: g.completed ? 'var(--primary-container)' : 'var(--on-surface-variant)',
                                                fontVariationSettings: "'FILL' 1",
                                                opacity: g.completed ? 1 : 0.6,
                                            }}>
                                                {meta.icon}
                                            </span>
                                            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: g.completed ? 'var(--primary-container)' : 'var(--on-surface-variant)', opacity: g.completed ? 0.9 : 0.5 }}>
                                                {meta.label}
                                            </span>
                                        </div>
                                        <p style={{
                                            margin: 0,
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            color: g.completed ? 'var(--on-surface-variant)' : 'var(--on-surface)',
                                            textDecoration: g.completed ? 'line-through' : 'none',
                                            opacity: g.completed ? 0.55 : 1,
                                            lineHeight: 1.4,
                                        }}>
                                            {g.text}
                                        </p>
                                    </div>

                                   
                                    {!g.completed && (
                                        <button
                                            onClick={handleGoTo}
                                            title={`Go to ${meta.label}`}
                                            style={S.goBtn}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = 'var(--primary-container)';
                                                e.currentTarget.style.color = 'var(--on-primary)';
                                                e.currentTarget.style.borderColor = 'var(--primary-container)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = 'transparent';
                                                e.currentTarget.style.color = 'var(--on-surface-variant)';
                                                e.currentTarget.style.borderColor = 'var(--glass-border)';
                                            }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>


            </div>

          
            {celebrate && (
                <div style={S.celebrationBg}>
                    <div className="glass-card animate-scale-in" style={S.celebrationCard}>
                        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--primary-container)', fontVariationSettings: "'FILL' 1", filter: 'drop-shadow(0 0 20px var(--glow-primary))' }}>
                            local_fire_department
                        </span>
                        <h3 style={{ margin: '12px 0 6px', fontSize: '24px', fontFamily: 'Manrope, sans-serif', color: 'var(--primary)', textShadow: '0 0 20px var(--glow-primary)' }}>
                            {celebrate}-Day Streak!
                        </h3>
                        <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--on-surface-variant)' }}>
                         Celebrates your consistency.
                        </p>
                        <button
                            className="btn-primary-glow"
                            onClick={() => setCelebrate(null)}
                            style={{ padding: '12px 28px', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em' }}
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}


const S = {
    backdrop: {
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
    },
    panel: {
        position: 'relative', width: '100%', maxWidth: '420px',
        maxHeight: '88vh',
        background: 'var(--surface-container-low)',
        border: '1px solid var(--glass-border)',
        borderRadius: '28px',
        padding: '24px 24px 20px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px var(--glass-border)',
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column', gap: '18px',
    },
    ambientOrb: {
        position: 'absolute', top: '-50px', right: '-50px',
        width: '200px', height: '200px', borderRadius: '50%',
        background: 'var(--primary-container)',
        filter: 'blur(80px)', opacity: 0.08,
        pointerEvents: 'none',
    },
    header: {
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: '12px', position: 'relative', zIndex: 1,
    },
    eyebrow: {
        margin: '0 0 4px', fontSize: '9px', fontWeight: 900,
        textTransform: 'uppercase', letterSpacing: '0.3em',
        color: 'var(--primary-container)', opacity: 0.6,
        fontFamily: 'Inter, sans-serif',
    },
    title: {
        margin: 0, fontSize: '19px', fontWeight: 700,
        fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)', lineHeight: 1.2,
    },
    subtitle: {
        margin: 0, fontSize: '11.5px', color: 'var(--on-surface-variant)', opacity: 0.5,
        fontFamily: 'Inter, sans-serif', lineHeight: 1.5,
    },
    closeBtn: {
        flexShrink: 0, width: '32px', height: '32px', borderRadius: '10px',
        border: '1px solid var(--glass-border)', background: 'transparent',
        color: 'var(--on-surface-variant)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s ease', marginTop: '2px',
    },

   
    streakSection: {
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: '20px',
        padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: '12px',
        position: 'relative', zIndex: 1,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
    },

   
    tabBar: {
        display: 'flex', gap: '6px',
        background: 'var(--surface-container)',
        border: '1px solid var(--glass-border)',
        borderRadius: '14px',
        padding: '4px',
        position: 'relative', zIndex: 1,
    },
    tabBtn: {
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '5px', padding: '8px 6px', borderRadius: '10px', border: 'none',
        cursor: 'pointer', fontSize: '11px', fontFamily: 'Inter, sans-serif',
        letterSpacing: '0.02em', transition: 'all 0.3s ease',
    },

    goalsList: {
        display: 'flex', flexDirection: 'column', gap: '8px',
        overflowY: 'auto', maxHeight: '300px',
        paddingRight: '2px',
        position: 'relative', zIndex: 1,
    },
    goalRow: {
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 14px',
        background: 'var(--surface-container)',
        border: '1px solid',
        borderRadius: '16px',
        cursor: 'default',
        width: '100%',
        textAlign: 'left',
        transition: 'all 0.35s ease',
    },
    checkbox: {
        width: '26px', height: '26px', borderRadius: '8px', border: '2px solid',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all 0.35s ease',
    },
    goBtn: {
        flexShrink: 0,
        width: '30px', height: '30px',
        borderRadius: '10px',
        border: '1px solid var(--glass-border)',
        background: 'transparent',
        color: 'var(--on-surface-variant)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
    },
    emptyState: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '28px 0', gap: '10px',
    },
    generateBtnSmall: {
        marginTop: '4px',
        padding: '10px 20px',
        borderRadius: '999px',
        background: 'transparent',
        border: '1px solid var(--glass-border-hover)',
        color: 'var(--primary-container)',
        fontSize: '11px', fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        cursor: 'pointer', transition: 'all 0.3s ease',
    },
    refreshBtn: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
        width: '100%', padding: '11px',
        background: 'transparent',
        border: '1px solid var(--glass-border)',
        borderRadius: '14px',
        color: 'var(--on-surface-variant)',
        fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
        cursor: 'pointer', transition: 'all 0.3s ease',
    },
    celebrationBg: {
        position: 'fixed', inset: 0, zIndex: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(20px)',
    },
    celebrationCard: {
        maxWidth: '340px', width: '100%',
        padding: '36px 32px', borderRadius: '28px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', borderColor: 'var(--glass-border-hover)',
    },
};
