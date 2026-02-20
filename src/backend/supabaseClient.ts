// Supabase Client
// Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
// Falls back gracefully if not configured

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const isSupabaseConfigured = !!(
    supabaseUrl &&
    supabaseKey &&
    supabaseUrl !== 'https://your-project.supabase.co'
);

// Lazy-loaded Supabase client to avoid import errors when not configured
let _supabase: any = null;

export async function getSupabaseClient() {
    if (!isSupabaseConfigured) return null;
    if (_supabase) return _supabase;

    try {
        const { createClient } = await import('@supabase/supabase-js');
        _supabase = createClient(supabaseUrl, supabaseKey);
        return _supabase;
    } catch {
        console.warn('[DevTrack] Supabase not available. Running in offline mode.');
        return null;
    }
}
