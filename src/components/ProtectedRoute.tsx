import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Terminal } from 'lucide-react';

interface Props { children: React.ReactNode; }

export const ProtectedRoute: React.FC<Props> = ({ children }) => {
    const { isAuthenticated, isLoading, isDataReady } = useAuth();

    // 1. Waiting for Supabase session to resolve
    if (isLoading) {
        return (
            <div className="min-h-screen bg-brand-bg flex items-center justify-center">
                <div className="text-center">
                    <Terminal className="w-10 h-10 text-brand-primary mx-auto mb-3 animate-pulse" />
                    <div className="text-brand-primary font-mono text-lg mb-1">DEVTRACK</div>
                    <div className="text-brand-secondary font-mono text-xs">Restoring session...</div>
                </div>
            </div>
        );
    }

    // 2. Not logged in → go to login
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    // 3. Logged in but Supabase data still loading
    if (!isDataReady) {
        return (
            <div className="min-h-screen bg-brand-bg flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mx-auto mb-3" />
                    <div className="text-brand-primary font-mono text-sm">Loading your data...</div>
                    <div className="text-brand-secondary font-mono text-xs mt-1">Syncing from Supabase</div>
                </div>
            </div>
        );
    }

    // 4. Ready — render the page
    return <>{children}</>;
};
