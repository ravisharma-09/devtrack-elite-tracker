import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { signIn, signUp, signOut, onAuthStateChange } from './authService';
import { isSupabaseConfigured } from '../backend/supabaseClient';
import { loadAndHydrate } from '../engine/syncEngine';

interface AuthUser {
    id: string;
    email: string;
    name?: string;
}

interface AuthContextValue {
    user: AuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;    // Session resolution
    isDataReady: boolean;  // Supabase data loaded and hydrated
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name: string) => Promise<any>;
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
    const [isLoading, setIsLoading] = useState(true);
    const [isDataReady, setIsDataReady] = useState(false);

    const normalise = (raw: any): AuthUser => ({
        id: raw.id,
        email: raw.email ?? '',
        name: raw.user_metadata?.name ?? raw.email?.split('@')[0] ?? 'Dev',
    });

    // ── Hydrate Supabase data into localStorage for a given user ──────────────
    const hydrateUser = useCallback(async (authUser: AuthUser) => {
        setIsDataReady(false);
        await loadAndHydrate(authUser.id); // Fetches all tables → writes to localStorage
        setIsDataReady(true);
    }, []);

    // ── Session restore on app load (persists across refresh) ─────────────────
    useEffect(() => {
        if (!isSupabaseConfigured) {
            const saved = localStorage.getItem('devtrack_local_user');
            if (saved) { try { setUser(JSON.parse(saved)); } catch { } }
            setIsLoading(false);
            setIsDataReady(true); // Offline mode: use existing localStorage
            return;
        }

        let unsubscribe = () => { };

        onAuthStateChange(async rawUser => {
            if (rawUser) {
                const authUser = normalise(rawUser);
                setUser(authUser);
                setIsLoading(false);
                // Load data from Supabase and hydrate localStorage
                await hydrateUser(authUser);
            } else {
                setUser(null);
                setIsLoading(false);
                setIsDataReady(true); // No user — /login page can render immediately
            }
        }).then(fn => { unsubscribe = fn; });

        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Login ──────────────────────────────────────────────────────────────────
    const login = useCallback(async (email: string, password: string) => {
        const data = await signIn(email, password);
        if (data?.user) {
            const authUser = normalise(data.user);
            setUser(authUser);
            await hydrateUser(authUser);
        }
    }, [hydrateUser]);

    // ── Signup ─────────────────────────────────────────────────────────────────
    const signup = useCallback(async (email: string, password: string, name: string) => {
        const data = await signUp(email, password, name);
        if (data?.user) {
            const authUser = normalise(data.user);
            setUser(authUser);
            setIsDataReady(true); // New user has empty data — no hydration needed
        }
        return data;
    }, []);

    // ── Logout ─────────────────────────────────────────────────────────────────
    const logout = useCallback(async () => {
        await signOut();
        setUser(null);
        setIsDataReady(false);
        localStorage.removeItem('devtrack_local_user');
    }, []);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, isDataReady, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
