import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { signIn, signUp, signOut, onAuthStateChange } from './authService';
import { isSupabaseConfigured } from '../backend/supabaseClient';

interface AuthUser {
    id: string;
    email: string;
    name?: string;
}

interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Start true until we check session

    // ── Normalise Supabase user object ─────────────────────────────────────────
    const normalise = (raw: any): AuthUser => ({
        id: raw.id,
        email: raw.email ?? '',
        name: raw.user_metadata?.name ?? raw.email?.split('@')[0] ?? 'Dev',
    });

    // ── Initialise — check persisted session ───────────────────────────────────
    useEffect(() => {
        if (!isSupabaseConfigured) {
            // Offline / dev mode — use a fake local user so the app still works
            const saved = localStorage.getItem('devtrack_local_user');
            if (saved) { try { setUser(JSON.parse(saved)); } catch { } }
            setIsLoading(false);
            return;
        }

        let unsubscribe = () => { };

        onAuthStateChange(rawUser => {
            setUser(rawUser ? normalise(rawUser) : null);
            setIsLoading(false);
        }).then(fn => { unsubscribe = fn; });

        return () => unsubscribe();
    }, []);

    // ── Login ──────────────────────────────────────────────────────────────────
    const login = useCallback(async (email: string, password: string) => {
        const data = await signIn(email, password);
        if (data?.user) setUser(normalise(data.user));
    }, []);

    // ── Signup ─────────────────────────────────────────────────────────────────
    const signup = useCallback(async (email: string, password: string, name: string) => {
        const data = await signUp(email, password, name);
        if (data?.user) setUser(normalise(data.user));
    }, []);

    // ── Logout ─────────────────────────────────────────────────────────────────
    const logout = useCallback(async () => {
        await signOut();
        setUser(null);
        // Wipe offline local user too
        localStorage.removeItem('devtrack_local_user');
    }, []);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
