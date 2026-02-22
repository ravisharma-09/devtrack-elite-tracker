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
import { syncCodeforcesActivity, syncLeetCodeActivity, syncGitHubActivity } from './externalActivityEngine';

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

// ─── LocalStorage cache key ───────────────────────────────────────────────────
const cacheKey = (userId: string) => `devtrack_ext_stats_${userId}`;

function saveStatsToCache(userId: string, stats: ExternalStats): void {
    try { localStorage.setItem(cacheKey(userId), JSON.stringify(stats)); } catch { }
}

function loadStatsFromCache(userId: string): ExternalStats | null {
    try {
        const raw = localStorage.getItem(cacheKey(userId));
        if (!raw) return null;
        return JSON.parse(raw) as ExternalStats;
    } catch { return null; }
}

// ─── Load all external stats (localStorage cache first, then Supabase) ────────
export async function loadExternalStats(userId: string): Promise<ExternalStats> {
    // 1. Try localStorage first — instant, survives refresh, no network needed
    const cached = loadStatsFromCache(userId);
    if (cached && (cached.cf || cached.lc || cached.gh)) {
        // If not stale, return immediately — no Supabase call
        if (!isStale(cached.lastSynced ?? 0)) return cached;
    }

    // 2. Try Supabase
    const supabase = await getSupabaseClient();
    if (!supabase) return cached ?? { cf: null, lc: null, gh: null, lastSynced: null };

    try {
        const { data, error } = await supabase
            .from('external_stats')
            .select('cf, lc, gh, last_synced')
            .eq('user_id', userId)
            .single();
        if (!error && data && (data.cf || data.lc || data.gh)) {
            const result: ExternalStats = {
                cf: data.cf,
                lc: data.lc,
                gh: data.gh,
                lastSynced: new Date(data.last_synced).getTime()
            };
            saveStatsToCache(userId, result); // keep cache in sync
            return result;
        }
    } catch { }

    // 3. Fall back to cached even if stale — better than nothing
    return cached ?? { cf: null, lc: null, gh: null, lastSynced: null };
}

// ─── Get handles from Supabase with localStorage fallback ─────────────────────
export async function loadUserHandles(userId: string): Promise<Handles> {
    const empty: Handles = { codeforces_handle: '', leetcode_username: '', github_username: '' };
    const supabase = await getSupabaseClient();
    if (!supabase) return empty;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('codeforces_handle, leetcode_username, github_username')
            .eq('id', userId)
            .single();
        if (!error && data) {
            return {
                codeforces_handle: data.codeforces_handle ?? '',
                leetcode_username: data.leetcode_username ?? '',
                github_username: data.github_username ?? '',
            };
        }
    } catch { }

    return empty;
}

// ─── Save platform handles — uses UPSERT (row created if missing)
export async function saveUserHandles(userId: string, handles: Handles): Promise<boolean> {
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
        return false;
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

    // Resolve handles: overrides > Supabase
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

    // Fire and forget unified activity fetch logic (timeline events)
    if (handles.codeforces_handle) syncCodeforcesActivity(userId, handles.codeforces_handle).catch(console.error);
    if (handles.leetcode_username) syncLeetCodeActivity(userId, handles.leetcode_username).catch(console.error);
    if (handles.github_username) syncGitHubActivity(userId, handles.github_username).catch(console.error);

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
    // Always persist to localStorage — this survives refresh even if Supabase is unavailable
    saveStatsToCache(userId, result);
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
