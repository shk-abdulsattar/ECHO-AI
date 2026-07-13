import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GOAL_OPTIONS = ['Stress', 'Anxiety', 'Sleep', 'Anger', 'Grief'];
const TONE_OPTIONS = [
    { value: 'Friendly', icon: 'sentiment_satisfied', desc: 'Warm, casual, and supportive' },
    { value: 'Professional', icon: 'psychology', desc: 'Structured, clinical, evidence-based' },
    { value: 'Motivational', icon: 'local_fire_department', desc: 'Energetic, uplifting, action-oriented' },
];

export default function Onboarding() {
    const { completeOnboarding } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [age, setAge] = useState('');
    const [goals, setGoals] = useState([]);
    const [tone, setTone] = useState('Friendly');
    const [loading, setLoading] = useState(false);

    const toggleGoal = (g) => setGoals((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);

    const handleFinish = async () => {
        setLoading(true);
        try {
            await completeOnboarding({ age: age ? parseInt(age, 10) : '', goals, tone });
            navigate('/dashboard');
        } catch {
            
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden">
          
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[20%] w-[40vw] h-[40vw] rounded-full animate-morph-blob opacity-15"
                    style={{ background: 'radial-gradient(circle, var(--glow-secondary), transparent 70%)', filter: 'blur(80px)' }} />
                <div className="absolute bottom-[-10%] right-[15%] w-[35vw] h-[35vw] rounded-full animate-morph-blob opacity-15"
                    style={{ background: 'radial-gradient(circle, var(--glow-primary), transparent 70%)', filter: 'blur(80px)', animationDelay: '-3s' }} />
            </div>

            <div className="relative z-10 w-full max-w-lg animate-float-up">
               
                <div className="flex gap-2 mb-10 max-w-xs mx-auto">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-container-high)' }}>
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: step >= s ? '100%' : '0%',
                                    background: 'linear-gradient(90deg, var(--primary-container), var(--primary-fixed))',
                                    boxShadow: step >= s ? '0 0 10px var(--glow-primary)' : 'none',
                                }}
                            />
                        </div>
                    ))}
                </div>

                {step === 1 && (
                    <div className="text-center animate-float-up">
                        <p className="text-[10px] uppercase tracking-[0.5em] font-black mb-2" style={{ color: 'var(--primary-container)', opacity: 0.7 }}>Step 1 of 3</p>
                        <h2 className="text-3xl font-headline font-extralight mb-3 m-0" style={{ color: 'var(--primary)' }}>
                            How old are you?
                        </h2>
                        <p className="text-sm mb-8 m-0" style={{ color: 'var(--on-surface-variant)' }}>This helps ECHO personalize its language (optional)</p>
                        <div className="max-w-xs mx-auto">
                            <input
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                placeholder="e.g. 25"
                                className="w-full text-center px-5 py-5 rounded-2xl border outline-none text-2xl font-headline font-light transition-all duration-300 focus:border-[var(--glass-border-hover)] focus:shadow-[0_0_30px_var(--glow-primary)]"
                                style={{ background: 'var(--surface-container-low)', borderColor: 'var(--glass-border)', color: 'var(--primary)' }}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setStep(2)}
                            className="mt-8 px-10 py-4 rounded-full btn-primary-glow border-none cursor-pointer text-sm font-black uppercase tracking-[0.15em]"
                        >
                            Next
                        </button>
                    </div>
                )}

               
                {step === 2 && (
                    <div className="text-center animate-float-up">
                        <p className="text-[10px] uppercase tracking-[0.5em] font-black mb-2" style={{ color: 'var(--primary-container)', opacity: 0.7 }}>Step 2 of 3</p>
                        <h2 className="text-3xl font-headline font-extralight mb-3 m-0" style={{ color: 'var(--primary)' }}>
                            What brings you here?
                        </h2>
                        <p className="text-sm mb-8 m-0" style={{ color: 'var(--on-surface-variant)' }}>Select your focus areas</p>
                        <div className="flex flex-wrap gap-3 justify-center max-w-md mx-auto">
                            {GOAL_OPTIONS.map((g) => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => toggleGoal(g)}
                                    className="px-6 py-3.5 rounded-full border-2 text-sm font-bold cursor-pointer transition-all duration-500"
                                    style={{
                                        borderColor: goals.includes(g) ? 'var(--primary-container)' : 'var(--glass-border)',
                                        background: goals.includes(g) ? 'var(--glow-primary)' : 'transparent',
                                        color: goals.includes(g) ? 'var(--primary-container)' : 'var(--on-surface-variant)',
                                        boxShadow: goals.includes(g) ? '0 0 20px var(--glow-primary)' : 'none',
                                        transform: goals.includes(g) ? 'scale(1.05)' : 'scale(1)',
                                    }}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3 justify-center mt-8">
                            <button type="button" onClick={() => setStep(1)} className="px-6 py-3 rounded-full border text-xs uppercase tracking-[0.15em] font-black cursor-pointer bg-transparent" style={{ borderColor: 'var(--glass-border)', color: 'var(--on-surface-variant)' }}>
                                Back
                            </button>
                            <button type="button" onClick={() => setStep(3)} className="px-10 py-3 rounded-full btn-primary-glow border-none cursor-pointer text-sm font-black uppercase tracking-[0.15em]">
                                Next
                            </button>
                        </div>
                    </div>
                )}

          
                {step === 3 && (
                    <div className="text-center animate-float-up">
                        <p className="text-[10px] uppercase tracking-[0.5em] font-black mb-2" style={{ color: 'var(--primary-container)', opacity: 0.7 }}>Step 3 of 3</p>
                        <h2 className="text-3xl font-headline font-extralight mb-3 m-0" style={{ color: 'var(--primary)' }}>
                            Choose ECHO's tone
                        </h2>
                        <p className="text-sm mb-8 m-0" style={{ color: 'var(--on-surface-variant)' }}>You can change this anytime in settings</p>
                        <div className="flex flex-col gap-3 max-w-sm mx-auto">
                            {TONE_OPTIONS.map((t) => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => setTone(t.value)}
                                    className="glass-card p-5 flex items-center gap-4 text-left cursor-pointer transition-all duration-500"
                                    style={{
                                        borderColor: tone === t.value ? 'var(--glass-border-hover)' : 'var(--glass-border)',
                                        boxShadow: tone === t.value ? '0 0 30px var(--glow-primary)' : 'none',
                                        transform: tone === t.value ? 'scale(1.02)' : 'scale(1)',
                                    }}
                                >
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{
                                            background: tone === t.value ? 'var(--glow-primary)' : 'var(--surface-container-high)',
                                            border: `1px solid ${tone === t.value ? 'var(--glass-border-hover)' : 'var(--glass-border)'}`,
                                        }}
                                    >
                                        <span className="material-symbols-outlined text-xl" style={{ color: tone === t.value ? 'var(--primary-container)' : 'var(--on-surface-variant)', fontVariationSettings: tone === t.value ? "'FILL' 1" : "'FILL' 0" }}>
                                            {t.icon}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="m-0 font-headline font-bold text-base" style={{ color: 'var(--primary)' }}>{t.value}</p>
                                        <p className="m-0 text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>{t.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3 justify-center mt-8">
                            <button type="button" onClick={() => setStep(2)} className="px-6 py-3 rounded-full border text-xs uppercase tracking-[0.15em] font-black cursor-pointer bg-transparent" style={{ borderColor: 'var(--glass-border)', color: 'var(--on-surface-variant)' }}>
                                Back
                            </button>
                            <button
                                type="button"
                                disabled={loading}
                                onClick={handleFinish}
                                className="px-10 py-3 rounded-full btn-primary-glow border-none cursor-pointer text-sm font-black uppercase tracking-[0.15em] disabled:opacity-40"
                            >
                                {loading ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
