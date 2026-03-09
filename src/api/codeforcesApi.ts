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
    solvedProblemList?: string[];
    totalSubmissions: number;
    recentSubmissionDates: string[];
    topicAC?: Record<string, number>;
    topicFail?: Record<string, number>;
    weakTopics: string[];
    strongTopics: string[];
    lastSynced: number;
}

export async function fetchCodeforcesStats(handle: string): Promise<CFStats | null> {
    if (!handle?.trim()) return null;
    try {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const res = await fetch(`${baseUrl}/api/cf/sync?handle=${encodeURIComponent(handle.trim())}`, {
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
