import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Terminal, LogIn, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        setError(''); setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err: any) {
            let msg = err?.message || 'Invalid credentials. Please try again.';
            if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('email limit')) {
                msg = 'Email rate limit reached. Please disable "Confirm email" in your Supabase Auth settings for local development.';
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
            {/* Ambient glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl" />
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
                        SDE Elite — Access Terminal
                    </p>
                </div>

                {/* Card */}
                <div className="retro-panel p-8 border-brand-primary/20 shadow-[0_0_40px_rgba(34,197,94,0.07)]">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-primary/40 to-transparent" />
                    <h2 className="text-lg font-bold font-mono uppercase tracking-widest text-brand-accent mb-6">
                        [LOGIN]
                    </h2>

                    {error && (
                        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded p-3 mb-5">
                            <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-red-400 text-sm font-mono">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-mono text-brand-secondary mb-1.5 uppercase tracking-widest">
                                Email
                            </label>
                            <input
                                type="email" required autoComplete="email"
                                value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full bg-brand-bg border border-brand-border/50 text-brand-primary p-3 rounded focus:outline-none focus:border-brand-primary font-mono transition-colors"
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-xs font-mono text-brand-secondary uppercase tracking-widest">
                                    Password
                                </label>
                                <Link to="/forgot-password" className="text-xs font-mono text-brand-secondary hover:text-brand-accent transition-colors">
                                    Forgot password?
                                </Link>
                            </div>
                            <input
                                type="password" required autoComplete="current-password"
                                value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-brand-bg border border-brand-border/50 text-brand-primary p-3 rounded focus:outline-none focus:border-brand-primary font-mono transition-colors"
                            />
                        </div>
                        <button
                            type="submit" disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-brand-primary/10 border border-brand-primary text-brand-primary py-3 rounded font-mono font-bold uppercase tracking-widest hover:bg-brand-primary hover:text-brand-bg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="animate-pulse">Authenticating...</span>
                            ) : (
                                <><LogIn size={16} /> Login</>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-brand-secondary text-sm font-mono mt-6">
                        No account?{' '}
                        <Link to="/signup" className="text-brand-accent hover:text-brand-primary transition-colors underline underline-offset-2">
                            Create one →
                        </Link>
                    </p>
                </div>

                <p className="text-center text-brand-secondary/40 text-xs font-mono mt-6">
                    v3 · Secured with Supabase Auth
                </p>
            </div>
        </div>
    );
};
