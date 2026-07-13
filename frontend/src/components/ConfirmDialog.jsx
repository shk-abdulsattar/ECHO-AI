import React from 'react';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, onClose, onConfirm }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(20px)' }}>
            <div className="glass-card max-w-md w-full rounded-[2rem] p-8 animate-scale-in" style={{ borderColor: danger ? 'rgba(255,180,171,0.2)' : 'var(--glass-border-hover)' }}>
                <h3 className="m-0 text-xl font-headline mb-3" style={{ color: danger ? 'var(--error)' : 'var(--primary)' }}>{title}</h3>
                <p className="m-0 text-sm mb-8 leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>{message}</p>
                <div className="flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-full border text-xs font-black uppercase tracking-widest bg-transparent cursor-pointer transition-all hover:scale-105"
                        style={{ borderColor: 'var(--glass-border)', color: 'var(--on-surface-variant)' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-6 py-3 rounded-full border-none text-xs font-black uppercase tracking-widest cursor-pointer transition-all hover:scale-105"
                        style={{
                            background: danger ? 'var(--error)' : 'var(--primary-container)',
                            color: danger ? '#fff' : 'var(--on-primary)',
                            boxShadow: danger ? '0 0 20px rgba(255,180,171,0.3)' : '0 0 20px var(--glow-primary)',
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
