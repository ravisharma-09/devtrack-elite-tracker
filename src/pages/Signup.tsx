import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { verifyEmailOtp } from '../auth/authService';
import { Terminal, UserPlus, AlertCircle, Mail, CheckCircle, KeyRound } from 'lucide-react';

type Step = 'form' | 'otp' | 'success';

export const Signup: React.FC = () => {
    const { signup } = useAuth();
    const [step, setStep] = useState<Step>('form');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // ── Step 1: Create account → triggers OTP email ──────────────────────────
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password) return;
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        setError(''); setLoading(true);
        try {
            await signup(email, password, name);
            // Supabase sends OTP/confirmation email on signup
            setStep('otp');
        } catch (err: any) {
            setError(err?.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Step 2: Verify OTP ───────────────────────────────────────────────────
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp.trim()) return;
        setError(''); setLoading(true);
        try {
            await verifyEmailOtp(email, otp.trim());
            setStep('success');
            setTimeout(() => { window.location.href = '/'; }, 1500);
        } catch (err: any) {
            setError(err?.message || 'Invalid or expired code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

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

                {/* Progress Indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    {(['form', 'otp', 'success'] as Step[]).map((s, i) => (
                        <React.Fragment key={s}>
                            <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-mono font-bold transition-colors ${s === step ? 'border-brand-accent bg-brand-accent/20 text-brand-accent'
                                    : (i < ['form', 'otp', 'success'].indexOf(step)) ? 'border-brand-primary bg-brand-primary/20 text-brand-primary'
                                        : 'border-brand-border text-brand-secondary'
                                }`}>
                                {s === 'success' && step === 'success' ? '✓' : i + 1}
                            </div>
                            {i < 2 && <div className={`flex-1 h-px max-w-[40px] ${i < ['form', 'otp', 'success'].indexOf(step) ? 'bg-brand-primary' : 'bg-brand-border'}`} />}
                        </React.Fragment>
                    ))}
                </div>

                <div className="retro-panel p-8 border-brand-accent/20 shadow-[0_0_40px_rgba(245,158,11,0.06)] relative">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-accent/40 to-transparent" />

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
                                    className="w-full flex items-center justify-center gap-2 bg-brand-accent/10 border border-brand-accent text-brand-accent py-3 rounded font-mono font-bold uppercase tracking-widest hover:bg-brand-accent hover:text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {loading ? <span className="animate-pulse">Creating account...</span> : <><UserPlus size={16} /> Create Account</>}
                                </button>
                            </form>
                        </>
                    )}

                    {step === 'otp' && (
                        <>
                            <div className="flex items-center gap-3 mb-2">
                                <Mail size={20} className="text-brand-accent" />
                                <h2 className="text-lg font-bold font-mono uppercase tracking-widest text-brand-accent">[VERIFY EMAIL]</h2>
                            </div>
                            <p className="text-brand-secondary text-sm font-mono mb-6">
                                A 6-digit OTP was sent to <span className="text-brand-primary">{email}</span>. Enter it below to confirm your account.
                            </p>
                            {error && (
                                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded p-3 mb-5">
                                    <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-red-400 text-sm font-mono">{error}</p>
                                </div>
                            )}
                            <form onSubmit={handleVerifyOtp} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-mono text-brand-secondary mb-1.5 uppercase tracking-widest">
                                        <KeyRound size={12} className="inline mr-1" /> OTP Code
                                    </label>
                                    <input
                                        autoFocus type="text" maxLength={6} required
                                        value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                        placeholder="123456"
                                        className="w-full bg-brand-bg border border-brand-accent/50 text-brand-primary p-3 rounded focus:outline-none focus:border-brand-accent font-mono text-center text-2xl tracking-[0.5em] transition-colors"
                                    />
                                    <p className="text-xs font-mono text-brand-secondary/50 mt-2 text-center">Check your spam folder if not received</p>
                                </div>
                                <button type="submit" disabled={loading || otp.length < 6}
                                    className="w-full flex items-center justify-center gap-2 bg-brand-primary/10 border border-brand-primary text-brand-primary py-3 rounded font-mono font-bold uppercase tracking-widest hover:bg-brand-primary hover:text-brand-bg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {loading ? <span className="animate-pulse">Verifying...</span> : <><CheckCircle size={16} /> Verify OTP</>}
                                </button>
                                <button type="button" onClick={() => setStep('form')} className="w-full text-brand-secondary text-xs font-mono hover:text-brand-primary transition-colors">
                                    ← Back to signup
                                </button>
                            </form>
                        </>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-4">
                            <CheckCircle size={48} className="text-brand-primary mx-auto mb-4" />
                            <h2 className="text-xl font-bold font-mono text-brand-primary mb-2">Account Verified!</h2>
                            <p className="text-brand-secondary text-sm font-mono">Redirecting to dashboard...</p>
                        </div>
                    )}

                    {step === 'form' && (
                        <p className="text-center text-brand-secondary text-sm font-mono mt-6">
                            Already have an account?{' '}
                            <Link to="/login" className="text-brand-primary hover:text-brand-accent transition-colors underline underline-offset-2">Login →</Link>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
