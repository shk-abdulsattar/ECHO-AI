import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const TABS = [
    { id: 'account', label: 'Account' },
    { id: 'personalization', label: 'Personalization' },
    { id: 'emergency', label: 'Emergency Contacts' },
    { id: 'security', label: 'Security' },
];
const GOAL_OPTIONS = ['Stress', 'Anxiety', 'Sleep', 'Anger', 'Grief'];
const TONES = [
    { t: 'Friendly', icon: 'sentiment_satisfied', desc: 'Warm, casual, and supportive' },
    { t: 'Professional', icon: 'psychology', desc: 'Structured, clinical, evidence-based' },
    { t: 'Motivational', icon: 'local_fire_department', desc: 'Energetic, uplifting, action-oriented' },
];


function SettingDialog({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)' }}>
            <div className="animate-scale-in overflow-hidden" style={{ width: '100%', maxWidth: 440, padding: '28px 28px 24px', borderRadius: 28, position: 'relative', background: 'var(--surface-container-low)', border: '1px solid var(--glass-border)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
              
                <div style={{ position: 'absolute', top: '-20%', left: '-20%', width: '100%', height: '80%', borderRadius: '50%', background: 'radial-gradient(circle, var(--glow-secondary) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', opacity: 0.5 }} />
                <div style={{ position: 'absolute', bottom: '-20%', right: '-20%', width: '100%', height: '80%', borderRadius: '50%', background: 'radial-gradient(circle, var(--glow-primary) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none', opacity: 0.5 }} />

                <div className="relative z-10">
                    <button onClick={onClose} style={{ position: 'absolute', top: -8, right: -8, background: 'transparent', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', display: 'flex' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span>
                    </button>
                    <h3 style={{ margin: '0 0 24px', fontSize: 22, fontFamily: 'Manrope,sans-serif', color: 'var(--on-surface)' }}>{title}</h3>
                    {children}
                </div>
            </div>
        </div>
    );
}


function EditRow({ label, value, onClick, subText }) {
    return (
        <div onClick={onClick} style={{ borderBottom: '1px solid var(--glass-border)', cursor: onClick ? 'pointer' : 'default' }}
            className="flex items-center justify-between py-5 px-3 transition-all duration-200 hover:bg-[var(--surface-container-low)] rounded-xl">
            <div className="flex flex-col">
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface-variant)' }}>{label}</span>
                {subText && <span style={{ fontSize: 12, color: 'var(--on-surface-variant)', opacity: 0.8, marginTop: 4 }}>{subText}</span>}
            </div>
            <div className="flex items-center gap-3">
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--on-surface)', maxWidth: 220, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
                {onClick && <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--on-surface-variant)' }}>chevron_right</span>}
            </div>
        </div>
    );
}

function InlineInputRow({ label, value, type = 'text', onSave, placeholder = '' }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editVal, setEditVal] = useState('');

    useEffect(() => {
        if (!isEditing) setEditVal(value);
    }, [value, isEditing]);

    const handleSave = () => {
        if (editVal !== value) onSave(editVal);
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setEditVal(value);
            setIsEditing(false);
        }
    };

    return (
        <div style={{ borderBottom: '1px solid var(--glass-border)' }}
            className="flex items-center justify-between py-5 px-3 transition-all duration-200 hover:bg-[var(--surface-container-low)] rounded-xl group min-h-[72px]">
            <div className="flex flex-col flex-1 mr-4 justify-center">
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface-variant)', marginBottom: isEditing ? 8 : 4 }}>{label}</span>
                {isEditing ? (
                    <input
                        autoFocus
                        type={type}
                        value={editVal}
                        onChange={e => setEditVal(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleSave}
                        placeholder={placeholder}
                        className="w-full bg-transparent border-b outline-none text-[15px] font-bold pb-1"
                        style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
                    />
                ) : (
                    <span
                        onClick={() => setIsEditing(true)}
                        className="cursor-pointer transition-colors hover:text-[var(--primary)]"
                        style={{ fontSize: 15, fontWeight: 700, color: 'var(--on-surface)' }}
                    >
                        {value || '—'}
                    </span>
                )}
            </div>
            {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: 20, color: 'var(--on-surface-variant)', background: 'transparent', border: 'none', cursor: 'pointer' }}>edit</button>
            )}
        </div>
    );
}

