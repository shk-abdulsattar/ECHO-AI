import React from 'react';

export default function PageHeader({ eyebrow, title, subtitle, icon }) {
    return (
        <div className="flex-shrink-0 px-8 pt-8 pb-6">
            <div className="flex items-start gap-5">
                {icon && (
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 animate-float-up"
                        style={{
                            background: 'linear-gradient(135deg, var(--glow-primary), var(--glow-secondary))',
                            border: '1px solid var(--glass-border-hover)',
                        }}
                    >
                        <span
                            className="material-symbols-outlined text-[var(--primary-container)] text-2xl"
                            style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}
                        >
                            {icon}
                        </span>
                    </div>
                )}
                <div className="min-w-0 flex-1">
                    {eyebrow && (
                        <p
                            className="text-[10px] uppercase tracking-[0.5em] font-black m-0 mb-2 animate-float-up delay-1"
                            style={{ color: 'var(--primary-container)', opacity: 0.6 }}
                        >
                            {eyebrow}
                        </p>
                    )}
                    <h1
                        className="text-3xl font-headline font-extralight m-0 leading-tight tracking-tight animate-float-up delay-2"
                        style={{ color: 'var(--primary)' }}
                    >
                        {title}
                    </h1>
                    {subtitle && (
                        <p
                            className="text-sm m-0 mt-2 max-w-xl animate-float-up delay-3"
                            style={{ color: 'var(--on-surface-variant)', lineHeight: '1.6' }}
                        >
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
