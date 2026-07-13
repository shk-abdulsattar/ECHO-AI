import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import ZenBot from './ZenBot';

const FEATURES = [
    {
        icon: 'forum',
        title: 'AI Chat',
        desc: 'Talk to a AI-powered therapist-like support that remembers your history, mood, and goals.',
    },
    {
        icon: 'mood',
        title: 'Mood Tracking',
        desc: 'Log your emotions daily and watch your mood orbit unfold on a beautiful interactive chart.',
    },
    {
        icon: 'flag',
        title: 'Goals & Streaks',
        desc: 'AI-crafted daily in app goals with a streak system to keep you growing.',
    },
    {
        icon: 'self_improvement',
        title: 'Meditation',
        desc: 'Guided sessions across 4 categories with guidance text and mindful timers.',
    },
    {
        icon: 'air',
        title: 'Breathing Exercises',
        desc: 'Animated breathing patterns and Energizing — to calm your nervous system.',
    },
    {
        icon: 'summarize',
        title: 'Weekly Reports',
        desc: 'ECHO AI synthesizes your week into a personalized wellness summary with insights.',
    },
];

const STEPS = [
    { num: '01', title: 'Create Your Account', desc: 'Sign up and tell ECHO AI about your goals and preferred tone.', icon: 'person_add' },
    { num: '02', title: 'Talk, Track, Breathe', desc: 'Chat with your ECHO AI, log moods, meditate, and play game.', icon: 'spa' },
    { num: '03', title: 'Witness Your Growth', desc: 'Watch your streaks, mood trends, and AI insights evolve over time.', icon: 'trending_up' },
];

function useInView(ref, threshold = 0.15) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (!ref.current) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setVisible(true); },
            { threshold }
        );
        obs.observe(ref.current);
        return () => obs.disconnect();
    }, [ref, threshold]);
    return visible;
}

function AnimatedSection({ children, className = '', delay = 0 }) {
    const ref = useRef(null);
    const visible = useInView(ref);
    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(40px)',
                transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
            }}
        >
            {children}
        </div>
    );
}

import ThemeToggle from './ThemeToggle';

