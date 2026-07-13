import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { deleteSessionDeep } from '../utils/firestoreCleanup';
import { useAuth } from '../context/AuthContext';


function formatRelativeTime(ts) {
    if (!ts?.toDate) return '—';
    const d = ts.toDate();
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString(undefined, {
        month: 'short', day: 'numeric',
        year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
}

function formatFullDate(ts) {
    if (!ts?.toDate) return '—';
    return ts.toDate().toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}


export default function SessionHistory() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    const [open, setOpen]         = useState(false);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading]   = useState(true);
    const [search, setSearch]     = useState('');
    const [deleteId, setDeleteId] = useState(null);
    const [hoveredId, setHoveredId] = useState(null);
    const [sortBy, setSortBy]     = useState('recent');

    
    useEffect(() => {
        const openOverlay = () => setOpen(true);
        window.addEventListener('echo-open-history', openOverlay);
        return () => window.removeEventListener('echo-open-history', openOverlay);
    }, []);

    
    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open]);

    
    useEffect(() => {
        if (!currentUser) return;
        const q = query(
            collection(db, 'users', currentUser.uid, 'sessions'),
            orderBy('updatedAt', 'desc')
        );
        const unsub = onSnapshot(q, (snap) => {
            setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, () => setLoading(false));
        return () => unsub();
    }, [currentUser]);

   
    const filtered = useMemo(() => {
        let list = [...sessions];
        const t = search.trim().toLowerCase();
        if (t) list = list.filter((s) => (s.title || '').toLowerCase().includes(t));
        if (sortBy === 'oldest') list = list.reverse();
        return list;
    }, [sessions, search, sortBy]);

   
    const grouped = useMemo(() => {
        if (search.trim()) {
            return filtered.length
                ? [{ label: `Results for "${search.trim()}"`, items: filtered }]
                : [];
        }
        const now = new Date();
        const todayStr = now.toDateString();
        const yesterdayStr = new Date(now - 86400000).toDateString();
        const sevenAgo = new Date(now - 7 * 86400000);
        const thirtyAgo = new Date(now - 30 * 86400000);
        const buckets = { today: [], yesterday: [], week: [], month: [], older: [] };
        filtered.forEach((s) => {
            const d = s.updatedAt?.toDate ? s.updatedAt.toDate() : new Date(0);
            if (d.toDateString() === todayStr) buckets.today.push(s);
            else if (d.toDateString() === yesterdayStr) buckets.yesterday.push(s);
            else if (d >= sevenAgo) buckets.week.push(s);
            else if (d >= thirtyAgo) buckets.month.push(s);
            else buckets.older.push(s);
        });
        const groups = [];
        if (buckets.today.length)     groups.push({ label: 'Today',            items: buckets.today });
        if (buckets.yesterday.length) groups.push({ label: 'Yesterday',        items: buckets.yesterday });
        if (buckets.week.length)      groups.push({ label: 'Previous 7 days',  items: buckets.week });
        if (buckets.month.length)     groups.push({ label: 'This month',        items: buckets.month });
        if (buckets.older.length)     groups.push({ label: 'Older',            items: buckets.older });
        return groups;
    }, [filtered, search]);

    const confirmDelete = async () => {
        if (!currentUser || !deleteId) return;
        await deleteSessionDeep(db, currentUser.uid, deleteId);
        setDeleteId(null);
    };

    const handleClose = () => { setOpen(false); setSearch(''); };

    if (!open) return null;

    return (
       
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                padding: '24px',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
           
            <div
                className="animate-scale-in"
                style={{
                    width: 'min(680px, 100%)', maxHeight: '85vh',
                    borderRadius: 28,
                    background: 'var(--surface)',
                    border: '1px solid var(--glass-border-hover)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
               
                <div style={{ flexShrink: 0, padding: '28px 28px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                        <div>
                            <h1 style={styles.pageTitle}>Chat History</h1>
                            <p style={styles.pageSubtitle}>
                                {sessions.length > 0
                                    ? `${sessions.length} Session${sessions.length !== 1 ? 's' : ''}`
                                    : 'Your Chat sessions will appear here'}
                            </p>
                        </div>
                       
                        <button
                            onClick={handleClose}
                            style={styles.closeBtn}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-container)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            aria-label="Close"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                        </button>
                    </div>

                   
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 18 }}>
                        <SearchBar value={search} onChange={setSearch} />
                        <button
                            onClick={() => setSortBy(s => s === 'recent' ? 'oldest' : 'recent')}
                            style={styles.sortBtn}
                            title={sortBy === 'recent' ? 'Showing newest first' : 'Showing oldest first'}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--glass-border-hover)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px', fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
                                {sortBy === 'recent' ? 'arrow_downward' : 'arrow_upward'}
                            </span>
                            {sortBy === 'recent' ? 'Newest' : 'Oldest'}
                        </button>
                    </div>
                </div>

             
                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 28px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        
                        {loading && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="skeleton"
                                        style={{ height: '64px', borderRadius: '14px', animationDelay: `${i * 0.07}s` }} />
                                ))}
                            </div>
                        )}

                        
                        {!loading && filtered.length === 0 && (
                            <EmptyState search={search} onNewChat={() => { handleClose(); navigate('/chat'); }} />
                        )}

                       
                        {!loading && grouped.map((group, gi) => (
                            <div key={group.label} className="animate-float-up"
                                style={{ animationDelay: `${gi * 0.07}s`, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <p style={styles.groupLabel}>{group.label}</p>
                                {group.items.map((s) => (
                                    <SessionRow
                                        key={s.id}
                                        session={s}
                                        isHovered={hoveredId === s.id}
                                        onHover={() => setHoveredId(s.id)}
                                        onLeave={() => setHoveredId(null)}
                                        onOpen={() => { handleClose(); navigate(`/chat?session=${encodeURIComponent(s.id)}`); }}
                                        onDelete={() => setDeleteId(s.id)}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

          
            {deleteId && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in-snappy">
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



function SearchBar({ value, onChange }) {
    return (
        <div style={{ position: 'relative', flex: 1 }}>
            <span className="material-symbols-outlined" style={styles.searchIcon}>search</span>
            <input
                id="history-search-input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search sessions..."
                style={styles.searchInput}
                onFocus={e => { e.target.style.borderColor = 'var(--glass-border-hover)'; e.target.style.boxShadow = '0 0 0 3px var(--glow-primary)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; e.target.style.boxShadow = 'none'; }}
            />
            {value && (
                <button onClick={() => onChange('')} style={styles.searchClear} aria-label="Clear search">
                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>close</span>
                </button>
            )}
        </div>
    );
}

function SessionRow({ session: s, isHovered, onHover, onLeave, onOpen, onDelete }) {
    return (
        <div
            role="button" tabIndex={0}
            aria-label={`Open conversation: ${s.title || 'New Chat'}`}
            onClick={onOpen}
            onKeyDown={e => e.key === 'Enter' && onOpen()}
            onMouseEnter={onHover} onMouseLeave={onLeave}
            style={{
                ...styles.sessionRow,
                background: isHovered ? 'var(--surface-container-low)' : 'transparent',
                borderColor: isHovered ? 'var(--glass-border-hover)' : 'transparent',
            }}
        >
            <div style={{ ...styles.sessionIcon, background: isHovered ? 'var(--surface-container)' : 'var(--surface-container-low)' }}>
                <span className="material-symbols-outlined"
                    style={{ fontSize: '15px', color: 'var(--primary-container)', fontVariationSettings: "'FILL' 1, 'wght' 300" }}>
                    chat_bubble
                </span>
            </div>
            <div style={styles.sessionText}>
                <p style={styles.sessionTitle}>{s.title || 'New Chat'}</p>
                <p style={styles.sessionMeta}>
                    {formatRelativeTime(s.updatedAt)}
                    <span style={{ opacity: 0.4, margin: '0 5px' }}>·</span>
                    <span title={formatFullDate(s.updatedAt)}>{formatFullDate(s.updatedAt)}</span>
                </p>
            </div>
            <div style={{ ...styles.sessionActions, opacity: isHovered ? 1 : 0, transform: isHovered ? 'translateX(0)' : 'translateX(8px)' }}>
                <ActionBtn icon="open_in_full" label="Open" onClick={(e) => { e.stopPropagation(); onOpen(); }} variant="open" />
                <ActionBtn icon="delete" label="Delete" onClick={(e) => { e.stopPropagation(); onDelete(); }} variant="delete" />
            </div>
            <span className="material-symbols-outlined" style={{
                fontSize: '16px', color: 'var(--primary-container)',
                opacity: isHovered ? 0.4 : 0, transition: 'opacity 0.2s ease',
                flexShrink: 0, fontVariationSettings: "'FILL' 0, 'wght' 200",
            }}>chevron_right</span>
        </div>
    );
}

function ActionBtn({ icon, label, onClick, variant }) {
    const [hovered, setHovered] = useState(false);
    const isDelete = variant === 'delete';
    return (
        <button onClick={onClick} aria-label={label} title={label}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: isDelete ? '6px' : '5px 10px', borderRadius: '8px',
                border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700,
                fontFamily: 'Inter, sans-serif', transition: 'all 0.15s ease',
                background: isDelete ? (hovered ? 'rgba(255,80,80,0.15)' : 'transparent') : (hovered ? 'var(--surface-container-high)' : 'var(--surface-container)'),
                color: isDelete ? (hovered ? 'var(--error)' : 'var(--on-surface-variant)') : 'var(--primary-container)',
            }}>
            <span className="material-symbols-outlined" style={{ fontSize: '13px', fontVariationSettings: "'FILL' 0, 'wght' 300" }}>{icon}</span>
            {!isDelete && label}
        </button>
    );
}

function EmptyState({ search, onNewChat }) {
    return (
        <div className="animate-float-up" style={styles.emptyState}>
            <div style={styles.emptyIcon}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--primary-container)', opacity: 0.55 }}>
                    {search ? 'manage_search' : 'forum'}
                </span>
            </div>
            <p style={styles.emptyTitle}>{search ? 'No results found' : 'No Chat sessions yet'}</p>
            <p style={styles.emptySubtitle}>
                {search ? `No chats match "${search}"` : 'Your sessions will appear here once you start chatting'}
            </p>
            {!search && (
                <button onClick={onNewChat} style={styles.emptyBtn}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                    Start your first Chat
                </button>
            )}
        </div>
    );
}


const styles = {
    pageTitle: {
        margin: 0, fontSize: '22px', fontWeight: 700,
        fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)', lineHeight: 1.2,
    },
    pageSubtitle: {
        margin: '4px 0 0', fontSize: '12.5px', fontFamily: 'Inter, sans-serif',
        color: 'var(--on-surface-variant)', opacity: 0.6,
    },
    closeBtn: {
        width: 32, height: 32, borderRadius: '10px', border: '1px solid var(--glass-border)',
        background: 'transparent', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: 'var(--on-surface-variant)', transition: 'all 0.2s ease',
    },
    sortBtn: {
        display: 'flex', alignItems: 'center', gap: '5px', padding: '9px 14px',
        borderRadius: '12px', border: '1px solid var(--glass-border)', cursor: 'pointer',
        fontSize: '11.5px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
        background: 'var(--glass-bg)', backdropFilter: 'blur(20px)',
        color: 'var(--on-surface-variant)', transition: 'border-color 0.2s ease',
        flexShrink: 0, whiteSpace: 'nowrap',
    },
    searchIcon: {
        position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
        fontSize: '16px', color: 'var(--on-surface-variant)', opacity: 0.4, pointerEvents: 'none',
    },
    searchInput: {
        width: '100%', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)', borderRadius: '12px',
        padding: '10px 36px 10px 38px', fontSize: '13px', fontFamily: 'Inter, sans-serif',
        color: 'var(--on-surface)', outline: 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease', boxSizing: 'border-box',
    },
    searchClear: {
        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
        width: '20px', height: '20px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)',
    },
    groupLabel: {
        margin: '0 0 4px', padding: '4px 8px', fontSize: '10px', fontWeight: 900,
        textTransform: 'uppercase', letterSpacing: '0.18em', fontFamily: 'Inter, sans-serif',
        color: 'var(--on-surface-variant)', opacity: 0.45, userSelect: 'none',
    },
    sessionRow: {
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
        borderRadius: '12px', border: '1px solid transparent', cursor: 'pointer',
        transition: 'background 0.18s ease, border-color 0.18s ease', outline: 'none', userSelect: 'none',
    },
    sessionIcon: {
        width: '34px', height: '34px', borderRadius: '10px', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.18s ease',
    },
    sessionText: { flex: 1, minWidth: 0 },
    sessionTitle: {
        margin: 0, fontSize: '13.5px', fontWeight: 600, fontFamily: 'Inter, sans-serif',
        color: 'var(--on-surface)', lineHeight: 1.35,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    },
    sessionMeta: {
        margin: '2px 0 0', fontSize: '11px', fontFamily: 'Inter, sans-serif',
        color: 'var(--on-surface-variant)', opacity: 0.5,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    },
    sessionActions: {
        display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0,
        transition: 'opacity 0.2s ease, transform 0.2s ease',
    },
    emptyState: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', gap: '12px', padding: '60px 24px',
    },
    emptyIcon: {
        width: '58px', height: '58px', borderRadius: '18px', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--surface-container)', marginBottom: '4px',
    },
    emptyTitle: { margin: 0, fontSize: '15px', fontWeight: 600, fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' },
    emptySubtitle: { margin: 0, fontSize: '13px', fontFamily: 'Inter, sans-serif', color: 'var(--on-surface-variant)', opacity: 0.6, maxWidth: '300px' },
    emptyBtn: {
        marginTop: '8px', padding: '10px 20px', borderRadius: '12px', border: 'none',
        cursor: 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: 'Inter, sans-serif',
        background: 'linear-gradient(135deg, var(--primary-container), var(--primary-fixed-dim))',
        color: 'var(--on-primary)', boxShadow: '0 4px 20px var(--glow-primary)', transition: 'transform 0.2s ease',
    },
};
