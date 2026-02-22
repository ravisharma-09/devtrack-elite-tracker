// ─── Codeforces API — via local proxy server ──────────────────────────────────
// Calls our Express server at /api/cf/:handle (proxied by Vite to port 3001)
// Server-side fetch avoids CF CORS issues and adds weakTopics computation.

export interface CFStats {
    handle: string;
    rating: number;
    maxRating: number;
    rank: string;
    maxRank: string;
    problemsSolved: number;
    totalSubmissions: number;
    recentSubmissionDates: string[];
    weakTopics: string[];
    strongTopics: string[];
    lastSynced: number;
}

export async function fetchCodeforcesStats(handle: string): Promise<CFStats | null> {
    if (!handle?.trim()) return null;
    try {
        const res = await fetch(`/api/cf/${encodeURIComponent(handle.trim())}`, {
            signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            console.warn('[DevTrack] CF proxy error:', err.error || res.status);
            return null;
        }
        return await res.json();
    } catch (e) {
        console.warn('[DevTrack] CF proxy fetch failed (is the API server running?):', e);
        return null;
    }
}
