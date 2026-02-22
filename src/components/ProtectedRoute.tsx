import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { RetroLoader } from './RetroLoader';

interface Props { children: React.ReactNode; }

export const ProtectedRoute: React.FC<Props> = ({ children }) => {
    const { isAuthenticated, isLoading, isDataReady } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
                <div className="w-full max-w-lg">
                    <RetroLoader title="Accessing Terminal" subtitle="Restoring secure user session..." />
                </div>
            </div>
        );
    }

    // 2. Not logged in → go to login
    if (!isAuthenticated) return <Navigate to="/login" replace />;

    if (!isDataReady) {
        return (
            <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
                <div className="w-full max-w-lg">
                    <RetroLoader title="Initializing Databases" subtitle="Syncing user telemetry from Supabase network..." />
                </div>
            </div>
        );
    }

    // 4. Ready — render the page
    return <>{children}</>;
};
