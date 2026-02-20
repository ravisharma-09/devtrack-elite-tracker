import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Terminal, UserPlus, AlertCircle } from 'lucide-react';

export const Signup: React.FC = () => {
    const { signup } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email || !password) return;
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        setError(''); setLoading(true);
        try {
            await signup(email, password, name);
            setSuccess(true);
            // Some Supabase setups require email confirmation — handle both
            setTimeout(() => navigate('/'), 1500);
        } catch (err: any) {
            setError(err?.message || 'Signup failed. Please try again.');
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

                <div className="retro-panel p-8 border-brand-accent/20 shadow-[0_0_40px_rgba(245,158,11,0.07)] relative">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-accent/40 to-transparent" />
                    <h2 className="text-lg font-bold font-mono uppercase tracking-widest text-brand-accent mb-6">
                        [SIGNUP]
                    </h2>

                    {error && (
                        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded p-3 mb-5">
                            <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-red-400 text-sm font-mono">{error}</p>
                        </div>
                    )}
                    {success && (
                        <div className="bg-brand-primary/10 border border-brand-primary/30 rounded p-3 mb-5">
                            <p className="text-brand-primary text-sm font-mono">Account created! Redirecting to dashboard...</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-mono text-brand-secondary mb-1.5 uppercase tracking-widest">Your Name</label>
                            <input
                                type="text" required value={name} onChange={e => setName(e.target.value)}
                                placeholder="Ravi Sharma"
                                className="w-full bg-brand-bg border border-brand-border/50 text-brand-primary p-3 rounded focus:outline-none focus:border-brand-accent font-mono transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-brand-secondary mb-1.5 uppercase tracking-widest">Email</label>
                            <input
                                type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full bg-brand-bg border border-brand-border/50 text-brand-primary p-3 rounded focus:outline-none focus:border-brand-accent font-mono transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-mono text-brand-secondary mb-1.5 uppercase tracking-widest">Password</label>
                            <input
                                type="password" required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="Min 6 characters"
                                className="w-full bg-brand-bg border border-brand-border/50 text-brand-primary p-3 rounded focus:outline-none focus:border-brand-accent font-mono transition-colors"
                            />
                        </div>
                        <button
                            type="submit" disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-brand-accent/10 border border-brand-accent text-brand-accent py-3 rounded font-mono font-bold uppercase tracking-widest hover:bg-brand-accent hover:text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <span className="animate-pulse">Creating account...</span> : <><UserPlus size={16} /> Create Account</>}
                        </button>
                    </form>

                    <p className="text-center text-brand-secondary text-sm font-mono mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-brand-primary hover:text-brand-accent transition-colors underline underline-offset-2">
                            Login →
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
