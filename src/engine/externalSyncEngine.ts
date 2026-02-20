// ─── External Sync Engine ─────────────────────────────────────────────────────
// Fetches Codeforces, LeetCode, and GitHub stats for the current user.
// Key design: handles can be passed directly so we never have a circular
// dependency (save handles → read handles → fetch → get empty result).

import { getSupabaseClient } from '../backend/supabaseClient';
import { fetchCodeforcesStats } from '../api/codeforcesApi';
import { fetchLeetCodeStats } from '../api/leetcodeApi';
import { fetchGitHubStats } from '../api/githubApi';
import { isStale } from './analyticsEngine';
import type { CFStats } from '../api/codeforcesApi';
import type { LCStats } from '../api/leetcodeApi';
import type { GHStats } from '../api/githubApi';

export interface ExternalStats {
    cf: CFStats | null;
    lc: LCStats | null;
    gh: GHStats | null;
    lastSynced: number | null;
}

interface Handles {
    codeforces_handle: string;
    leetcode_username: string;
    github_username: string;
}

const CACHE_KEY = (uid: string) => `devtrack_external_${uid}`;
const HANDLES_KEY = (uid: string) => `devtrack_handles_${uid}`;

// ─── Load all external stats (localStorage cache first, then Supabase) ────────
export async function loadExternalStats(userId: string): Promise<ExternalStats> {
    try {
        const cached = localStorage.getItem(CACHE_KEY(userId));
        if (cached) {
            const parsed: ExternalStats = JSON.parse(cached);
            if (!isStale(parsed.lastSynced ?? 0)) return parsed;
        }
    } catch { }

    const supabase = await getSupabaseClient();
    if (!supabase) return { cf: null, lc: null, gh: null, lastSynced: null };

    let result: ExternalStats = { cf: null, lc: null, gh: null, lastSynced: null };
    try {
        const { data, error } = await supabase
            .from('external_stats')
            .select('cf, lc, gh, last_synced')
            .eq('user_id', userId)
            .single();
        if (!error && data) {
            result = {
                cf: data.cf,
                lc: data.lc,
                gh: data.gh,
                lastSynced: new Date(data.last_synced).getTime()
            };
        }
    } catch { }

    try { localStorage.setItem(CACHE_KEY(userId), JSON.stringify(result)); } catch { }
    return result;
}

// ─── Get handles from Supabase with localStorage fallback ─────────────────────
export async function loadUserHandles(userId: string): Promise<Handles> {
    const empty: Handles = { codeforces_handle: '', leetcode_username: '', github_username: '' };
    const supabase = await getSupabaseClient();

    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('codeforces_handle, leetcode_username, github_username')
                .eq('id', userId)
                .single();
            if (!error && data) {
                const fromDB = {
                    codeforces_handle: data.codeforces_handle ?? '',
                    leetcode_username: data.leetcode_username ?? '',
                    github_username: data.github_username ?? '',
                };
                // Also cache locally
                try { localStorage.setItem(HANDLES_KEY(userId), JSON.stringify(fromDB)); } catch { }
                return fromDB;
            }
        } catch { }
    }

    // Fallback: localStorage (handles saved from Profile even if DB columns missing)
    try {
        const local = localStorage.getItem(HANDLES_KEY(userId));
        if (local) return JSON.parse(local);
    } catch { }

    return empty;
}

// ─── Save platform handles — uses UPSERT (row created if missing)
export async function saveUserHandles(userId: string, handles: Handles): Promise<boolean> {
    // Always save to localStorage first (works even if Supabase columns don't exist)
    try { localStorage.setItem(HANDLES_KEY(userId), JSON.stringify(handles)); } catch { }

    const supabase = await getSupabaseClient();
    if (!supabase) return false;

    // Use upsert instead of update in case the user row doesn't exist yet/was deleted
    const { error } = await supabase
        .from('users')
        .upsert({
            id: userId,
            ...handles
        });

    if (error) {
        console.warn('[DevTrack] saveUserHandles Supabase error (schema may need update):', error.message);
        return false; // localStorage already saved above — sync will still work
    }
    return true;
}

// ─── Full sync — pass handles directly to avoid Supabase column dependency ────
// handleOverrides: handles typed in the UI, bypass DB lookup
export async function syncExternalStats(
    userId: string,
    force = false,
    handleOverrides?: Partial<Handles>
): Promise<ExternalStats> {
    const supabase = await getSupabaseClient();
    if (!supabase) return { cf: null, lc: null, gh: null, lastSynced: null };

    if (!force) {
        const existing = await loadExternalStats(userId);
        if (!isStale(existing.lastSynced ?? 0)) return existing;
    }

    // Resolve handles: overrides > Supabase/localStorage
    let handles: Handles;
    if (handleOverrides && (handleOverrides.codeforces_handle !== undefined || handleOverrides.leetcode_username !== undefined || handleOverrides.github_username !== undefined)) {
        handles = {
            codeforces_handle: handleOverrides.codeforces_handle ?? '',
            leetcode_username: handleOverrides.leetcode_username ?? '',
            github_username: handleOverrides.github_username ?? '',
        };
    } else {
        handles = await loadUserHandles(userId);
    }

    console.log('[DevTrack] syncExternalStats — handles:', {
        cf: handles.codeforces_handle || '(none)',
        lc: handles.leetcode_username || '(none)',
        gh: handles.github_username || '(none)',
    });

    const [cf, lc, gh] = await Promise.all([
        handles.codeforces_handle ? fetchCodeforcesStats(handles.codeforces_handle) : Promise.resolve(null),
        handles.leetcode_username ? fetchLeetCodeStats(handles.leetcode_username) : Promise.resolve(null),
        handles.github_username ? fetchGitHubStats(handles.github_username) : Promise.resolve(null),
    ]);

    console.log('[DevTrack] syncExternalStats — results:', {
        cf: cf ? `rating=${cf.rating}, solved=${cf.problemsSolved}` : 'null',
        lc: lc ? `total=${lc.totalSolved}` : 'null',
        gh: gh ? `repos=${gh.publicRepos}, commits30d=${gh.lastMonthCommits}` : 'null',
    });

    // Save to Supabase external_stats table explicitly
    try {
        await supabase.from('external_stats').upsert({
            user_id: userId,
            cf: cf || null,
            lc: lc || null,
            gh: gh || null,
            last_synced: new Date().toISOString()
        });
    } catch (e: any) {
        console.warn('[DevTrack] Supabase external_stats save failed (schema may need update):', e.message);
    }

    const result: ExternalStats = { cf, lc, gh, lastSynced: Date.now() };
    try { localStorage.setItem(CACHE_KEY(userId), JSON.stringify(result)); } catch { }
    return result;
}

// ─── Sync if stale — called on login (non-blocking background) ────────────────
export function syncIfStale(userId: string): void {
    loadExternalStats(userId).then(existing => {
        if (isStale(existing.lastSynced ?? 0)) {
            syncExternalStats(userId, false).catch(() => { });
        }
    }).catch(() => { });
}
