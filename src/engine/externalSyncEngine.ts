// ─── External Sync Engine ─────────────────────────────────────────────────────
// Fetches Codeforces, LeetCode, and GitHub stats for the current user.
// Caches results in Supabase and skips refetch if data is < 24h old.
// Called on login and on manual "Refresh" trigger from Profile/Statistics.

import { getSupabaseClient } from '../backend/supabaseClient';
import { fetchCodeforcesStats, saveCFStatsToSupabase, loadCFStats } from '../api/codeforcesApi';
import { fetchLeetCodeStats, saveLCStatsToSupabase, loadLCStats } from '../api/leetcodeApi';
import { fetchGitHubStats, saveGHStatsToSupabase, loadGHStats } from '../api/githubApi';
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

const CACHE_KEY = (uid: string) => `devtrack_external_${uid}`;

// ─── Load all external stats from Supabase (cached) ──────────────────────────
export async function loadExternalStats(userId: string): Promise<ExternalStats> {
    // Fast path: check localStorage cache first
    try {
        const cached = localStorage.getItem(CACHE_KEY(userId));
        if (cached) {
            const parsed: ExternalStats = JSON.parse(cached);
            if (!isStale(parsed.lastSynced ?? 0)) return parsed;
        }
    } catch { }

    const supabase = await getSupabaseClient();
    if (!supabase) return { cf: null, lc: null, gh: null, lastSynced: null };

    const [cf, lc, gh] = await Promise.all([
        loadCFStats(userId, supabase),
        loadLCStats(userId, supabase),
        loadGHStats(userId, supabase),
    ]);

    const result: ExternalStats = { cf, lc, gh, lastSynced: cf?.lastSynced ?? lc?.lastSynced ?? null };
    // Write to localStorage cache
    try { localStorage.setItem(CACHE_KEY(userId), JSON.stringify(result)); } catch { }
    return result;
}

// ─── Get platform handles from Supabase users table ──────────────────────────
export async function loadUserHandles(userId: string): Promise<{
    codeforces_handle: string;
    leetcode_username: string;
    github_username: string;
}> {
    const supabase = await getSupabaseClient();
    if (!supabase) return { codeforces_handle: '', leetcode_username: '', github_username: '' };
    const { data } = await supabase.from('users').select('codeforces_handle, leetcode_username, github_username').eq('id', userId).single();
    return {
        codeforces_handle: data?.codeforces_handle ?? '',
        leetcode_username: data?.leetcode_username ?? '',
        github_username: data?.github_username ?? '',
    };
}

// ─── Save platform handles ────────────────────────────────────────────────────
export async function saveUserHandles(userId: string, handles: {
    codeforces_handle: string;
    leetcode_username: string;
    github_username: string;
}): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await supabase.from('users').upsert({ id: userId, ...handles });
}

// ─── Full sync (force-refreshes from external APIs) ──────────────────────────
export async function syncExternalStats(userId: string, force = false): Promise<ExternalStats> {
    const supabase = await getSupabaseClient();
    if (!supabase) return { cf: null, lc: null, gh: null, lastSynced: null };

    // Check if sync needed
    if (!force) {
        const existing = await loadExternalStats(userId);
        if (!isStale(existing.lastSynced ?? 0)) return existing;
    }

    const handles = await loadUserHandles(userId);

    // Fetch all 3 in parallel (don't fail if one is missing)
    const [cf, lc, gh] = await Promise.all([
        handles.codeforces_handle ? fetchCodeforcesStats(handles.codeforces_handle) : Promise.resolve(null),
        handles.leetcode_username ? fetchLeetCodeStats(handles.leetcode_username) : Promise.resolve(null),
        handles.github_username ? fetchGitHubStats(handles.github_username) : Promise.resolve(null),
    ]);

    // Save to Supabase (fire-and-forget)
    const saveOps = [];
    if (cf) saveOps.push(saveCFStatsToSupabase(userId, cf, supabase));
    if (lc) saveOps.push(saveLCStatsToSupabase(userId, lc, supabase));
    if (gh) saveOps.push(saveGHStatsToSupabase(userId, gh, supabase));
    await Promise.allSettled(saveOps);

    const result: ExternalStats = { cf, lc, gh, lastSynced: Date.now() };
    // Update localStorage cache
    try { localStorage.setItem(CACHE_KEY(userId), JSON.stringify(result)); } catch { }

    return result;
}

// ─── Sync if stale — called on login (non-blocking) ──────────────────────────
export function syncIfStale(userId: string): void {
    loadExternalStats(userId).then(existing => {
        if (isStale(existing.lastSynced ?? 0)) {
            syncExternalStats(userId, false).catch(() => { });
        }
    }).catch(() => { });
}
