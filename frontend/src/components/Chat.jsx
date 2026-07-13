import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    collection, doc, setDoc, getDoc, addDoc, onSnapshot,
    query, orderBy, serverTimestamp, updateDoc, limit, deleteDoc, getDocs, increment
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import ZenBot from './ZenBot';

function formatMsgTime(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function deleteSessionDeep(db, userId, sessionId) {
    const msgsRef = collection(db, 'users', userId, 'sessions', sessionId, 'messages');
    const snap = await getDocs(msgsRef);
    const batch = [];
    snap.forEach(d => batch.push(deleteDoc(d.ref)));
    await Promise.all(batch);
    await deleteDoc(doc(db, 'users', userId, 'sessions', sessionId));
}

export default function Chat() {
    const { userData, currentUser, logout } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [sessionId, setSessionId] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [zenBotState, setZenBotState] = useState('idle');
    const [wellnessHint, setWellnessHint] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [hoveredSessionId, setHoveredSessionId] = useState(null);

    const scrollRef = useRef(null);
    const idleTimerRef = useRef(null);

    const isLight = useMemo(() => {
        const t = userData?.theme;
        if (t === 'light') return true;
        if (t === 'system' && typeof window !== 'undefined') {
            return !window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    }, [userData?.theme]);

  
    useEffect(() => {
        if (!currentUser) return;
        const q = query(
            collection(db, 'users', currentUser.uid, 'sessions'),
            orderBy('updatedAt', 'desc'),
            limit(60)
        );
        return onSnapshot(q, (snap) => {
            setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
    }, [currentUser]);

    
    useEffect(() => {
        const sid = searchParams.get('session') || `session-${Date.now()}`;
        setSessionId(sid);
    }, [searchParams]);


    
    useEffect(() => {
        if (!currentUser || !sessionId) return;
        const q = query(
            collection(db, 'users', currentUser.uid, 'sessions', sessionId, 'messages'),
            orderBy('timestamp', 'asc')
        );
        return onSnapshot(q, (snap) => {
            setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
    }, [currentUser, sessionId]);

    const resetIdleTimer = useCallback(() => {
        if (zenBotState !== 'thinking') {
            setZenBotState(input.trim() ? 'listening' : 'idle');
        }
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => setZenBotState('dozing'), 60000);
    }, [input, zenBotState]);

    useEffect(() => {
        resetIdleTimer();
        return () => clearTimeout(idleTimerRef.current);
    }, [input, resetIdleTimer]);

    
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, loading]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading || !sessionId || !currentUser) return;

        const userText = input.trim();

        const crisisKeywords = ['suicide', 'kill', 'end it all', 'self harm', 'hurt myself', 'die', 'death', 'overdose', 'cutting', 'panic attack', 'anxiety attack'];
        if (crisisKeywords.some(k => userText.toLowerCase().includes(k))) {
            window.dispatchEvent(new Event('echo-open-panic'));
            setInput('');
            return;
        }

        setInput('');
        setLoading(true);
        setZenBotState('thinking');
        setWellnessHint(false);

        try {
            await addDoc(collection(db, 'users', currentUser.uid, 'sessions', sessionId, 'messages'), {
                sender: 'user', text: userText, timestamp: serverTimestamp(),
            });

            
            if (messages.length === 0) {
                let title = userText.substring(0, 36);
                if (userText.length > 36) title += '...';
                await setDoc(doc(db, 'users', currentUser.uid, 'sessions', sessionId), {
                    title,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                }, { merge: true });
                updateDoc(doc(db, 'users', currentUser.uid), {
                    totalSessions: increment(1)
                }).catch(err => console.error('Failed to increment totalSessions:', err));
            } else {
                await updateDoc(doc(db, 'users', currentUser.uid, 'sessions', sessionId), { updatedAt: serverTimestamp() });
            }

            const token = await auth.currentUser.getIdToken();
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ sessionId, message: userText, userMessageSaved: true }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Request failed');

            if (data.isCrisis) window.dispatchEvent(new Event('echo-open-panic'));
            if (data.suggestWellnessActivity) setWellnessHint(true);
        } catch (err) {
            console.error('Chat error:', err);
            await addDoc(collection(db, 'users', currentUser.uid, 'sessions', sessionId, 'messages'), {
                sender: 'ai',
                text: 'Please check your connection or try again in a moment.',
                timestamp: serverTimestamp(),
                feedback: null,
            });
        } finally {
            setLoading(false);
            setZenBotState('idle');
        }
    };

    const setFeedback = async (msgId, value) => {
        if (!currentUser || !sessionId || !msgId || msgId === 'welcome') return;
        await updateDoc(doc(db, 'users', currentUser.uid, 'sessions', sessionId, 'messages', msgId), { feedback: value });
    };

    const startNewChat = () => setSearchParams({ session: `session-${Date.now()}` });

    const confirmDelete = async () => {
        if (!currentUser || !deleteId) return;
        await deleteSessionDeep(db, currentUser.uid, deleteId);
        if (deleteId === sessionId) startNewChat();
        setDeleteId(null);
    };

   
    const groupedSessions = useMemo(() => {
        const visible = sessions.slice(0, 12);
        const now = new Date();
        const todayStr = now.toDateString();
        const yesterdayStr = new Date(now - 86400000).toDateString();
        const sevenAgo = new Date(now - 7 * 86400000);
        const thirtyAgo = new Date(now - 30 * 86400000);
        const buckets = { today: [], yesterday: [], week: [], month: [], older: [] };
        visible.forEach((s) => {
            const d = s.updatedAt?.toDate ? s.updatedAt.toDate() : new Date(0);
            if (d.toDateString() === todayStr) buckets.today.push(s);
            else if (d.toDateString() === yesterdayStr) buckets.yesterday.push(s);
            else if (d >= sevenAgo) buckets.week.push(s);
            else if (d >= thirtyAgo) buckets.month.push(s);
            else buckets.older.push(s);
        });
        const groups = [];
        if (buckets.today.length) groups.push({ label: 'Today', items: buckets.today });
        if (buckets.yesterday.length) groups.push({ label: 'Yesterday', items: buckets.yesterday });
        if (buckets.week.length) groups.push({ label: 'Previous 7 days', items: buckets.week });
        if (buckets.month.length) groups.push({ label: 'This month', items: buckets.month });
        if (buckets.older.length) groups.push({ label: 'Older', items: buckets.older });
        return groups;
    }, [sessions]);

    const userInitial = userData?.name
        ? userData.name.charAt(0).toUpperCase()
        : currentUser?.email?.charAt(0).toUpperCase() || 'U';

    const isEmptyState = messages.length === 0 && !loading;
    const currentSessionTitle = sessions.find(s => s.id === sessionId)?.title || null;

    return (
        
        <div className="h-full w-full min-h-0 flex overflow-hidden gap-3 p-4">

            
            <div
                className="flex-shrink-0 h-full flex flex-col overflow-hidden"
                style={{
                    background: 'var(--glass-bg)',
                    backdropFilter: 'blur(40px)',
                    WebkitBackdropFilter: 'blur(40px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '1.75rem',
                    width: isEmptyState ? '0px' : '260px',
                    opacity: isEmptyState ? 0 : 1,
                    transform: isEmptyState ? 'translateX(-20px)' : 'translateX(0)',
                    marginRight: isEmptyState ? '-12px' : '0',
                    transition: 'width 0.7s cubic-bezier(0.2,0.8,0.2,1), opacity 0.7s cubic-bezier(0.2,0.8,0.2,1), transform 0.7s cubic-bezier(0.2,0.8,0.2,1), margin 0.7s cubic-bezier(0.2,0.8,0.2,1)',
                    position: 'relative',
                    zIndex: 200,
                    overflow: 'hidden',
                }}
            >
                
                <div style={{ flexShrink: 0, padding: '16px 12px 8px' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 4px 12px' }}>
                        
                        <img src="/logo-light.png" alt="ECHO" style={{ width: '45px', height: '45px', objectFit: 'contain', opacity: 0.85, flexShrink: 0 }} />
                       
                        <span style={{ fontFamily: 'var(--font-headline, Inter)', fontWeight: 700, fontSize: '15px', letterSpacing: '0.05em', color: 'var(--primary)', userSelect: 'none' }}>ECHO AI</span>
                        
                        <button
                            onClick={() => window.dispatchEvent(new Event('echo-open-history'))}
                            title="Chat History"
                            style={{
                                marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '44px', height: '44px', borderRadius: '15px',
                                background: 'transparent', cursor: 'pointer', color: 'var(--on-surface-variant)',
                                opacity: 0.6, flexShrink: 0, transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--surface-container)'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 0, 'wght' 300" }}>search</span>
                        </button>
                    </div>

                  
                    <button
                        onClick={startNewChat}
                        className="btn-primary-glow"
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: '6px', padding: '10px 14px', borderRadius: '19px', border: 'none',
                            cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'Inter, sans-serif',
                            marginBottom: '8px',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                        New Chat
                    </button>

                </div>

                
                <div
                    className="custom-scrollbar"
                    style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '4px 8px 56px' }}
                >
                    
                    {sessions.length === 0 && (
                        <p style={{ fontSize: '11px', textAlign: 'center', padding: '40px 8px', margin: 0, color: 'var(--on-surface-variant)', opacity: 0.35, fontFamily: 'Inter, sans-serif' }}>
                            No Chat sessions yet.
                        </p>
                    )}

                  
                    {groupedSessions.map((group) => (
                        <div key={group.label} style={{ marginBottom: '12px' }}>
                           
                            <p style={{
                                margin: '0 0 2px', padding: '6px 8px 2px',
                                fontSize: '9px', fontWeight: 900, textTransform: 'uppercase',
                                letterSpacing: '0.18em', fontFamily: 'Inter, sans-serif',
                                color: 'var(--on-surface-variant)', opacity: 0.4, userSelect: 'none',
                            }}>{group.label}</p>

                            
                            {group.items.map(s => {
                                const isCurrent = s.id === sessionId;
                                const isHov = hoveredSessionId === s.id;
                                return (
                                    <div
                                        key={s.id}
                                        onClick={() => { if (!isCurrent) setSearchParams({ session: s.id }); }}
                                        onMouseEnter={() => setHoveredSessionId(s.id)}
                                        onMouseLeave={() => setHoveredSessionId(null)}
                                        style={{
                                            position: 'relative', display: 'flex', alignItems: 'center',
                                            gap: '8px', padding: '8px 10px', borderRadius: '10px',
                                            cursor: 'pointer', marginBottom: '1px',
                                            background: isCurrent
                                                ? 'var(--surface-container)'
                                                : isHov ? 'var(--surface-container-low)' : 'transparent',
                                            border: isCurrent ? '1px solid var(--glass-border)' : '1px solid transparent',
                                            transition: 'background 0.15s ease, border-color 0.15s ease',
                                        }}
                                    >
                                        
                                        <span
                                            className="material-symbols-outlined"
                                            style={{
                                                fontSize: '14px', flexShrink: 0,
                                                color: isCurrent ? 'var(--primary-container)' : 'var(--on-surface-variant)',
                                                opacity: isCurrent ? 0.9 : 0.4,
                                                fontVariationSettings: "'FILL' 1, 'wght' 300",
                                            }}
                                        >chat_bubble</span>

                                        
                                        <span style={{
                                            flex: 1, minWidth: 0,
                                            fontSize: '12.5px', fontWeight: isCurrent ? 600 : 400,
                                            fontFamily: 'Inter, sans-serif',
                                            color: isCurrent ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            paddingRight: isHov ? '24px' : '0',
                                            transition: 'padding 0.15s ease',
                                        }}>{s.title || 'New Chat'}</span>

                                        
                                        {isHov && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeleteId(s.id); }}
                                                style={{
                                                    position: 'absolute', right: '6px', top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    width: '22px', height: '22px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    borderRadius: '6px', border: 'none', cursor: 'pointer',
                                                    background: 'transparent', color: 'var(--on-surface-variant)',
                                                    opacity: 0.5, transition: 'all 0.15s ease',
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,80,80,0.15)'; e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.opacity = '1'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--on-surface-variant)'; e.currentTarget.style.opacity = '0.5'; }}
                                                title="Delete conversation"
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                 
                    {sessions.length > 12 && (
                        <button
                            onClick={() => window.dispatchEvent(new Event('echo-open-history'))}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: '5px', padding: '8px 10px', borderRadius: '10px', marginTop: '4px',
                                border: '1px solid var(--glass-border)', background: 'transparent',
                                cursor: 'pointer', fontSize: '11px', fontWeight: 700, fontFamily: 'Inter, sans-serif',
                                color: 'var(--on-surface-variant)', opacity: 0.6, transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--surface-container-low)'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'transparent'; }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>history</span>
                            See all {sessions.length} sessions
                        </button>
                    )}
                </div>
            </div>

        
            <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden rounded-[1.75rem] relative pb-[72px]">
              
                {!isEmptyState && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" style={{ opacity: 0.15 }}>
                        <ZenBot state={zenBotState} isLight={isLight} size="xl" showFace={true} />
                    </div>
                )}


                <div className="flex-shrink-0 px-8 py-5 flex items-center justify-between z-[100] relative bg-transparent border-b border-white/[0.02]">
                    <div className="flex items-center gap-3" style={{ maxWidth: '55%' }}>
                        {isEmptyState && <img src="/logo-light.png" alt="ECHO" className="w-12 h-12 object-contain opacity-85" />}
                        <h1 className="font-headline font-bold tracking-wide text-primary m-0" style={{
                            fontSize: !isEmptyState && currentSessionTitle ? '15px' : '19px',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            transition: 'font-size 0.3s ease',
                        }}>
                            {!isEmptyState && currentSessionTitle ? currentSessionTitle : 'ECHO AI'}
                        </h1>
                    </div>

                 
                    {showUserMenu && (
                        <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    )}

                 
                    <div className="relative z-50 animate-float-up delay-1">
                        <div className="flex items-center gap-3">
                          
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="w-12 h-12 rounded-full overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105 focus:outline-none"
                                style={{ border: '2px solid var(--glass-border-hover)', background: 'var(--surface-container)', boxShadow: '0 0 20px var(--glow-primary)' }}
                            >
                                {currentUser?.photoURL ? (
                                    <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-headline font-bold text-lg" style={{ background: 'var(--primary-container)', color: 'var(--on-primary)' }}>
                                        {userInitial}
                                    </div>
                                )}
                            </button>
                        </div> 

                        {showUserMenu && (
                            <div className="absolute top-14 right-0 w-48 rounded-2xl border border-[var(--glass-border)] p-2 animate-float-up flex flex-col gap-1 z-50"
                                style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(30px)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                                <button onClick={() => { setShowUserMenu(false); window.dispatchEvent(new Event('echo-open-panic')); }}
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

              
                {isEmptyState ? (
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6">
                        <div className="w-full max-w-2xl flex flex-col items-center text-center gap-6">

                            <ZenBot state={zenBotState} isLight={isLight} size="xl" />

                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-primary text-glow mb-2 tracking-wide font-headline m-0">
                                    {userData?.name
                                        ? `Welcome back ${userData.name}`
                                        : 'Welcome'}
                                </h1>
                                <p className="text-on-surface-variant text-sm md:text-base max-w-md mx-auto m-0" style={{ fontFamily: 'Inter, sans-serif' }}>
                                    {userData?.name
                                        ? 'How have you been since your last session?'
                                        : "I'm Echo. A safe space to talk, reflect, and grow."}
                                </p>
                            </div>

                            <form onSubmit={handleSend} className="group w-full relative">
                                <div className="input-shelf relative flex items-center gap-3 px-6 py-5 rounded-[1.5rem] border transition-all duration-500 bg-surface-container-low/90 backdrop-blur-[40px] border-primary-container/30 shadow-[0_8px_24px_-12px_rgba(0,137,123,0.08)]">
                                    <input
                                        className="flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/40 text-base font-light"
                                        style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px' }}
                                        placeholder={loading ? 'Typing...' : 'Chat With Echo AI...'}
                                        disabled={loading}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        autoComplete="off"
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading || !input.trim()}
                                        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all duration-300 btn-primary-glow text-on-primary"
                                    >
                                        <span className="material-symbols-outlined text-[18px] font-bold" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>arrow_upward</span>
                                    </button>
                                </div>
                            </form>

                          
                            {sessions.length > 0 && (
                                <button
                                    onClick={() => window.dispatchEvent(new Event('echo-open-history'))}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        background: 'transparent', border: 'none', cursor: 'pointer',
                                        fontSize: '12px', fontFamily: 'Inter, sans-serif', fontWeight: 600,
                                        color: 'var(--on-surface-variant)', opacity: 0.45,
                                        transition: 'opacity 0.2s ease', letterSpacing: '0.01em',
                                        alignSelf: 'center', margin: '0 auto',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '0.45'}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 0, 'wght' 300" }}>history</span>
                                    Continue a past Session
                                </button>
                            )}

                        </div>
                    </div>
                ) : (
                    <>
                      
                        <div
                            ref={scrollRef}
                            className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 py-6 flex flex-col gap-6 z-10"
                        >
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex items-end gap-3 fade-in-snappy ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.sender === 'ai' && (
                                        <div className="w-7 h-7 rounded-full bg-primary-container/10 border border-primary-container/20 flex items-center justify-center flex-shrink-0 mb-1 overflow-hidden p-1">
                                            <img src="/logo-light.png" alt="ECHO" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                    <div className={`max-w-[75%] flex flex-col gap-1.5 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`px-5 py-4 rounded-[1.5rem] ${msg.sender === 'ai' ? 'glass-panel rounded-tl-md border-l-2 border-l-primary-container/40 shadow-sm' : 'bg-primary-container text-on-primary rounded-tr-md shadow-sm'}`}>
                                            <p className={`text-[14px] leading-relaxed font-light m-0 whitespace-pre-wrap ${msg.sender === 'ai' ? 'text-on-surface' : 'text-on-primary'}`} style={{ fontFamily: 'Inter, sans-serif' }}>
                                                {msg.text}
                                            </p>
                                        </div>
                                        <div className={`flex items-center gap-2 px-2 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                                            <span className="text-[9px] font-black tracking-[0.3em] uppercase opacity-40 text-on-surface-variant">
                                                {msg.sender === 'ai' ? 'ECHO AI' : 'YOU'} · {formatMsgTime(msg.timestamp) || '·'}
                                            </span>
                                            {msg.sender === 'ai' && msg.id && msg.id !== 'welcome' && (
                                                <div className="flex gap-1">
                                                    <button onClick={() => setFeedback(msg.id, msg.feedback === 'up' ? null : 'up')} className={`p-1 rounded-lg border-none cursor-pointer bg-transparent ${msg.feedback === 'up' ? 'text-primary-container' : 'text-on-surface-variant/40'}`}>
                                                        <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                                                    </button>
                                                    <button onClick={() => setFeedback(msg.id, msg.feedback === 'down' ? null : 'down')} className={`p-1 rounded-lg border-none cursor-pointer bg-transparent ${msg.feedback === 'down' ? 'text-error' : 'text-on-surface-variant/40'}`}>
                                                        <span className="material-symbols-outlined text-[16px]">thumb_down</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {loading && (
                                <div className="flex items-end gap-3 justify-start fade-in-snappy">
                                    <div className="w-7 h-7 rounded-full bg-primary-container/10 border border-primary-container/20 flex items-center justify-center flex-shrink-0 overflow-hidden p-1">
                                        <img src="/logo-light.png" alt="ECHO" className="w-full h-full object-contain" />
                                    </div>
                                    <div className="glass-panel px-6 py-4 rounded-[1.5rem] rounded-tl-md border-l-2 border-l-primary-container/20 flex gap-2 items-center shadow-sm">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-container/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-container/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-container/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        
                        <div className="flex-shrink-0 px-4 pb-1 pt-2 z-10">
                            <form onSubmit={handleSend} className="group w-full relative">
                                <div className="input-shelf relative flex items-center gap-3 px-5 py-3 rounded-[1.5rem] border transition-all duration-500 bg-surface-container-low/90 backdrop-blur-[40px] border-white/[0.08] shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.15)]">
                                    <input
                                        className="flex-1 bg-transparent border-none outline-none text-on-surface placeholder:text-on-surface-variant/40 text-base font-light"
                                        style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px' }}
                                        placeholder={loading ? 'Typing...' : 'Chat with Echo AI...'}
                                        disabled={loading}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        autoComplete="off"
                                    />
                                    <button
                                        type="submit"
                                        disabled={loading || !input.trim()}
                                        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all duration-300 bg-primary-container/10 text-primary-container hover:bg-primary-container hover:text-on-primary"
                                    >
                                        <span className="material-symbols-outlined text-[18px] font-bold" style={{ fontVariationSettings: "'FILL' 1, 'wght' 600" }}>arrow_upward</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                )}
            </div>

        
            {isEmptyState && (
                <p className="fixed bottom-[4px] left-1/2 -translate-x-1/2 text-center text-[8.5px] uppercase tracking-[0.4em] text-on-surface-variant/50 font-black m-0 z-50 pointer-events-none" style={{ fontFamily: 'Inter, sans-serif', width: 'max-content' }}>
                    © 2026 ECHO AI All rights reserved.
                </p>
            )}

           
            {deleteId && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in-snappy">
                    <div className="glass-panel max-w-sm w-full p-6 rounded-3xl border border-white/[0.05] shadow-2xl">
                        <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mb-4 mx-auto">
                            <span className="material-symbols-outlined text-error text-2xl">warning</span>
                        </div>
                        <h3 className="text-xl font-bold text-on-surface text-center m-0 mb-2">Delete Chat</h3>
                        <p className="text-sm text-on-surface-variant text-center m-0 mb-6">Are you sure you want to permanently delete this session? This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl border border-white/[0.1] bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold cursor-pointer transition-colors">Cancel</button>
                            <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl border-none bg-error text-white font-semibold cursor-pointer hover:bg-error/90 hover:shadow-lg transition-all active:scale-[0.98]">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
