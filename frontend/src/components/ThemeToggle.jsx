import React from 'react';
import { useAuth } from '../context/AuthContext';


export default function ThemeToggle({ inline = false }) {
    const { userData, updateProfile, currentUser } = useAuth();

    const currentTheme = userData?.theme || localStorage.getItem('echo-theme') || 'dark';
    const isLight = currentTheme === 'light';

    const toggle = async () => {
        const next = isLight ? 'dark' : 'light';

       
        if (next === 'light') {
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.classList.remove('light');
        }

       
        localStorage.setItem('echo-theme', next);
        if (currentUser) {
            try {
                await updateProfile({ theme: next });
            } catch {
                /* ignore */
            }
        }
    };

    return (
        <button
            type="button"
            onClick={toggle}
            className={inline ? "relative flex items-center justify-center w-12 h-12 rounded-full cursor-pointer transition-all duration-300" : "theme-toggle-btn"}
            style={inline ? {
                background: isLight ? 'var(--surface-container-high)' : 'var(--glass-bg)',
                border: '1px solid var(--glass-border-hover)',
                boxShadow: isLight ? 'none' : '0 0 20px var(--glow-primary)',
            } : undefined}
            aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
        >
            <span
                className="material-symbols-outlined icon"
                style={{
                    transform: isLight ? 'rotate(0deg)' : 'rotate(360deg)',
                    fontVariationSettings: "'FILL' 1, 'wght' 400",
                }}
            >
                {isLight ? 'dark_mode' : 'light_mode'}
            </span>
        </button>
    );
}
