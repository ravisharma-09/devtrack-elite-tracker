// ─── GitHub Stats — via local proxy server ────────────────────────────────────
// Calls our Express server at /api/gh/:username (proxied by Vite to port 3001)
// Server-side fetch can use a GitHub token if available, increasing rate limit to 5000/hr.

export interface GHStats {
    username: string;
    publicRepos: number;
    followers: number;
    following: number;
    totalStars: number;
    totalCommitsEstimate: number;
    lastMonthCommits: number;
    contributionDates: string[];
    topLanguages: string[];
    lastSynced: number;
}

export async function fetchGitHubStats(username: string): Promise<GHStats | null> {
    if (!username?.trim()) return null;
    try {
        const res = await fetch(`/api/gh/${encodeURIComponent(username.trim())}`, {
            signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.warn('[DevTrack] GH proxy error:', err.error || res.status);
            return null;
        }
        return await res.json();
    } catch (e) {
        console.warn('[DevTrack] GH proxy fetch failed (is the API server running?):', e);
        return null;
    }
}
