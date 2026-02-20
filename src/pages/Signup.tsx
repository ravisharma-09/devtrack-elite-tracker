import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { verifyEmailOtp } from '../auth/authService';
import { useAuth } from '../auth/AuthContext';
import { Terminal, UserPlus, AlertCircle, Mail, CheckCircle, KeyRound } from 'lucide-react';

type Step = 'form' | 'otp';

export const Signup: React.FC = () => {
    const { signup } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>('form');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // ── Step 1: Create account ────────────────────────────────────────────────
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password) return;
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        setError(''); setLoading(true);
        try {
            const data = await signup(email, password, name);
            // If Supabase auto-confirmed (email confirm disabled) → go straight to app
            if ((data as any)?.user?.email_confirmed_at) {
                navigate('/');
            } else {
                // Email confirmation required — show OTP/link screen
                setStep('otp');
            }
        } catch (err: any) {
            setError(err?.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2a: Verify numeric OTP ──────────────────────────────────────────
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp.trim()) return;
        setError(''); setLoading(true);
        try {
            await verifyEmailOtp(email, otp.trim());
            navigate('/');
        } catch (err: any) {
            setError(err?.message || 'Invalid or expired code. Enter the code from your email.');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2b: Skip and continue (if user got a magic link instead) ─────────
    const handleSkipToApp = () => navigate('/');

    return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-accent/5 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Terminal className="w-9 h-9 text-brand-primary" />
                        <h1 className="text-3xl font-bold tracking-wider text-brand-primary">
                            DEV<span className="text-brand-accent">TRACK</span>
                        </h1>
                    </div>
                    <p className="text-brand-secondary font-mono text-sm uppercase tracking-widest">
                        SDE Elite — Create Account
                    </p>
                </div>

                <div className="retro-panel p-8 border-brand-accent/20 shadow-[0_0_40px_rgba(245,158,11,0.06)] relative">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-accent/40 to-transparent" />

                    {/* ── STEP 1: Registration form ── */}
                    {step === 'form' && (
                        <>
                            <h2 className="text-lg font-bold font-mono uppercase tracking-widest text-brand-accent mb-6">[SIGNUP]</h2>
                            {error && (
                                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded p-3 mb-5">
                                    <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-red-400 text-sm font-mono">{error}</p>
                                </div>
                            )}
                            <form onSubmit={handleSignup} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-mono text-brand-secondary mb-1.5 uppercase tracking-widest">Your Name</label>
                                    <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Ravi Sharma"
                                        className="w-full bg-brand-bg border border-brand-border/50 text-brand-primary p-3 rounded focus:outline-none focus:border-brand-accent font-mono transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-xs font-mono text-brand-secondary mb-1.5 uppercase tracking-widest">Email</label>
                                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                                        className="w-full bg-brand-bg border border-brand-border/50 text-brand-primary p-3 rounded focus:outline-none focus:border-brand-accent font-mono transition-colors" />
                                </div>
                                <div>
                                    <label className="block text-xs font-mono text-brand-secondary mb-1.5 uppercase tracking-widest">Password</label>
                                    <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters"
                                        className="w-full bg-brand-bg border border-brand-border/50 text-brand-primary p-3 rounded focus:outline-none focus:border-brand-accent font-mono transition-colors" />
                                </div>
                                <button type="submit" disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 bg-brand-accent/10 border border-brand-accent text-brand-accent py-3 rounded font-mono font-bold uppercase tracking-widest hover:bg-brand-accent hover:text-black transition-all duration-200 disabled:opacity-50">
                                    {loading ? <span className="animate-pulse">Creating account...</span> : <><UserPlus size={16} /> Create Account</>}
                                </button>
                            </form>
                            <p className="text-center text-brand-secondary text-sm font-mono mt-6">
                                Already have an account?{' '}
                                <Link to="/login" className="text-brand-primary hover:text-brand-accent transition-colors underline underline-offset-2">Login →</Link>
                            </p>
                        </>
                    )}

                    {/* ── STEP 2: OTP or Magic Link  ── */}
                    {step === 'otp' && (
                        <>
                            <div className="flex items-center gap-3 mb-2">
                                <Mail size={20} className="text-brand-accent" />
                                <h2 className="text-lg font-bold font-mono uppercase tracking-widest text-brand-accent">[VERIFY EMAIL]</h2>
                            </div>

                            {/* Info box — handles both OTP and magic link */}
                            <div className="bg-brand-bg/50 border border-brand-primary/20 rounded p-4 mb-6">
                                <p className="text-brand-primary text-sm font-mono font-bold mb-1">Check your inbox at <span className="text-brand-accent">{email}</span></p>
                                <div className="text-brand-secondary text-xs font-mono space-y-1 mt-2">
                                    <p>📧 <span className="text-brand-primary">Got a 6-digit code?</span> Enter it below.</p>
                                    <p>🔗 <span className="text-brand-primary">Got a "Confirm Email" link?</span> Click it, then come back and press "I've confirmed my email" below.</p>
                                    <p className="text-brand-secondary/50">Check spam if not received.</p>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded p-3 mb-5">
                                    <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-red-400 text-sm font-mono">{error}</p>
                                </div>
                            )}

                            {/* OTP input for numeric codes */}
                            <form onSubmit={handleVerifyOtp} className="space-y-4 mb-4">
                                <div>
                                    <label className="block text-xs font-mono text-brand-secondary mb-1.5 uppercase tracking-widest">
                                        <KeyRound size={12} className="inline mr-1" /> 6-Digit OTP Code
                                    </label>
                                    <input
                                        type="text" maxLength={6}
                                        value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                        placeholder="123456"
                                        className="w-full bg-brand-bg border border-brand-accent/50 text-brand-primary p-3 rounded focus:outline-none focus:border-brand-accent font-mono text-center text-2xl tracking-[0.5em] transition-colors"
                                    />
                                </div>
                                <button type="submit" disabled={loading || otp.length < 6}
                                    className="w-full flex items-center justify-center gap-2 bg-brand-primary/10 border border-brand-primary text-brand-primary py-3 rounded font-mono font-bold uppercase tracking-widest hover:bg-brand-primary hover:text-brand-bg transition-all duration-200 disabled:opacity-50">
                                    {loading ? <span className="animate-pulse">Verifying...</span> : <><CheckCircle size={16} /> Verify OTP</>}
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="flex items-center gap-3 my-4">
                                <div className="flex-1 h-px bg-brand-border/30" />
                                <span className="text-brand-secondary/50 text-xs font-mono">OR</span>
                                <div className="flex-1 h-px bg-brand-border/30" />
                            </div>

                            {/* Magic link route — skip OTP, go to app */}
                            <button onClick={handleSkipToApp}
                                className="w-full flex items-center justify-center gap-2 bg-brand-bg border border-brand-border/40 text-brand-secondary py-3 rounded font-mono text-sm uppercase tracking-widest hover:border-brand-primary/40 hover:text-brand-primary transition-all duration-200">
                                <CheckCircle size={15} /> I've confirmed my email → Enter App
                            </button>

                            <button onClick={() => setStep('form')} className="w-full text-brand-secondary/50 text-xs font-mono mt-3 hover:text-brand-secondary transition-colors">
                                ← Back to signup
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