export default function Profile() {
    const { userData, currentUser, updateProfile, deleteAccount, resetPassword, logout } = useAuth();
    const navigate = useNavigate();

    const [activeSection, setActiveSection] = useState('account');
    const [saving, setSaving] = useState(false);
    const [confirmDel, setConfirmDel] = useState(false);
    const [delPw, setDelPw] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [resetLoad, setResetLoad] = useState(false);
    const [toast, setToast] = useState(null);
    const scrollRafRef = useRef(null);

   
    const [dialogOpen, setDialogOpen] = useState(null); 
   
    const [editGoals, setEditGoals] = useState([]);
    const [editTone, setEditTone] = useState('Friendly');
    const [editC1, setEditC1] = useState({ name: '', phone: '' });
    const [editC2, setEditC2] = useState({ name: '', phone: '' });

    const currentTheme = userData?.theme || localStorage.getItem('echo-theme') || 'dark';
    const isLight = currentTheme === 'light';

    useEffect(() => {
        if (!userData) return;
        setEditTone(userData.tone || 'Friendly');
        const ec = userData.emergencyContacts || [];
        setEditC1(ec[0] || { name: '', phone: '' });
        setEditC2(ec[1] || { name: '', phone: '' });
    }, [userData, dialogOpen]); 

    const flash = (text, type = 'ok') => { setToast({ text, type }); setTimeout(() => setToast(null), 3000); };

    const save = async (patch, msg) => {
        setSaving(true);
        try { await updateProfile(patch); flash(msg); setDialogOpen(null); }
        catch (e) { flash(e.message || 'Save failed', 'err'); }
        finally { setSaving(false); }
    };

    const openDialog = (field) => {
        setDialogOpen(field);
        if (field === 'goals') setEditGoals(Array.isArray(userData?.goals) ? userData.goals : []);
        if (field === 'tone') setEditTone(userData?.tone || 'Friendly');
    };

    const saveContacts = async () => {
        setSaving(true);
        try {
            const re = /^\+?[\d\s\-()]+$/;
            const ec = [editC1, editC2].filter(c => c.name && c.phone && re.test(c.phone));
            await updateProfile({ emergencyContacts: ec });
            flash('Emergency contacts updated.');
            setDialogOpen(null);
        } catch (e) { flash(e.message || 'Save failed', 'err'); }
        finally { setSaving(false); }
    };

    const handleReset = async () => {
        setResetLoad(true);
        try { await resetPassword(currentUser.email); setResetSent(true); flash('Reset email sent.'); }
        catch (e) { flash(e.message || 'Reset failed', 'err'); }
        finally { setResetLoad(false); }
    };

    const onDelete = async () => {
        if (!delPw.trim()) return;
        setDeleting(true);
        try { await deleteAccount(delPw); navigate('/'); }
        catch (e) {
            const c = e?.code || '';
            flash(c === 'auth/wrong-password' || c === 'auth/invalid-credential' ? 'Incorrect password.'
                : c === 'auth/too-many-requests' ? 'Too many attempts. Try again later.'
                    : e.message || 'Delete failed', 'err');
            setConfirmDel(false);
        } finally { setDeleting(false); setDelPw(''); }
    };

    const doLogout = async () => {
        await logout();
        navigate('/login');
    };

    const toggleTheme = async () => {
        const next = isLight ? 'dark' : 'light';
        if (next === 'light') document.documentElement.classList.add('light');
        else document.documentElement.classList.remove('light');

        localStorage.setItem('echo-theme', next);
        try { await updateProfile({ theme: next }); } catch { /* ignore */ }
    };



    const guideSteps = [
        !!userData?.isOnboarded,
        !!userData?.tone,
        (userData?.emergencyContacts || []).length > 0,
    ];
    const allDone = guideSteps.every(Boolean);

    const scrollToSection = (id) => {
        const el = document.getElementById(`section-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleScroll = useCallback((e) => {
        
        if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
        const target = e.target;
        scrollRafRef.current = requestAnimationFrame(() => {
            scrollRafRef.current = null;
            const containerTop = target.getBoundingClientRect().top;
            let current = 'account';
            for (const { id } of TABS) {
                const el = document.getElementById(`section-${id}`);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (rect.top <= containerTop + 150) current = id;
                }
            }
         
            setActiveSection(prev => prev === current ? prev : current);
        });
    }, []);

    const initials = (userData?.name || 'S').charAt(0).toUpperCase();

    return (
        <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', background: 'transparent', padding: 8 }}>
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', borderRadius: 16, background: 'transparent', backdropFilter: 'blur(3px)', border: '0.4px solid var(--glass-border-hover)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>

               
                {toast && (
                    <div className="animate-float-up" style={{
                        position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 600,
                        padding: '12px 24px', borderRadius: 16, fontSize: 13, fontWeight: 700, backdropFilter: 'blur(20px)',
                        background: toast.type === 'err' ? 'rgba(255,100,100,.12)' : 'rgba(0,229,204,.10)',
                        border: `1px solid ${toast.type === 'err' ? 'rgba(255,100,100,.35)' : 'var(--glass-border-hover)'}`,
                        color: toast.type === 'err' ? 'var(--error)' : 'var(--primary-container)',
                    }}>{toast.text}</div>
                )}

                
                <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '80px 24px 48px', overflowY: 'auto', background: 'var(--surface)', borderRight: '1px solid var(--glass-border)' }}>
                    <div className="flex items-center gap-3 mb-11 ml-2">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex-shrink-0 flex items-center justify-center w-8 h-8 cursor-pointer transition-colors duration-200"
                            style={{ 
                                background: 'transparent', 
                                border: '1px solid var(--glass-border)',
                                borderRadius: '10px',
                                color: 'var(--on-surface-variant)',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'var(--surface-container)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
                        </button>
                        <p style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Manrope,sans-serif', color: 'var(--on-surface)', margin: 0, lineHeight: 1.1 }}>Settings</p>
                    </div>

                    <div style={{ flex: 1 }}>
                        {TABS.map(({ id, label }) => {
                            const active = activeSection === id;
                            return (
                                <button key={id} onClick={() => scrollToSection(id)} style={{
                                    display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: 12,
                                    border: 'none', cursor: 'pointer', marginBottom: 4, transition: 'all .2s',
                                    borderLeft: `3px solid ${active ? 'var(--primary-container)' : 'transparent'}`,
                                    background: active ? 'var(--surface-container)' : 'transparent',
                                    color: active ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                                    fontWeight: active ? 600 : 400, fontSize: 15, fontFamily: 'Inter,sans-serif',
                                }}>{label}</button>
                            );
                        })}
                    </div>

                    <div style={{ marginTop: 'auto', marginBottom: 24 }}>
                        <button onClick={doLogout} style={{
                            display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: 12,
                            border: 'none', cursor: 'pointer', transition: 'all .2s',
                            background: 'transparent', color: 'var(--error)', fontWeight: 600, fontSize: 15, fontFamily: 'Inter,sans-serif',
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
                            Logout
                        </button>
                    </div>
                </div>

                
                <div onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '0 72px', minWidth: 0, scrollPaddingTop: '48px' }} className="custom-scrollbar">

                    <div style={{ paddingTop: 48, paddingBottom: '50vh' }}>

                      
                        <div id="section-account" style={{ paddingBottom: 60 }}>
                            <p style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Manrope,sans-serif', color: 'var(--on-surface)', margin: '0 0 36px' }}>Account Settings</p>

                         
                            <div style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: 24, marginBottom: 12 }}
                                className="flex items-center justify-between px-3">
                                <div>
                                    <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--on-surface)', margin: '0 0 4px' }}>Profile Avatar</p>
                                    <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', margin: 0 }}>This is how you appear.</p>
                                </div>
                                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--primary-container)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, boxShadow: '0 8px 24px var(--glow-primary)' }}>
                                    {initials}
                                </div>
                            </div>

                            <InlineInputRow
                                label="Name"
                                value={userData?.name || ''}
                                placeholder="Enter your name"
                                onSave={val => save({ name: val.trim() }, 'Name updated.')}
                            />
                            <InlineInputRow
                                label="Age"
                                value={userData?.age ? String(userData.age) : ''}
                                type="number"
                                placeholder="Enter your age"
                                onSave={val => { const n = parseInt(val, 10); save({ age: isNaN(n) ? '' : n }, 'Age updated.'); }}
                            />
                            <EditRow label="Focus Areas" value={(userData?.goals || []).join(', ') || '—'} onClick={() => openDialog('goals')} subText="Your primary goals for ECHO AI" />
                            <EditRow label="Email" value={currentUser?.email || '—'} onClick={null} subText="Linked sign-in email" />
                        </div>

                       
                        <div id="section-personalization" style={{ paddingBottom: 60 }}>
                            <p style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Manrope,sans-serif', color: 'var(--on-surface)', margin: '0 0 36px' }}>Personalization</p>

                            <EditRow label="AI Tone" value={userData?.tone || 'Friendly'} onClick={() => openDialog('tone')} subText="How the AI responds to you" />

                            <div className="flex items-center justify-between py-5 px-3 rounded-xl border-b border-[var(--glass-border)] hover:bg-[var(--surface-container-low)] transition-all cursor-pointer" onClick={toggleTheme}>
                                <div className="flex flex-col">
                                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface-variant)' }}>Theme</span>
                                    <span style={{ fontSize: 12, color: 'var(--on-surface-variant)', opacity: 0.8, marginTop: 4 }}>Toggle dark and light mode</span>
                                </div>

                                
                                <div style={{
                                    width: 56, height: 32, borderRadius: 32, background: isLight ? 'var(--surface-container-high)' : 'var(--primary-container)',
                                    display: 'flex', alignItems: 'center', position: 'relative', border: '1px solid var(--glass-border)',
                                    transition: 'background 0.3s', boxShadow: isLight ? 'none' : '0 0 15px var(--glow-primary)'
                                }}>
                                    <div style={{
                                        position: 'absolute', left: isLight ? 26 : 4, width: 24, height: 24, borderRadius: '50%',
                                        background: isLight ? '#fff' : 'var(--surface-container-highest)',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: isLight ? '#f59e0b' : '#38bdf8' }}>
                                            {isLight ? 'light_mode' : 'dark_mode'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="section-emergency" style={{ paddingBottom: 60 }}>
                            <p style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Manrope,sans-serif', color: 'var(--on-surface)', margin: '0 0 36px' }}>Emergency Contacts</p>
                            <EditRow
                                label="Emergency Contacts"
                                value={`${(userData?.emergencyContacts || []).length} Set`}
                                onClick={() => openDialog('emergency')}
                                subText="Emergency Contacts shown during a Panic situations."
                            />
                        </div>

                     
                        <div id="section-security" style={{ paddingBottom: 60 }}>
                            <p style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Manrope,sans-serif', color: 'var(--on-surface)', margin: '0 0 36px' }}>Security</p>

                            <div className="flex items-center justify-between py-5 px-3 rounded-xl border-b border-[var(--glass-border)] mb-4">
                                <div className="flex flex-col">
                                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface-variant)' }}>Password Reset</span>
                                    <span style={{ fontSize: 12, color: 'var(--on-surface-variant)', opacity: 0.8, marginTop: 4 }}>Send a reset link to your email</span>
                                </div>
                                <button onClick={handleReset} disabled={resetLoad || resetSent} style={{
                                    padding: '8px 20px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                                    cursor: 'pointer', background: 'transparent', transition: 'all .2s',
                                    border: `1px solid ${resetSent ? 'var(--primary-container)' : 'var(--secondary)'}`,
                                    color: resetSent ? 'var(--primary-container)' : 'var(--secondary)', opacity: (resetLoad || resetSent) ? 0.6 : 1,
                                }}>{resetSent ? '✓ Sent' : resetLoad ? 'Sending…' : 'Reset'}</button>
                            </div>

                            <div className="flex items-center justify-between py-5 px-3 rounded-xl border-b border-[rgba(255,100,100,0.2)] bg-[rgba(255,100,100,0.02)]">
                                <div className="flex flex-col">
                                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--error)' }}>Delete Account</span>
                                    <span style={{ fontSize: 12, color: 'var(--on-surface-variant)', opacity: 0.8, marginTop: 4 }}>Permanently erase all your data</span>
                                </div>
                                <button onClick={() => { setDelPw(''); setToast(null); setConfirmDel(true); }} style={{
                                    padding: '8px 20px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                                    cursor: 'pointer', background: 'var(--error)', border: 'none', color: '#fff', boxShadow: '0 4px 15px rgba(255,100,100,0.3)'
                                }}>Delete</button>
                            </div>
                        </div>

                    </div>
                </div>

               
                <SettingDialog isOpen={dialogOpen === 'goals'} onClose={() => setDialogOpen(null)} title="Focus Areas">
                    <p className="text-sm mb-6 text-center" style={{ color: 'var(--on-surface-variant)' }}>Select your focus areas</p>
                    <div className="flex flex-wrap gap-3 justify-center max-w-md mx-auto mb-8">
                        {GOAL_OPTIONS.map((g) => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => setEditGoals(p => p.includes(g) ? p.filter(x => x !== g) : [...p, g])}
                                className="px-6 py-3.5 rounded-full border-2 text-sm font-bold cursor-pointer transition-all duration-500"
                                style={{
                                    borderColor: editGoals.includes(g) ? 'var(--primary-container)' : 'var(--glass-border)',
                                    background: editGoals.includes(g) ? 'var(--glow-primary)' : 'transparent',
                                    color: editGoals.includes(g) ? 'var(--primary-container)' : 'var(--on-surface-variant)',
                                    boxShadow: editGoals.includes(g) ? '0 0 20px var(--glow-primary)' : 'none',
                                    transform: editGoals.includes(g) ? 'scale(1.05)' : 'scale(1)',
                                }}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => save({ goals: editGoals }, 'Focus areas updated.')} disabled={saving} className="btn-primary-glow" style={{ padding: '12px 24px', borderRadius: 999, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                </SettingDialog>

                
                <SettingDialog isOpen={dialogOpen === 'tone'} onClose={() => setDialogOpen(null)} title="AI Tone">
                    <div className="flex flex-col gap-3 max-w-sm mx-auto mb-8">
                        {TONES.map(({ t, icon, desc }) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setEditTone(t)}
                                className="glass-card p-5 flex items-center gap-4 text-left cursor-pointer transition-all duration-500"
                                style={{
                                    borderColor: editTone === t ? 'var(--glass-border-hover)' : 'var(--glass-border)',
                                    boxShadow: editTone === t ? '0 0 30px var(--glow-primary)' : 'none',
                                    transform: editTone === t ? 'scale(1.02)' : 'scale(1)',
                                }}
                            >
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{
                                        background: editTone === t ? 'var(--glow-primary)' : 'var(--surface-container-high)',
                                        border: `1px solid ${editTone === t ? 'var(--glass-border-hover)' : 'var(--glass-border)'}`,
                                    }}
                                >
                                    <span className="material-symbols-outlined text-xl" style={{ color: editTone === t ? 'var(--primary-container)' : 'var(--on-surface-variant)', fontVariationSettings: editTone === t ? "'FILL' 1" : "'FILL' 0" }}>
                                        {icon}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className="m-0 font-headline font-bold text-base" style={{ color: 'var(--primary)' }}>{t}</p>
                                    <p className="m-0 text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>{desc}</p>
                                </div>
                                {editTone === t && <span className="material-symbols-outlined text-xl" style={{ color: 'var(--primary-container)', filter: 'drop-shadow(0 0 8px var(--primary-container))' }}>check_circle</span>}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => save({ tone: editTone }, 'AI tone updated.')} disabled={saving} className="btn-primary-glow" style={{ padding: '12px 24px', borderRadius: 999, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save Changes'}</button>
                    </div>
                </SettingDialog>

              
                <SettingDialog isOpen={dialogOpen === 'emergency'} onClose={() => setDialogOpen(null)} title="Emergency Contacts">
                    <p className="text-sm mb-6 text-center" style={{ color: 'var(--on-surface-variant)' }}>These contacts number will appear during a panic sequence.</p>
                    <div className="flex flex-col gap-5 mb-8">
                        {[{ data: editC1, set: setEditC1, label: 'Primary Contact' }, { data: editC2, set: setEditC2, label: 'Secondary Contact' }].map(({ data, set, label }, idx) => (
                            <div key={idx} className="glass-card p-5 transition-all duration-300 relative overflow-hidden" style={{ border: '1px solid var(--glass-border-hover)' }}>
                                <div className="absolute top-0 left-0 w-1 h-full" style={{ background: idx === 0 ? 'var(--primary-container)' : 'var(--secondary)' }} />
                                <p className="text-xs font-bold uppercase tracking-wider mb-4 ml-1" style={{ color: 'var(--primary-container)' }}>{label}</p>

                                <div className="flex gap-4 ml-1">
                                    <div className="w-[35%] flex flex-col gap-2">
                                        <label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--on-surface-variant)' }}>Name</label>
                                        <div className="relative flex items-center">
                                            <span className="material-symbols-outlined absolute left-3 text-[18px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>person</span>
                                            <input
                                                placeholder=" "
                                                value={data.name}
                                                onChange={e => set({ ...data, name: e.target.value })}
                                                className="w-full pl-10 pr-3 py-3 rounded-xl outline-none text-[13px] font-headline font-semibold transition-all duration-300 focus:shadow-[0_0_15px_var(--glow-primary)] focus:border-[var(--primary-container)]"
                                                style={{ background: 'var(--surface-container)', border: '1px solid var(--glass-border)', color: 'var(--on-surface)' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col gap-2">
                                        <label className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--on-surface-variant)' }}>Phone Number</label>
                                        <div className="relative flex items-center">
                                            <span className="material-symbols-outlined absolute left-3 text-[18px]" style={{ color: 'var(--on-surface-variant)', opacity: 0.7 }}>call</span>
                                            <input
                                                placeholder="1234567890"
                                                maxLength={10}
                                                value={data.phone}
                                                onChange={e => set({ ...data, phone: e.target.value.replace(/\D/g, '') })}
                                                className="w-full pl-10 pr-3 py-3 rounded-xl outline-none text-[13px] font-headline font-semibold tracking-wider transition-all duration-300 focus:shadow-[0_0_15px_var(--glow-primary)] focus:border-[var(--primary-container)]"
                                                style={{ background: 'var(--surface-container)', border: '1px solid var(--glass-border)', color: 'var(--on-surface)' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={saveContacts} disabled={saving} className="btn-primary-glow" style={{ padding: '12px 24px', borderRadius: 999, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Saving...' : 'Save Contacts'}</button>
                    </div>
                </SettingDialog>


              
                {!allDone && (
                    <div style={{
                        width: 360, flexShrink: 0,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '0 20px',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '80%', height: '50%', borderRadius: '50%', background: 'radial-gradient(circle, var(--glow-secondary) 0%, transparent 65%)', filter: 'blur(50px)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '70%', height: '45%', borderRadius: '50%', background: 'radial-gradient(circle, var(--glow-primary) 0%, transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
                        <div className="animate-fade-in glass-card" style={{
                            width: '100%', borderRadius: 28, padding: '36px 28px 32px',
                            boxShadow: '0 8px 48px var(--glow-secondary), 0 2px 16px rgba(0,0,0,0.18)',
                        }}>
                            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 56, color: 'var(--secondary)', fontVariationSettings: "'FILL' 0" }}>book_5</span>
                            </div>
                            <p style={{ margin: '0 0 24px', fontSize: 15, fontWeight: 700, color: 'var(--secondary)', lineHeight: 1.6, textAlign: 'center' }}>
                                Guide to setup your account
                            </p>
                            <div style={{ height: 1, background: 'var(--glass-border)', marginBottom: 20 }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                                {[
                                    { label: 'Complete onboarding', done: !!userData?.isOnboarded },
                                    { label: 'Choose your AI tone', done: !!userData?.tone },
                                    { label: 'Add an emergency contact', done: (userData?.emergencyContacts || []).length > 0 },
                                ].map(({ label, done }) => (
                                    <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: done ? 'var(--primary-container)' : 'var(--on-surface-variant)', flexShrink: 0, marginTop: 1, fontVariationSettings: done ? "'FILL' 1" : "'FILL' 0" }}>
                                            {done ? 'check_circle' : 'radio_button_unchecked'}
                                        </span>
                                        <span style={{ fontSize: 13, lineHeight: 1.6, color: done ? 'var(--on-surface-variant)' : 'var(--on-surface)', textDecoration: done ? 'line-through' : 'none' }}>{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}


                {confirmDel && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)' }}>
                        <div className="animate-scale-in" style={{ maxWidth: 440, width: '100%', borderRadius: 32, padding: 32, border: '1px solid rgba(255,100,100,0.3)', background: 'var(--surface-container-low)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
                            <h3 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, fontFamily: 'Manrope,sans-serif', color: 'var(--error)' }}>Delete Account Permanently</h3>
                            <p style={{ margin: '0 0 24px', fontSize: 14, lineHeight: 1.6, color: 'var(--on-surface-variant)' }}>This permanently deletes all your data and your account. Enter your password to confirm.</p>
                            <input type="password" autoFocus placeholder="Your password" value={delPw}
                                onChange={e => setDelPw(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !deleting && onDelete()}
                                style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,180,171,0.3)', outline: 'none', marginBottom: 24, background: 'var(--surface-container-low)', color: 'var(--on-surface)', fontFamily: 'Inter', boxSizing: 'border-box' }} />
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button onClick={() => { setConfirmDel(false); setDelPw(''); }} disabled={deleting}
                                    style={{ padding: '11px 22px', borderRadius: 999, border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--on-surface-variant)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={onDelete} disabled={deleting || !delPw.trim()}
                                    style={{ padding: '11px 22px', borderRadius: 999, border: 'none', background: 'var(--error)', color: '#fff', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', boxShadow: '0 0 20px rgba(255,180,171,0.3)', opacity: (deleting || !delPw.trim()) ? 0.4 : 1 }}>
                                    {deleting ? 'Erasing…' : 'Delete everything'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
