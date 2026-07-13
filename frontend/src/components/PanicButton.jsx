import React from 'react';

export default function PanicButton({ onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="fixed z-[200] w-14 h-14 rounded-full border-none cursor-pointer flex items-center justify-center animate-glow-pulse"
            style={{
                top: '19px', 
                right: '84px',
                background: 'radial-gradient(circle at 40% 40%, rgba(255,100,80,0.3), rgba(255,80,60,0.15))',
                border: '1px solid rgba(255,180,171,0.2)',
                boxShadow: '0 0 30px rgba(255,100,80,0.2)',
                backdropFilter: 'blur(20px)',
            }}
            title="Panic Button— Emergency"
            aria-label="Safe zone"
        >
            <span
                className="material-symbols-outlined"
                style={{
                    color: 'var(--error)',
                    fontSize: '24px',
                    fontVariationSettings: "'FILL' 1, 'wght' 400",
                }}
            >
                shield
            </span>
        </button>
    );
}
