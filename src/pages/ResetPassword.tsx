import React, { useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { updatePassword } from '../auth/authService';
import { Terminal, Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

export const ResetPassword: React.FC = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [show, setShow] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        if (password !== confirm) { setError('Passwords do not match.'); return; }
        setError(''); setLoading(true);
        try {
            await updatePassword(password);
            setSuccess(true);
            setTimeout(() => navigate('/'), 2000);
        } catch (err: any) {
            setError(err?.message || 'Failed to update password. The link may have expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl" />
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
                        SDE Elite — Set New Password
                    </p>
                </div>

                <div className="retro-panel p-8 border-brand-primary/20 shadow-[0_0_40px_rgba(34,197,94,0.06)] relative">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-primary/40 to-transparent" />

                    {success ? (
                        <div className="text-center py-4">
                            <CheckCircle size={48} className="text-brand-primary mx-auto mb-4" />
                            <h2 className="text-xl font-bold font-mono text-brand-primary mb-2">Password Updated!</h2>
                            <p className="text-brand-secondary text-sm font-mono">Redirecting to dashboard...</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 mb-2">
                                <Lock size={20} className="text-brand-primary" />
                                <h2 className="text-lg font-bold font-mono uppercase tracking-widest text-brand-primary">[RESET PASSWORD]</h2>
                            </div>
                            <p className="text-brand-secondary text-sm font-mono mb-6">Choose a strong new password.</p>

                            {error && (
                                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded p-3 mb-5">
                                    <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-red-400 text-sm font-mono">{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-mono text-brand-secondary mb-1.5 uppercase tracking-widest">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={show ? 'text' : 'password'} required autoFocus
                                            value={password} onChange={e => setPassword(e.target.value)}
                                            placeholder="Min 6 characters"
                                            className="w-full bg-brand-bg border border-brand-border/50 text-brand-primary p-3 pr-10 rounded focus:outline-none focus:border-brand-primary font-mono transition-colors"
                                        />
                                        <button type="button" onClick={() => setShow(!show)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-secondary hover:text-brand-primary transition-colors">
                                            {show ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-mono text-brand-secondary mb-1.5 uppercase tracking-widest">Confirm Password</label>
                                    <input
                                        type={show ? 'text' : 'password'} required
                                        value={confirm} onChange={e => setConfirm(e.target.value)}
                                        placeholder="Repeat password"
                                        className={`w-full bg-brand-bg border text-brand-primary p-3 rounded focus:outline-none font-mono transition-colors ${confirm && confirm !== password ? 'border-red-500/50 focus:border-red-400' : 'border-brand-border/50 focus:border-brand-primary'}`}
                                    />
                                    {confirm && confirm !== password && (
                                        <p className="text-red-400 text-xs font-mono mt-1">Passwords don't match</p>
                                    )}
                                </div>
                                <button type="submit" disabled={loading || password !== confirm || password.length < 6}
                                    className="w-full flex items-center justify-center gap-2 bg-brand-primary/10 border border-brand-primary text-brand-primary py-3 rounded font-mono font-bold uppercase tracking-widest hover:bg-brand-primary hover:text-brand-bg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {loading ? <span className="animate-pulse">Updating...</span> : <><Lock size={16} /> Set New Password</>}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
