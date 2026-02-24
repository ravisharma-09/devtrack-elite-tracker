import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { signIn, signUp, signOut } from './authService';
import { isSupabaseConfigured } from '../backend/supabaseClient';
import { runBackgroundSync } from '../core/backgroundSync';

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
        try {
            const { getSupabaseClient } = await import('../backend/supabaseClient');
            const supabase = await getSupabaseClient();
            if (supabase) {
                const { data: profile } = await supabase.from('profiles').select('id').eq('id', authUser.id).maybeSingle();
                if (!profile) {
                    console.log('[DevTrack Auth] Healing missing profile for user...');
                    await supabase.from('profiles').insert({
                        id: authUser.id,
                        email: authUser.email,
                        username: authUser.name || 'Dev'
                    });
                }
            }
        } catch (e) {
            console.error('[DevTrack Auth] Profile healing failed:', e);
        }
        await runBackgroundSync(authUser.id);
        setIsDataReady(true);
    }, []);

    // ── Session restore on app load (persists across refresh) ─────────────────
    useEffect(() => {
        if (!isSupabaseConfigured) {
            setIsLoading(false);
            setIsDataReady(true);
            return;
        }

        let unsubscribe = () => { };
        let mounted = true;

        const initAuth = async () => {
            try {
                const { getSupabaseClient } = await import('../backend/supabaseClient');
                const supabase = await getSupabaseClient();
                if (!supabase || !mounted) return;

                // 1. Explicitly check for an existing session first
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    const authUser = normalise(session.user);
                    setUser(authUser);
                    setIsLoading(false);
                    await hydrateUser(authUser);
                } else {
                    setUser(null);
                    setIsLoading(false);
                    setIsDataReady(true);
                }

                // 2. Listen for future changes (login, logout, token refresh)
                const { data: listener } = supabase.auth.onAuthStateChange(async (event: string, newSession: any) => {
                    if (!mounted) return;

                    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                        if (newSession?.user) {
                            const authUser = normalise(newSession.user);
                            setUser(authUser);
                            // Avoid re-hydrating if we already did it on mount, unless it's a new login
                            if (!isDataReady || event === 'SIGNED_IN') {
                                await hydrateUser(authUser);
                            }
                        }
                    } else if (event === 'SIGNED_OUT') {
                        setUser(null);
                        setIsDataReady(true);
                    }
                });

                unsubscribe = () => {
                    listener?.subscription?.unsubscribe();
                };

            } catch (err) {
                console.error("[DevTrack Auth] Error restoring session:", err);
                if (mounted) {
                    setIsLoading(false);
                    setIsDataReady(true);
                }
            }
        };

        initAuth();

        return () => {
            mounted = false;
            unsubscribe();
        };
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
    }, []);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, isDataReady, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
