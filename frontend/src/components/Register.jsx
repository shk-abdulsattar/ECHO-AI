import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { mapAuthError } from '../utils/authErrors';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const nameRef = useRef(null);

    useEffect(() => {
        nameRef.current?.focus();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            await register(email, password, name);
            navigate('/onboarding');
        } catch (err) {
            setError(mapAuthError(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center p-6 relative overflow-x-hidden overflow-y-auto py-12">
           
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-15%] right-[-15%] w-[55vw] h-[55vw] rounded-full animate-morph-blob opacity-20"
                    style={{ background: 'radial-gradient(circle, var(--glow-primary), transparent 70%)', filter: 'blur(80px)' }} />
                <div className="absolute bottom-[-15%] left-[-10%] w-[50vw] h-[50vw] rounded-full animate-morph-blob opacity-15"
                    style={{ background: 'radial-gradient(circle, var(--glow-secondary), transparent 70%)', filter: 'blur(80px)', animationDelay: '-5s' }} />
            </div>

            <div className="relative z-10 w-full max-w-md animate-float-up my-auto">
                
                <div className="text-center mb-10">
                    <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                        <img src="/logo-light.png" alt="ECHO Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl font-headline font-extralight m-0 mb-2" style={{ color: 'var(--primary)' }}>
                        Create Your Account
                    </h1>
                    <p className="text-sm m-0" style={{ color: 'var(--on-surface-variant)' }}>
                        Begin your journey with ECHO
                    </p>
                </div>

               
                <div className="glass-card p-8">
                    {error && (
                        <div className="mb-5 px-5 py-3 rounded-xl text-sm animate-float-up" style={{ background: 'rgba(255,180,171,0.1)', border: '1px solid rgba(255,180,171,0.2)', color: 'var(--error)' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] font-black mb-2" style={{ color: 'var(--on-surface-variant)' }}>Name</label>
                            <input
                                ref={nameRef}
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-5 py-4 rounded-xl border outline-none text-[15px] font-light transition-all duration-300 focus:border-[var(--glass-border-hover)] focus:shadow-[0_0_30px_var(--glow-primary)]"
                                style={{ background: 'var(--surface-container-low)', borderColor: 'var(--glass-border)', color: 'var(--on-surface)', fontFamily: 'Inter' }}
                                placeholder="Your name"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] font-black mb-2" style={{ color: 'var(--on-surface-variant)' }}>Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-5 py-4 rounded-xl border outline-none text-[15px] font-light transition-all duration-300 focus:border-[var(--glass-border-hover)] focus:shadow-[0_0_30px_var(--glow-primary)]"
                                style={{ background: 'var(--surface-container-low)', borderColor: 'var(--glass-border)', color: 'var(--on-surface)', fontFamily: 'Inter' }}
                                placeholder="your@email.com"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] font-black mb-2" style={{ color: 'var(--on-surface-variant)' }}>Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-5 py-4 rounded-xl border outline-none text-[15px] font-light transition-all duration-300 focus:border-[var(--glass-border-hover)] focus:shadow-[0_0_30px_var(--glow-primary)]"
                                style={{ background: 'var(--surface-container-low)', borderColor: 'var(--glass-border)', color: 'var(--on-surface)', fontFamily: 'Inter' }}
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] font-black mb-2" style={{ color: 'var(--on-surface-variant)' }}>Confirm Password</label>
                            <input
                                type="password"
                                required
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                className="w-full px-5 py-4 rounded-xl border outline-none text-[15px] font-light transition-all duration-300 focus:border-[var(--glass-border-hover)] focus:shadow-[0_0_30px_var(--glow-primary)]"
                                style={{ background: 'var(--surface-container-low)', borderColor: 'var(--glass-border)', color: 'var(--on-surface)', fontFamily: 'Inter' }}
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 rounded-full btn-primary-glow border-none cursor-pointer text-sm font-black uppercase tracking-[0.15em] disabled:opacity-40 transition-all"
                        >
                            {loading ? 'Signing Up...' : 'Sign Up'}
                        </button>
                    </form>

                    <p className="text-center mt-6 text-sm m-0" style={{ color: 'var(--on-surface-variant)' }}>
                        Already have an account?{' '}
                        <Link to="/login" className="font-bold no-underline" style={{ color: 'var(--primary-container)' }}>
                            login
                        </Link>
                    </p>
                </div>

                <div className="text-center mt-8">
                    <Link to="/" className="text-[10px] uppercase tracking-[0.2em] font-black no-underline transition-opacity hover:opacity-100" style={{ color: 'var(--on-surface-variant)', opacity: 0.3 }}>
                        ← Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