export default function LandingPage() {
    const savedTheme = localStorage.getItem('echo-theme') || 'dark';
    const isLight = savedTheme === 'light';
    const [scrolled, setScrolled] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const lastScrollY = useRef(0);
    const containerRef = useRef(null);
    const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });

    useEffect(() => {
        const handleScroll = (e) => {
            const currentScrollY = e.target.scrollTop;

            setScrolled(currentScrollY > 50);

          
            if (currentScrollY > lastScrollY.current && currentScrollY > 150) {
                setIsVisible(false); // Scrolling down
            } else if (currentScrollY < lastScrollY.current) {
                setIsVisible(true);  // Scrolling up
            }

            lastScrollY.current = currentScrollY;
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll, { passive: true });
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, []);

    const handleMouseMove = (e) => {
        setMousePos({
            x: e.clientX / window.innerWidth,
            y: e.clientY / window.innerHeight,
        });
    };

    return (
        <div ref={containerRef} className="h-screen w-full overflow-y-auto overflow-x-hidden font-body custom-scrollbar relative bg-background" onMouseMove={handleMouseMove}>
            <div className="noise-overlay" />

           
            <div
                className="fixed top-0 left-0 right-0 h-12 z-[490] pointer-events-auto"
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={(e) => {
                    const scrollY = containerRef.current ? containerRef.current.scrollTop : 0;
                    if (scrollY > 150 && e.clientY > 60) {
                        setIsVisible(false);
                    }
                }}
            />

            <div className="fixed bottom-6 left-6 z-[1000] animate-float-up delay-6">
                <ThemeToggle inline={true} />
            </div>
           
            <nav
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => {
                    const scrollY = containerRef.current ? containerRef.current.scrollTop : 0;
                    if (scrollY > 150) {
                        setIsVisible(false);
                    }
                }}
                className={`fixed left-1/2 -translate-x-1/2 z-[500] flex items-center justify-between transition-all duration-700 w-[95%] max-w-7xl px-8 border cursor-pointer hover:scale-[1.01] ${isVisible ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'
                    } ${scrolled
                        ? 'top-4 py-3 bg-[var(--glass-bg)] backdrop-blur-2xl border-[var(--glass-border-hover)] shadow-2xl rounded-full hover:bg-[rgba(255,255,255,0.05)]'
                        : 'top-6 py-5 bg-[rgba(255,255,255,0.02)] backdrop-blur-md border-[var(--glass-border)] shadow-lg rounded-full hover:bg-[rgba(255,255,255,0.05)]'
                    }`}
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 flex items-center justify-center transform transition-transform duration-500 hover:rotate-12">
                        <img src="/logo-light.png" alt="ECHO Logo" className="w-[90%] h-[90%] object-contain animate-pulse" style={{ animationDuration: '4s' }} />
                    </div>
                    <span className="font-headline font-bold tracking-[0.2em] text-[var(--primary)] text-sm uppercase">ECHO AI</span>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center gap-8">
                    <a href="#features" className="text-[10px] uppercase tracking-[0.2em] text-[var(--on-surface-variant)] hover:text-[var(--primary-container)] transition-all font-bold no-underline opacity-70 hover:opacity-100">Features</a>
                    <a href="#how-it-works" className="text-[10px] uppercase tracking-[0.2em] text-[var(--on-surface-variant)] hover:text-[var(--primary-container)] transition-all font-bold no-underline opacity-70 hover:opacity-100">How It Works</a>
                    <a href="#about" className="text-[10px] uppercase tracking-[0.2em] text-[var(--on-surface-variant)] hover:text-[var(--primary-container)] transition-all font-bold no-underline opacity-70 hover:opacity-100">About</a>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/login"
                        className="px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] text-[var(--on-surface-variant)] hover:text-[var(--primary)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] transition-all no-underline"
                    >
                        Login
                    </Link>
                    <Link
                        to="/register"
                        className="px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] btn-primary-glow no-underline shadow-[0_0_20px_var(--glow-primary)]"
                    >
                        Get Started
                    </Link>
                </div>
            </nav>

          
            <section className="relative min-h-screen pt-32 pb-10 flex flex-col items-center justify-center px-6 overflow-hidden">
            
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div
                        className="absolute w-[700px] h-[700px] rounded-full animate-morph-blob opacity-30"
                        style={{
                            background: 'radial-gradient(circle, var(--glow-secondary), transparent 70%)',
                            filter: 'blur(60px)',
                            top: `calc(10% + ${(mousePos.y - 0.5) * -30}px)`,
                            left: `calc(5% + ${(mousePos.x - 0.5) * -30}px)`,
                            transition: 'top 0.8s ease-out, left 0.8s ease-out',
                        }}
                    />
                    <div
                        className="absolute w-[500px] h-[500px] rounded-full animate-morph-blob opacity-20"
                        style={{
                            background: 'radial-gradient(circle, var(--glow-primary), transparent 70%)',
                            filter: 'blur(80px)',
                            bottom: `calc(5% + ${(mousePos.y - 0.5) * 20}px)`,
                            right: `calc(10% + ${(mousePos.x - 0.5) * 20}px)`,
                            animationDelay: '-4s',
                            transition: 'bottom 0.8s ease-out, right 0.8s ease-out',
                        }}
                    />
                    <div
                        className="absolute w-[300px] h-[300px] rounded-full opacity-10"
                        style={{
                            background: 'radial-gradient(circle, var(--glow-primary), transparent 60%)',
                            filter: 'blur(40px)',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            animation: 'glow-pulse 4s ease-in-out infinite',
                        }}
                    />
                </div>

               
                <div className="relative mb-10 animate-float-up">
                    <ZenBot size="lg" isLight={isLight} />
                </div>

              
                <div className="relative z-10 text-center max-w-4xl mx-auto">
                    <p className="animate-float-up delay-1 text-[10px] uppercase tracking-[0.5em] font-black text-[var(--primary-container)] mb-6 opacity-70">AI-Powered Therapist</p>
                    <h1
                        className="animate-float-up delay-2 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-headline font-extralight leading-[0.95] mb-8"
                        style={{ color: 'var(--primary)' }}
                    >
                        Your Mind
                        <br />
                        <span className="font-bold gradient-text" style={{ background: 'linear-gradient(135deg, var(--primary-container), var(--primary-fixed))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Deserves a Peace.
                        </span>
                    </h1>
                    <p className="animate-float-up delay-3 text-lg md:text-xl text-[var(--on-surface-variant)] max-w-2xl mx-auto mb-12 leading-relaxed font-light">
                        A personal therapist-like AI that listens, remembers, and grows with you.
                        Track your mood, breathe, meditate.
                    </p>
                    <div className="animate-float-up delay-4 flex flex-wrap gap-4 justify-center">
                        <Link
                            to="/register"
                            className="px-10 py-4 rounded-full btn-primary-glow text-[var(--on-primary)] text-sm font-bold uppercase tracking-[0.15em] no-underline flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                            Begin Your Journey
                        </Link>
                        <Link
                            to="/login"
                            className="px-10 py-4 rounded-full border border-[var(--glass-border-hover)] text-[var(--primary-container)] text-sm font-bold uppercase tracking-[0.15em] no-underline hover:bg-[var(--glow-primary)] transition-all duration-300 flex items-center justify-center"
                        >
                            Welcome Back
                        </Link>
                    </div>
                </div>
             
                <div className="relative mt-12 flex flex-col items-center gap-2 animate-float-up delay-6">
                    <span className="text-[8px] uppercase tracking-[0.4em] text-[var(--on-surface-variant)] opacity-40 font-black">Scroll to explore</span>
                    <div className="w-5 h-8 rounded-full border border-[var(--on-surface-variant)] opacity-30 flex items-start justify-center p-1">
                        <div className="w-1 h-2 bg-[var(--primary-container)] rounded-full animate-bounce" />
                    </div>
                </div>
            </section>

           
            <section id="features" className="relative py-32 px-6 md:px-10 overflow-hidden">
             
                <div className="ambient-glow-wrapper">
                    <div
                        className="ambient-orb w-[600px] h-[600px] opacity-20 animate-morph-blob"
                        style={{
                            background: 'radial-gradient(circle, var(--glow-secondary), transparent 70%)',
                            top: `calc(10% + ${(mousePos.y - 0.5) * 40}px)`,
                            left: `calc(-10% + ${(mousePos.x - 0.5) * 40}px)`,
                        }}
                    />
                </div>
                <div className="max-w-6xl mx-auto">
                    <AnimatedSection className="text-center mb-20">
                        <p className="text-[10px] uppercase tracking-[0.5em] font-black text-[var(--primary-container)] mb-4 opacity-70">What ECHO Offers</p>
                        <h2 className="text-4xl md:text-5xl font-headline font-extralight text-[var(--primary)] mb-6">
                            Everything You Need to <span className="font-bold text-[var(--primary-container)]">Heal</span>
                        </h2>
                        <p className="text-[var(--on-surface-variant)] text-lg max-w-xl mx-auto">
                            Six powerful tools designed to support your mental wellness journey, all powered by AI that truly understands you.
                        </p>
                    </AnimatedSection>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map((f, i) => (
                            <AnimatedSection key={f.title} delay={i * 0.08}>
                                <div className="group glass-card p-8 h-full cursor-default">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110"
                                        style={{
                                            background: 'linear-gradient(135deg, var(--glow-primary), var(--glow-secondary))',
                                            border: '1px solid var(--glass-border-hover)',
                                        }}
                                    >
                                        <span className="material-symbols-outlined text-[var(--primary-container)] text-2xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
                                            {f.icon}
                                        </span>
                                    </div>
                                    <h3 className="font-headline text-xl font-semibold text-[var(--primary)] mb-3 group-hover:text-[var(--primary-container)] transition-colors">{f.title}</h3>
                                    <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">{f.desc}</p>
                                </div>
                            </AnimatedSection>
                        ))}
                    </div>
                </div>
            </section>

           
            <section id="how-it-works" className="relative py-32 px-6 md:px-10 overflow-hidden text-center justify-center">
                
                <div className="ambient-glow-wrapper">
                    <div
                        className="ambient-orb w-[800px] h-[800px] opacity-10"
                        style={{
                            background: 'radial-gradient(circle, var(--glow-primary), transparent 70%)',
                            top: '52%', 
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                        }}
                    />
                </div>

                <div className="max-w-5xl mx-auto relative z-10">
                    <AnimatedSection className="text-center mb-20">
                        <p className="text-[10px] uppercase tracking-[0.5em] font-black text-[var(--primary-container)] mb-4 opacity-70">Three Simple Steps</p>
                        <h2 className="text-4xl md:text-5xl font-headline font-extralight text-[var(--primary)]">
                            How It <span className="font-bold text-[var(--primary-container)]">Works</span>
                        </h2>
                    </AnimatedSection>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                      
                        <div className="hidden md:block absolute top-24 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-[var(--glass-border-hover)] to-transparent opacity-40" />

                        {STEPS.map((s, i) => (
                            <AnimatedSection key={s.num} delay={i * 0.15} className="text-center">
                                <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full mb-8 animate-zenbot-breathe"
                                    style={{
                                        background: 'var(--glass-bg)',
                                        border: '2px solid var(--glass-border-hover)',
                                        boxShadow: `0 0 40px var(--glow-primary)`,
                                        animationDelay: `${i * 0.5}s`,
                                    }}
                                >
                                    <span className="material-symbols-outlined text-[var(--primary-container)] text-3xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}>
                                        {s.icon}
                                    </span>
                                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[var(--primary-container)] text-[var(--on-primary)] text-xs font-black flex items-center justify-center">
                                        {s.num}
                                    </span>
                                </div>
                                <h3 className="font-headline text-xl font-semibold text-[var(--primary)] mb-3">{s.title}</h3>
                                <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                            </AnimatedSection>
                        ))}
                    </div>
                </div>
            </section>

            <section id="about" className="relative pt-30 pb-15 px-6 md:px-10 overflow-hidden">
             
                <div className="ambient-glow-wrapper">
                    <div
                        className="ambient-orb w-[800px] h-[800px] opacity-20 animate-morph-blob"
                        style={{
                            background: 'radial-gradient(circle, var(--glow-primary), transparent 70%)',
                            bottom: `calc(-10% + ${(mousePos.y - 0.5) * -40}px)`,
                            right: `calc(-10% + ${(mousePos.x - 0.5) * -40}px)`,
                            animationDelay: '-2s'
                        }}
                    />
                </div>

                <div className="max-w-3xl mx-auto relative z-10 text-center">

                   
                    <AnimatedSection>
                        <p className="text-[10px] uppercase tracking-[0.5em] font-black text-[var(--primary-container)] mb-4 opacity-70">
                            About ECHO AI
                        </p>
                        <h2 className="text-4xl md:text-5xl font-headline font-extralight text-[var(--primary)] mb-8">
                            Built With <span className="font-bold text-[var(--primary-container)]">Purpose</span>
                        </h2>
                    </AnimatedSection>

                    <AnimatedSection delay={0.1}>
                        <p className="text-[var(--on-surface-variant)] text-lg leading-[1.9] max-w-2xl mx-auto mb-16">
                            <span className="font-semibold text-[var(--primary)]">Our Mission</span> is to democratize mental health support through AI.{' '}
                            <span className="font-semibold text-[var(--primary)]">Our Vision</span> is a world of accessible, private, and personalized care.{' '}
                            <span className="font-semibold text-[var(--primary)]">Our Values</span> are rooted in empathy, privacy, and making emotional wellbeing available to all.
                        </p>
                    </AnimatedSection>

                    
                    <AnimatedSection delay={0.2}>
                        <div className="w-24 h-px mx-auto mb-16" style={{ background: 'linear-gradient(90deg, transparent, var(--glass-border-hover), transparent)' }} />
                    </AnimatedSection>

                  
                    <AnimatedSection delay={0.3}>
                        <p className="text-[9px] uppercase tracking-[0.4em] font-black text-[var(--primary-container)] opacity-50 mb-3">
                            Developed By
                        </p>
                        <p className="font-headline text-2xl md:text-3xl font-light text-[var(--primary)] mb-1 tracking-wide">
                            AbdulSattar Shaikh
                        </p>
                       
                        <p className="text-[9px] uppercase tracking-[0.35em] font-bold text-[var(--on-surface-variant)] opacity-40 mt-3">
                            BCA Final Year Project · AI-Powered Therapist
                        </p>
                    </AnimatedSection>

                    
                    <AnimatedSection delay={0.4}>
                        <div className="w-24 h-px mx-auto my-14" style={{ background: 'linear-gradient(90deg, transparent, var(--glass-border-hover), transparent)' }} />
                    </AnimatedSection>

                    <AnimatedSection delay={0.5}>
                        <p className="text-[9px] uppercase tracking-[0.4em] font-black text-[var(--primary-container)] opacity-50 mb-4">
                            Support &amp; Inquiries
                        </p>
                        <a
                            href="mailto:abdulsattarshaikh285@gmail.com"
                            className="group inline-flex items-center gap-3 no-underline"
                        >
                            <span
                                className="material-symbols-outlined text-lg transition-transform duration-300 group-hover:scale-110"
                                style={{ color: 'var(--primary-container)', fontVariationSettings: "'FILL' 0, 'wght' 200" }}
                            >
                                mail
                            </span>
                            <span
                                className="font-headline text-base font-light tracking-widest transition-all duration-300 group-hover:tracking-[0.25em]"
                                style={{ color: 'var(--primary-container)' }}
                            >
                                abdulsattarshaikh285@gmail.com
                            </span>
                        </a>
                        <p className="text-[var(--on-surface-variant)] text-xs mt-3 opacity-50 tracking-wide">
                            For project support or any inquiries.
                        </p>
                    </AnimatedSection>

                </div>
            </section>

           
            <section className="relative py-48 px-6 md:px-10 overflow-hidden">
              
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] rounded-full opacity-20"
                        style={{
                            background: 'radial-gradient(ellipse, var(--glow-primary), transparent 75%)',
                            filter: 'blur(80px)'
                        }} />
                </div>

                <AnimatedSection className="relative z-10 text-center max-w-3xl mx-auto">
                    <h2 className="text-4xl md:text-6xl font-headline font-extralight text-[var(--primary)] mb-6">
                        Ready to Find <span className="font-bold text-[var(--primary-container)]">Peace?</span>
                    </h2>
                    <p className="text-[var(--on-surface-variant)] text-lg mb-12 max-w-xl mx-auto">
                        Start your journey with ECHO AI today — free, private, and always here for you.
                    </p>
                    <Link
                        to="/register"
                        className="inline-flex items-center gap-3 px-12 py-5 rounded-full btn-primary-glow text-[var(--on-primary)] text-base font-bold uppercase tracking-[0.15em] no-underline"
                    >
                        <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                        Start Your Journey
                    </Link>
                </AnimatedSection>

                {/* Footer bar */}
                <div className="mt-24 text-center">
                    <p className="text-[8px] uppercase tracking-[0.6em] text-[var(--on-surface-variant)] opacity-20 font-black">
                        © 2026 ECHO AI All rights reserved.
                    </p>
                </div>
            </section>
        </div>
    );
}
