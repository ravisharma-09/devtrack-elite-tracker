import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface Props { children: React.ReactNode; }

export const ProtectedRoute: React.FC<Props> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    // While we resolve the session, show a minimal loading screen
    if (isLoading) {
        return (
            <div className="min-h-screen bg-brand-bg flex items-center justify-center">
                <div className="text-center">
                    <div className="text-brand-primary font-mono text-xl animate-pulse mb-2">DEVTRACK</div>
                    <div className="text-brand-secondary font-mono text-xs">Initialising session...</div>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <>{children}</>;
};
