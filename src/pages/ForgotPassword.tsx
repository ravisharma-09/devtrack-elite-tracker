import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { resetPasswordForEmail } from '../auth/authService';
import { Terminal, Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setError(''); setLoading(true);
        try {
            await resetPasswordForEmail(email);
            setSent(true);
        } catch (err: any) {
            setError(err?.message || 'Failed to send reset email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl" />
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
                        SDE Elite — Password Recovery
                    </p>
                </div>

                <div className="retro-panel p-8 border-blue-400/20 shadow-[0_0_40px_rgba(96,165,250,0.05)] relative">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />

                    {!sent ? (
                        <>
                            <div className="flex items-center gap-3 mb-2">
                                <Mail size={20} className="text-blue-400" />
                                <h2 className="text-lg font-bold font-mono uppercase tracking-widest text-blue-400">[FORGOT PASSWORD]</h2>
                            </div>
                            <p className="text-brand-secondary text-sm font-mono mb-6">
                                Enter your email and we'll send a password reset link.
                            </p>

                            {error && (
                                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded p-3 mb-5">
                                    <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-red-400 text-sm font-mono">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-mono text-brand-secondary mb-1.5 uppercase tracking-widest">Email</label>
                                    <input
                                        type="email" required autoFocus
                                        value={email} onChange={e => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full bg-brand-bg border border-brand-border/50 text-brand-primary p-3 rounded focus:outline-none focus:border-blue-400 font-mono transition-colors"
                                    />
                                </div>
                                <button type="submit" disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-400/10 border border-blue-400 text-blue-400 py-3 rounded font-mono font-bold uppercase tracking-widest hover:bg-blue-400 hover:text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {loading ? <span className="animate-pulse">Sending...</span> : <><Mail size={16} /> Send Reset Link</>}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <CheckCircle size={48} className="text-brand-primary mx-auto mb-4" />
                            <h2 className="text-xl font-bold font-mono text-brand-primary mb-2">Email Sent!</h2>
                            <p className="text-brand-secondary text-sm font-mono mb-1">
                                Check your inbox at <span className="text-brand-primary">{email}</span>
                            </p>
                            <p className="text-brand-secondary/60 text-xs font-mono">
                                Click the link in the email to set a new password. Check spam if not received.
                            </p>
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <Link to="/login" className="flex items-center justify-center gap-1.5 text-brand-secondary text-sm font-mono hover:text-brand-primary transition-colors">
                            <ArrowLeft size={14} /> Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
