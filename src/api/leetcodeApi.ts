// ─── LeetCode Stats — via local proxy server ─────────────────────────────────
// Calls our Express server at /api/lc/:username (proxied by Vite to port 3001)
// The server uses LeetCode's official GraphQL API which is CORS-blocked in browser.

export interface LCStats {
    username: string;
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    ranking: number;
    submissionDates: string[];
    lastSynced: number;
}

export async function fetchLeetCodeStats(username: string): Promise<LCStats | null> {
    if (!username?.trim()) return null;
    try {
        const res = await fetch(`/api/lc/${encodeURIComponent(username.trim())}`, {
            signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.warn('[DevTrack] LC proxy error:', err.error || res.status);
            return null;
        }
        return await res.json();
    } catch (e) {
        console.warn('[DevTrack] LC proxy fetch failed (is the API server running?):', e);
        return null;
    }
}
