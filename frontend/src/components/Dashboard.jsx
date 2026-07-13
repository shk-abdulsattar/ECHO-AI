import React, { useMemo, useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

const QUICK_LINKS = [
    { to: '/chat', icon: 'forum', label: 'Start Chat', desc: 'Begin a new session' },
    { to: '/mood', icon: 'mood', label: 'Track Mood', desc: 'How are you feeling?', openMoodOverlay: true },
    { to: '/meditation', icon: 'self_improvement', label: 'Meditation', desc: 'Timers & guided sessions', openMeditateOverlay: true },
    { to: '/breathe', icon: 'air', label: 'Breathe', desc: 'Calm the nervous system', openBreatheOverlay: true },
    { to: '/game', icon: 'sports_esports', label: 'Memory Game', desc: 'Nature pairs mindfulness game', openGameOverlay: true },
];

function AnimCounter({ target, duration = 1500 }) {
    const [val, setVal] = useState(0);
    const ref = useRef(null);
    useEffect(() => {
        const start = Date.now();
        const tick = () => {
            const elapsed = Date.now() - start;
            const prog = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - prog, 3);
            setVal(Math.round(eased * target));
            if (prog < 1) ref.current = requestAnimationFrame(tick);
        };
        ref.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(ref.current);
    }, [target, duration]);
    return <span>{val}</span>;
}

function getGreeting() {
    const h = new Date().getHours();
    if (h < 5) return 'Night owl hours';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Winding down';
}


const FEATURE_META = {
    chat: { route: '/chat', icon: 'forum', label: 'Open Chat' },
    mood: { route: '/mood', icon: 'mood', label: 'Log Mood' },
    meditation: { route: null, event: 'echo-open-meditate', icon: 'self_improvement', label: 'Meditate' },
    breathing: { route: null, event: 'echo-open-breathe', icon: 'air', label: 'Breathe' },
    memory: { route: null, event: 'echo-open-memory-game', icon: 'sports_esports', label: 'Play Game' },
};

