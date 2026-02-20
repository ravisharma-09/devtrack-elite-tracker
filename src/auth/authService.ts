import { getSupabaseClient } from '../backend/supabaseClient';

// ─── Sign Up (creates Supabase Auth user + profile via trigger) ───────────────
export async function signUp(email: string, password: string, name: string) {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
    });
    if (error) throw error;
    return data;
}

// ─── Sign In ──────────────────────────────────────────────────────────────────
export async function signIn(email: string, password: string) {
    const supabase = await getSupabaseClient();
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────
export async function signOut() {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
}

// ─── Get Current Session ──────────────────────────────────────────────────────
export async function getSession() {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session;
}

// ─── Get Current User ID ──────────────────────────────────────────────────────
export async function getCurrentUserId(): Promise<string> {
    const session = await getSession();
    return session?.user?.id || 'local';
}

// ─── On Auth State Change ─────────────────────────────────────────────────────
export async function onAuthStateChange(callback: (user: any | null) => void) {
    const supabase = await getSupabaseClient();
    if (!supabase) return () => { };
    const { data } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
        callback(session?.user || null);
    });
    return () => data.subscription?.unsubscribe();
}

// ─── Update user name in profile ──────────────────────────────────────────────
export async function updateUserName(userId: string, name: string) {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await supabase.from('users').update({ name }).eq('id', userId);
}

// ─── Get User Profile ─────────────────────────────────────────────────────────
export async function getUserProfile(userId: string) {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    return data;
}