function GoalProgressCard({ currentUser, userData, todayMoods }) {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const yesterdayStr = (() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toLocaleDateString('en-CA');
    })();
    const [goals, setGoals] = useState([]);
    const [yesterdayPct, setYesterdayPct] = useState(null);
    const [goalsRef, setGoalsRef] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportErr, setReportErr] = useState('');
    const [hasBreathedToday, setHasBreathedToday] = useState(false);
    const [hasMeditatedToday, setHasMeditatedToday] = useState(false);
    
    const baselineRef = useRef(null);

    useEffect(() => {
        if (!currentUser) return;
        const ref = doc(db, 'users', currentUser.uid, 'dailyGoals', todayStr);
        setGoalsRef(ref);
        return onSnapshot(ref, (snap) => {
            setGoals(snap.exists() ? (snap.data().goals || []) : []);
        });
    }, [currentUser, todayStr]);

   
    useEffect(() => {
        if (!currentUser) return;
        const ref = doc(db, 'users', currentUser.uid, 'dailyGoals', yesterdayStr);
        return onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                const yGoals = snap.data().goals || [];
                const yTotal = yGoals.length;
                const yDone = yGoals.filter(g => g.completed).length;
                setYesterdayPct(yTotal > 0 ? Math.round((yDone / yTotal) * 100) : 0);
            } else {
                setYesterdayPct(null);
            }
        });
    }, [currentUser, yesterdayStr]);

    
    useEffect(() => {
        if (userData && !baselineRef.current) {
            baselineRef.current = { msgCount: userData.msgCount ?? 0 };
        }
    }, [userData]);

    
    useEffect(() => {
        if (!currentUser) return;
        const q = query(
            collection(db, 'users', currentUser.uid, 'breathingSessions'),
            orderBy('endedAt', 'desc'), limit(1)
        );
        return onSnapshot(q, (snap) => {
            if (snap.empty) { setHasBreathedToday(false); return; }
            const ts = snap.docs[0].data().endedAt?.toDate?.();
            setHasBreathedToday(ts ? ts.toLocaleDateString('en-CA') === todayStr : false);
        });
    }, [currentUser, todayStr]);


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
            setHasMeditatedToday(ts ? ts.toLocaleDateString('en-CA') === todayStr && (d.secondsSpent || 0) >= 3 : false);
        });
    }, [currentUser, todayStr]);

    
    useEffect(() => {
        if (!goalsRef || !goals.length || !userData || !baselineRef.current) return;
        const baseline = baselineRef.current;

        const hasMoodToday = todayMoods.some(m => {
            const ts = m.timestamp?.toDate ? m.timestamp.toDate() : new Date(m.timestamp);
            return ts.toLocaleDateString('en-CA') === todayStr;
        });
        const didChat = (userData.msgCount ?? 0) > baseline.msgCount;
     
        const didBreathe = hasBreathedToday;
        const didMeditate = hasMeditatedToday;
        const didMemory = sessionStorage.getItem('echo_memory_today') === todayStr;

        const shouldComplete = (type) => {
            if (type === 'mood') return hasMoodToday;
            if (type === 'meditation') return didMeditate;
            if (type === 'chat') return didChat;
            if (type === 'breathing') return didBreathe;
            if (type === 'memory') return didMemory;
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
        updateDoc(goalsRef, { goals: updated, allCompleted }).catch(() => { });
    }, [userData, todayMoods, goals, goalsRef, todayStr, hasBreathedToday, hasMeditatedToday]);

    const total = goals.length;
    const done = goals.filter(g => g.completed).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const handleReport = async () => {
        if (reportData) {
            
            const w = window.open('', '_blank');
            w.document.write(`<!DOCTYPE html>
<html>
<head>
    <title>Wellness Progress Report</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&family=Inter:wght@400;600&display=swap');
        body { font-family: 'Merriweather', serif; padding: 40px; color: #222; max-width: 800px; margin: auto; line-height: 1.6; }
        .header { border-bottom: 2px solid #2c3e50; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
        .logo-area h1 { font-family: 'Inter', sans-serif; font-size: 24px; color: #2c3e50; margin: 0; letter-spacing: 1px; text-transform: uppercase; }
        .logo-area p { margin: 4px 0 0; font-size: 12px; color: #7f8c8d; font-family: 'Inter', sans-serif; text-transform: uppercase; letter-spacing: 0.5px; }
        .meta-info { text-align: right; font-family: 'Inter', sans-serif; font-size: 12px; color: #34495e; line-height: 1.5; }
        .meta-info strong { color: #2c3e50; }
        .section { margin-bottom: 35px; }
        .section-title { font-family: 'Inter', sans-serif; font-size: 13px; color: #7f8c8d; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid #ecf0f1; padding-bottom: 8px; margin-bottom: 15px; font-weight: 600; }
        .content { font-size: 14px; text-align: justify; color: #333; }
        .signature { margin-top: 40px; border-top: 1px solid #bdc3c7; width: 200px; padding-top: 10px; font-style: italic; font-size: 14px; font-family: 'Merriweather', serif; color: #2c3e50; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-area">
            <h1>ECHO AI</h1>
            <p>Weekly Progress Report</p>
        </div>
        <div class="meta-info">
            
            <div><strong>DATE OF REPORT:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">I. Affect & Mood Analysis</div>
        <div class="content">${reportData.moodSummary}</div>
    </div>

    <div class="section">
        <div class="section-title">II. Psychological & Conversational Tone</div>
        <div class="content">${reportData.chatToneAnalysis}</div>
    </div>

    <div class="section">
        <div class="section-title">III. Behavioral Consistency & Engagement</div>
        <div class="content">${reportData.streakNarrative}</div>
    </div>

    <div class="section">
        <div class="section-title">IV. Therapeutic Activities Summary</div>
        <div class="content">
            <ul style="list-style-type: none; padding-left: 0; margin-top: 10px;">
                <li style="margin-bottom: 8px;"><strong>Goals Completed:</strong> ${reportData.goalsCompletedCount} sessions</li>
                <li style="margin-bottom: 8px;"><strong>Meditation Sessions:</strong> ${reportData.meditationCount} sessions</li>
                <li style="margin-bottom: 8px;"><strong>Breathing Exercises:</strong> ${reportData.breathingCount} sessions</li>
            </ul>
        </div>
    </div>

    <div class="signature">
        Electronically Generated by ECHO AI
    </div>
</body>
</html>`);
            w.document.close();
            w.print();
            return;
        }
        setReportLoading(true);
        setReportErr('');
        try {
            const token = await auth.currentUser.getIdToken();
            const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/report/generate`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Failed');
            setReportData(json.report);
        } catch (e) {
            setReportErr(e.message || 'Could not generate report');
        } finally {
            setReportLoading(false);
        }
    };

    
    const CX = 72, CY = 72, SW = 6;
    const R_OUTER = 67, R_MID = 50, R_INNER = 32;

    
    const pctOuter = pct;
    const pctMid = pct > 0 ? Math.min(pct * 1.25, 100) : 0;
    const pctInner = pct > 0 ? pct * 0.65 : 0;

    const arc = (p, r) => `${(p / 100) * 2 * Math.PI * r} ${2 * Math.PI * r}`;

    return (
        <div className="glass-card p-5 relative overflow-hidden flex flex-col" style={{ minHeight: 0 }}>
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none"
                style={{ background: 'var(--glow-primary)', filter: 'blur(40px)', opacity: 0.18 }} />

           
            <div className="flex justify-between items-center mb-1 relative z-10">
                <h3 className="text-[13px] font-headline font-bold tracking-widest uppercase m-0"
                    style={{ color: 'var(--primary-container)' }}>Goals Progress</h3>
                <button
                    onClick={() => window.dispatchEvent(new Event('echo-open-goals'))}
                    className="cursor-pointer bg-transparent border-none transition-transform hover:scale-110 flex items-center justify-center p-0"
                    title="Expand Goals"
                >
                    <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.7, fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
                        open_in_new
                    </span>
                </button>
            </div>
            {total > 0 && yesterdayPct !== null && (
                <p className="text-[10px] m-0 mb-3 relative z-10" style={{ color: 'var(--on-surface-variant)', opacity: 0.55 }}>
                    <strong style={{ color: pct >= yesterdayPct ? 'var(--primary)' : 'var(--error)' }}>
                        {pct >= yesterdayPct ? '+' : ''}{pct - yesterdayPct}%
                    </strong> compared to yesterday
                </p>
            )}
            {total > 0 && yesterdayPct === null && (
                <p className="text-[10px] m-0 mb-3 relative z-10" style={{ color: 'var(--on-surface-variant)', opacity: 0.55 }}>
                    <strong style={{ color: 'var(--primary)' }}>{pct}%</strong> complete today
                </p>
            )}

       
            <div className="flex gap-3 relative z-10 flex-1 items-center">

                <div className="flex-1 flex flex-col gap-3 min-w-0">
                    {total === 0 ? (
                        <div className="flex flex-col gap-2 py-1">
                            <p className="text-[11px] font-bold m-0" style={{ color: 'var(--on-surface-variant)', opacity: 0.35 }}>No goals today</p>
                            <button
                                onClick={() => window.dispatchEvent(new Event('echo-open-goals'))}
                                className="text-[10px] font-black px-3 py-1.5 rounded-full border self-start cursor-pointer bg-transparent"
                                style={{ color: 'var(--primary-container)', borderColor: 'var(--glass-border-hover)' }}>
                                Generate Goals →
                            </button>
                        </div>
                    ) : (
                        goals.slice(0, 4).map((g) => {
                            const meta = FEATURE_META[g.type] || FEATURE_META.chat;
                            return (
                                <div
                                    key={g.id}
                                    className="flex items-center gap-2.5"
                                >
                                    <span className="w-[7px] h-[7px] rounded-full flex-shrink-0 transition-all duration-500"
                                        style={{
                                            background: g.completed ? 'var(--primary-container)' : 'var(--on-surface-variant)',
                                            opacity: g.completed ? 1 : 0.4,
                                            boxShadow: g.completed ? '0 0 5px var(--glow-primary)' : 'none',
                                        }} />
                                    <span className="text-[12px] font-semibold transition-all duration-300"
                                        style={{
                                            color: g.completed ? 'var(--primary)' : 'var(--on-surface-variant)',
                                            opacity: g.completed ? 0.9 : 0.65,
                                            textDecoration: g.completed ? 'line-through' : 'none',
                                        }}>
                                        {meta.label}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>

               
                {total > 0 && (
                    <div className="flex-shrink-0">
                        <svg width="148" height="148" viewBox="0 0 144 144">
                            <defs>
                                <filter id="rg" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="2" result="b" />
                                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                                </filter>
                            </defs>

                            
                            <circle cx={CX} cy={CY} r={R_OUTER} fill="none"
                                stroke="var(--primary-container)" strokeWidth={SW} strokeOpacity="0.12" />
                            <circle cx={CX} cy={CY} r={R_OUTER} fill="none"
                                stroke="var(--primary-container)" strokeWidth={SW}
                                strokeLinecap="butt"
                                strokeDasharray={arc(pctOuter, R_OUTER)}
                                transform={`rotate(-90 ${CX} ${CY})`}
                                filter="url(#rg)"
                                style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1)' }} />

                            <circle cx={CX} cy={CY} r={R_MID} fill="none"
                                stroke="var(--primary-container)" strokeWidth={SW} strokeOpacity="0.1" />
                            <circle cx={CX} cy={CY} r={R_MID} fill="none"
                                stroke="var(--primary-container)" strokeWidth={SW}
                                strokeLinecap="butt" strokeOpacity="0.6"
                                strokeDasharray={arc(pctMid, R_MID)}
                                transform={`rotate(-90 ${CX} ${CY})`}
                                style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1) 0.07s' }} />

                            
                            <circle cx={CX} cy={CY} r={R_INNER} fill="none"
                                stroke="var(--primary-container)" strokeWidth={SW} strokeOpacity="0.08" />
                            <circle cx={CX} cy={CY} r={R_INNER} fill="none"
                                stroke="var(--primary-container)" strokeWidth={SW}
                                strokeLinecap="butt" strokeOpacity="0.35"
                                strokeDasharray={arc(pctInner, R_INNER)}
                                transform={`rotate(-90 ${CX} ${CY})`}
                                style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1) 0.14s' }} />

                           
                            <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle" fontSize="22" fontWeight="800"
                                fill="var(--on-surface)" fontFamily="Inter,sans-serif">{pct}%</text>
                        </svg>
                    </div>
                )}
            </div>

       
            <div className="mt-4 relative z-10">
                {reportErr && <p className="text-[10px] mb-1.5 m-0" style={{ color: 'var(--error)' }}>{reportErr}</p>}
                <button
                    onClick={handleReport}
                    disabled={reportLoading}
                    className="w-full py-3 rounded-xl border text-[11px] font-black uppercase tracking-widest cursor-pointer transition-all duration-300 disabled:opacity-40 flex items-center justify-center gap-2 group relative overflow-hidden"
                    style={{
                        background: reportData ? 'var(--primary-container)' : 'transparent',
                        borderColor: reportData ? 'var(--primary-container)' : 'var(--glass-border-hover)',
                        color: reportData ? 'var(--on-primary)' : 'var(--primary-container)',
                        boxShadow: reportData ? '0 4px 20px var(--glow-primary)' : 'none',
                    }}
                >
                    {reportData && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    <span className="material-symbols-outlined text-[16px] transition-transform group-hover:scale-110" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {reportLoading ? 'hourglass_top' : reportData ? 'download' : 'summarize'}
                    </span>
                    <span className="relative z-10">{reportLoading ? 'Generating…' : reportData ? 'Download Report' : 'Generate Report'}</span>
                </button>
            </div>
        </div>
    );
}


function MoodLineChart({ moods, moodMap }) {
    const W = 340, H = 180, PAD = { t: 30, r: 20, b: 35, l: 20 };
    const chartW = W - PAD.l - PAD.r;
    const chartH = H - PAD.t - PAD.b;

    
    const localDate = (d) => {
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${mo}-${day}`;
    };

   
    const todayD = new Date();
    const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(todayD);
        d.setDate(todayD.getDate() - (6 - i));
        return localDate(d);
    });

   
    const DAY_LABELS = last7.map(d => {
        const dt = new Date(d + 'T00:00:00');
        return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dt.getDay()];
    });

    const moodByDate = {};
    [...moods].reverse().forEach(m => {
        if (!m.timestamp) return;
        const ts = m.timestamp?.toDate ? m.timestamp.toDate() : new Date(m.timestamp);
        const key = localDate(ts);
        if (!(key in moodByDate)) moodByDate[key] = moodMap[m.mood] ?? 3;
    });
    const slots = last7.map(d => moodByDate[d] ?? null);

   
    const filled = slots.map((v, i) => {
        if (v !== null) return v;
        const prev = slots.slice(0, i).reverse().find(x => x !== null) ?? 3;
        const next = slots.slice(i + 1).find(x => x !== null) ?? 3;
        return (prev + next) / 2;
    });

   
    const pts = filled.map((v, i) => ({
        x: PAD.l + (i / 6) * chartW,
        y: PAD.t + chartH - (v / 5) * chartH,
    }));

  
    const buildPath = (points) => points.reduce((acc, pt, i) => {
        if (i === 0) return `M ${pt.x},${pt.y}`;
        const prev = points[i - 1];
        const cpX = (prev.x + pt.x) / 2;
        return `${acc} C ${cpX},${prev.y} ${cpX},${pt.y} ${pt.x},${pt.y}`;
    }, '');

    const pathD = buildPath(pts);

   
    const areaD = `${pathD} L ${pts[6].x},${PAD.t + chartH} L ${pts[0].x},${PAD.t + chartH} Z`;

    
    const latestMood = moods[0]?.mood ?? null;
    const latestVal = latestMood ? moodMap[latestMood] ?? 3 : null;
    const badgePt = latestVal !== null ? pts[6] : null;

    if (!moods.length) {
        return (
            <div className="glass-card p-6 flex flex-col items-center justify-center text-center" style={{ minHeight: 200 }}>
                <span className="material-symbols-outlined text-3xl mb-3" style={{ color: 'var(--primary-container)', opacity: 0.4 }}>mood</span>
                <p className="text-[11px] uppercase tracking-widest font-black m-0" style={{ color: 'var(--on-surface-variant)', opacity: 0.4 }}>Log your first mood<br />to see your chart</p>
            </div>
        );
    }

    return (
        <div className="glass-card p-6 relative overflow-hidden flex flex-col">
           
            <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full pointer-events-none"
                style={{ background: 'var(--glow-secondary)', filter: 'blur(50px)', opacity: 0.2 }} />

            <div className="flex items-center justify-between mb-4 relative z-10">
                <div>
                    <h3 className="text-[13px] font-headline font-bold tracking-widest uppercase m-0"
                        style={{ color: 'var(--primary-container)' }}>Mood Insights</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"
                            style={{ color: 'var(--primary)' }}>
                            <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--primary-container)' }} />
                            Mood
                        </span>
                    </div>
                </div>
            </div>

          
            <div className="relative z-10 flex-1">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ overflow: 'visible' }}>
                    <defs>
                        <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--primary-container)" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="var(--primary-container)" stopOpacity="0.0" />
                        </linearGradient>
                    </defs>

                   
                    <path d={areaD} fill="url(#moodFill)" />

                   
                    <path d={pathD} fill="none" stroke="var(--primary-container)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ filter: 'drop-shadow(0 0 6px var(--glow-primary))' }} />

                   
                    {pts.map((pt, i) => (
                        <g key={i}>
                            {i === 6 && (
                                <circle cx={pt.x} cy={PAD.t + chartH + 18} r="8" fill="var(--on-surface-variant)" fillOpacity="0.8" />
                            )}
                            <text x={pt.x} y={PAD.t + chartH + 21} textAnchor="middle"
                                fontSize="9" fontWeight="800" letterSpacing="0.5"
                                fill={i === 6 ? 'var(--on-primary)' : 'var(--on-surface-variant)'}
                                fillOpacity={i === 6 ? 1 : 0.6}>
                                {DAY_LABELS[i]}
                            </text>
                        </g>
                    ))}

                 
                    {badgePt && (
                        <>
                            <circle cx={badgePt.x} cy={badgePt.y} r="4" fill="var(--primary-container)"
                                style={{ filter: 'drop-shadow(0 0 6px var(--glow-primary))' }} />
                            <circle cx={badgePt.x} cy={badgePt.y} r="7" fill="var(--primary-container)" fillOpacity="0.15" />
                        </>
                    )}
                </svg>

                {badgePt && latestMood && (
                    <div className="absolute flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider pointer-events-none"
                        style={{
                            top: `${(badgePt.y / H) * 100}%`,
                            left: `${(badgePt.x / W) * 100}%`,
                            transform: 'translate(-50%, -160%)',
                            background: 'var(--primary-container)',
                            color: 'var(--on-primary)',
                            boxShadow: '0 4px 20px var(--glow-primary)',
                        }}>
                        {latestMood}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { userData, currentUser, logout } = useAuth();
    const [recentMoods, setRecentMoods] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!currentUser) return;
        const q = query(collection(db, 'users', currentUser.uid, 'moodLogs'), orderBy('timestamp', 'desc'), limit(7));
        return onSnapshot(q, (snap) => {
            setRecentMoods(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
    }, [currentUser]);



    const moodMap = { Happy: 5, Neutral: 3, Sad: 2, Stressed: 1, Angry: 0 };

    return (
        <div className="h-full w-full flex items-center justify-center relative p-1 md:p-2 lg:p-4">
          
            <div className="w-full h-full max-w-[1920px] flex flex-col overflow-hidden relative z-10 rounded-2xl"
                style={{ background: 'transparent', backdropFilter: 'blur(3px)', border: '0.4px solid var(--glass-border-hover)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)' }}>

             
                <div className="flex-shrink-0 px-8 pt-8 flex items-center justify-between relative z-[100]">
                    <div className="flex items-center gap-3 animate-float-up">
                        <img src="/logo-light.png" alt="ECHO" className="w-12 h-12 object-contain opacity-85" />
                        <h1 className="font-headline font-bold text-[19px] tracking-wide text-primary m-0">
                            ECHO AI
                        </h1>
                    </div>

                 
                    <div className="relative z-50 animate-float-up delay-1" ref={dropdownRef}>
                        <div className="flex items-center gap-3">
                       
                            <Link to="/profile" className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105"
                                style={{ background: 'var(--surface)', border: '1px solid var(--glass-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                                <span className="material-symbols-outlined text-[var(--on-surface)] text-[22px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>settings</span>
                            </Link>

                         
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-12 h-12 rounded-full overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105 focus:outline-none"
                                style={{ border: '2px solid var(--glass-border-hover)', background: 'var(--surface-container)', boxShadow: '0 0 20px var(--glow-primary)' }}
                            >
                                {currentUser?.photoURL ? (
                                    <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-headline font-bold text-lg" style={{ background: 'var(--primary-container)', color: 'var(--on-primary)' }}>
                                        {userData?.name ? userData.name.charAt(0).toUpperCase() : (currentUser?.email ? currentUser.email.charAt(0).toUpperCase() : 'U')}
                                    </div>
                                )}
                            </button>
                        </div>

                        {isDropdownOpen && (
                            <div className="absolute top-14 right-0 w-48 rounded-2xl border border-[var(--glass-border)] p-2 animate-float-up flex flex-col gap-1"
                                style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(30px)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>

                                <button onClick={() => { setIsDropdownOpen(false); window.dispatchEvent(new Event('echo-open-panic')); }}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border-none cursor-pointer bg-transparent hover:bg-[color-mix(in_srgb,var(--error)_10%,transparent)] transition-colors text-left w-full">
                                    <span className="material-symbols-outlined text-[var(--error)] text-[18px]">emergency</span>
                                    <span className="text-xs uppercase font-black tracking-widest text-[var(--error)]">Panic Button</span>
                                </button>

                                <div className="w-full h-px my-1" style={{ background: 'var(--glass-border)' }} />

                                <button onClick={async () => { await logout(); }}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border-none cursor-pointer bg-transparent hover:bg-[var(--glass-border-hover)] transition-colors text-left w-full">
                                    <span className="material-symbols-outlined text-[var(--on-surface-variant)] text-[18px]">logout</span>
                                    <span className="text-xs uppercase font-black tracking-widest text-[var(--on-surface-variant)]">Logout</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                
                <div className="flex-shrink-0 px-8 pt-6 pb-6 relative z-20">
                    <div className="animate-float-up delay-1">
                        <p className="text-[10px] uppercase tracking-[0.5em] font-black m-0 mb-2" style={{ color: 'var(--primary-container)', opacity: 0.7 }}>
                            Dashboard
                        </p>
                        <h1
                            className="text-4xl md:text-5xl font-headline font-extralight m-0 leading-tight"
                            style={{ color: 'var(--primary)' }}
                        >
                            {getGreeting()},{' '}
                            <span className="font-bold" style={{ color: 'var(--primary-container)' }}>
                                {userData?.name || 'User'}
                            </span>
                        </h1>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-32 pt-4">
                    <div className="max-w-6xl mx-auto flex flex-col gap-8">

     
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.25rem', alignItems: 'stretch' }}
                            className="animate-float-up delay-1">

                      
                            <div className="glass-card p-6 relative overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
                                    style={{ background: 'var(--glow-primary)', filter: 'blur(50px)', opacity: 0.25 }} />

                                <h3 className="text-[13px] font-headline font-bold tracking-widest uppercase mb-5 relative z-10"
                                    style={{ color: 'var(--primary-container)' }}>
                                    Overall Information
                                </h3>

                                <div className="flex items-stretch gap-0 mb-5 relative z-10">
                                    <div className="flex-1 pr-5">
                                        <div className="text-[52px] font-headline font-semibold leading-none tracking-tight mb-1"
                                            style={{ color: 'var(--primary)' }}>
                                            <AnimCounter target={userData?.totalSessions ?? 0} />
                                        </div>
                                        <div className="text-[10px] uppercase tracking-[0.2em] font-black leading-snug"
                                            style={{ color: 'var(--on-surface-variant)', opacity: 0.65 }}>
                                            Chat sessions<br />completed
                                        </div>
                                        <div className="h-[3px] w-10 rounded-full mt-4"
                                            style={{ background: 'var(--primary-container)', opacity: 0.7 }} />
                                    </div>
                                    <div className="w-px self-stretch mx-1 rounded-full"
                                        style={{ background: 'var(--glass-border-hover)', opacity: 0.5 }} />
                                    <div className="flex-1 pl-5">
                                        <div className="text-[52px] font-headline font-semibold leading-none tracking-tight mb-1"
                                            style={{ color: 'var(--primary)' }}>
                                            <AnimCounter target={userData?.goalsAchieved ?? 0} />
                                        </div>
                                        <div className="text-[10px] uppercase tracking-[0.2em] font-black leading-snug"
                                            style={{ color: 'var(--on-surface-variant)', opacity: 0.65 }}>
                                            Goals achieved<br />in total
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 relative z-10">
                                    <div className="rounded-[20px] p-4 flex flex-col items-center justify-center text-center transition-transform duration-300 hover:-translate-y-1"
                                        style={{ background: 'var(--surface-container-highest)', border: '1px solid var(--glass-border)' }}>
                                        <span className="material-symbols-outlined text-[18px] mb-2"
                                            style={{ color: 'var(--primary-container)', fontVariationSettings: "'FILL' 1, 'wght' 300" }}>
                                            self_improvement
                                        </span>
                                        <span className="font-headline font-bold text-[22px] leading-none mb-1" style={{ color: 'var(--primary)' }}>
                                            {userData?.meditationsDone ?? 0}
                                        </span>
                                        <span className="text-[9px] uppercase tracking-widest font-black"
                                            style={{ color: 'var(--primary-container)', opacity: 0.75 }}>Meditate</span>
                                    </div>
                                    <div className="rounded-[20px] p-4 flex flex-col items-center justify-center text-center transition-transform duration-300 hover:-translate-y-1"
                                        style={{ background: 'var(--surface-container-high)', border: '1px solid var(--glass-border)' }}>
                                        <span className="material-symbols-outlined text-[18px] mb-2"
                                            style={{ color: 'var(--primary-container)', fontVariationSettings: "'FILL' 1, 'wght' 300" }}>
                                            local_fire_department
                                        </span>
                                        <span className="font-headline font-bold text-[22px] leading-none mb-1" style={{ color: 'var(--primary)' }}>
                                            {userData?.streak ?? 0}
                                        </span>
                                        <span className="text-[9px] uppercase tracking-widest font-black"
                                            style={{ color: 'var(--primary-container)', opacity: 0.75 }}>Streak</span>
                                    </div>
                                    <div className="rounded-[20px] p-4 flex flex-col items-center justify-center text-center transition-transform duration-300 hover:-translate-y-1"
                                        style={{ background: 'var(--surface-container)', border: '1px solid var(--glass-border)' }}>
                                        <span className="material-symbols-outlined text-[18px] mb-2"
                                            style={{ color: 'var(--primary-container)', fontVariationSettings: "'FILL' 1, 'wght' 300" }}>
                                            emoji_events
                                        </span>
                                        <span className="font-headline font-bold text-[22px] leading-none mb-1" style={{ color: 'var(--primary)' }}>
                                            {userData?.bestStreak ?? 0}
                                        </span>
                                        <span className="text-[9px] uppercase tracking-widest font-black"
                                            style={{ color: 'var(--primary-container)', opacity: 0.75 }}>Best</span>
                                    </div>
                                </div>
                            </div>

                   
                            <MoodLineChart moods={recentMoods} moodMap={moodMap} />

                          
                            <GoalProgressCard currentUser={currentUser} userData={userData} todayMoods={recentMoods} />
                        </div>

                    
                        <div className="mt-6">
                            <h3 className="text-[10px] uppercase tracking-[0.5em] font-black mb-4 animate-float-up delay-6" style={{ color: 'var(--primary-container)', opacity: 0.6 }}>
                                Quick access
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {QUICK_LINKS.map((link, i) => (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        onClick={(e) => {
                                            if (link.openMoodOverlay) {
                                                e.preventDefault();
                                                window.dispatchEvent(new Event('echo-open-mood'));
                                            }
                                            if (link.openGoalsOverlay) {
                                                e.preventDefault();
                                                window.dispatchEvent(new Event('echo-open-goals'));
                                            }
                                            if (link.openBreatheOverlay) {
                                                e.preventDefault();
                                                window.dispatchEvent(new Event('echo-open-breathe'));
                                            }
                                            if (link.openMeditateOverlay) {
                                                e.preventDefault();
                                                window.dispatchEvent(new Event('echo-open-meditate'));
                                            }
                                            if (link.openGameOverlay) {
                                                e.preventDefault();
                                                window.dispatchEvent(new Event('echo-open-memory-game'));
                                            }
                                        }}
                                        className={`group glass-card p-6 no-underline flex items-start gap-4 animate-float-up delay-${Math.min(i + 7, 10)}`}
                                    >
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-500 group-hover:scale-110"
                                            style={{
                                                background: 'linear-gradient(135deg, var(--glow-primary), var(--glow-secondary))',
                                                border: '1px solid var(--glass-border-hover)',
                                            }}
                                        >
                                            <span className="material-symbols-outlined text-[var(--primary-container)] text-xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
                                                {link.icon}
                                            </span>
                                        </div>
                                        <div>
                                            <h4 className="m-0 text-base font-headline font-semibold group-hover:text-[var(--primary-container)] transition-colors" style={{ color: 'var(--primary)' }}>
                                                {link.label}
                                            </h4>
                                            <p className="m-0 mt-1 text-sm" style={{ color: 'var(--on-surface-variant)' }}>{link.desc}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
