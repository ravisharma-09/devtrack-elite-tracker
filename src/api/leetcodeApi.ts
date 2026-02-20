// ─── LeetCode Stats via alfa-leetcode-api proxy ───────────────────────────────
// Primary:  https://alfa-leetcode-api.onrender.com/{username}
// Fallback: https://leetcode-stats-api.herokuapp.com/{username}
// LeetCode's own API blocks browser requests (CORS). This proxy is widely used.

export interface LCStats {
    username: string;
    totalSolved: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    ranking: number;
    submissionDates: string[]; // YYYY-MM-DD, from submissionCalendar
    lastSynced: number;
}

const PRIMARY = 'https://leetcode-api-faisalshohag.vercel.app';
const FALLBACK = 'https://leetcode-stats-api.herokuapp.com';

export async function fetchLeetCodeStats(username: string): Promise<LCStats | null> {
    if (!username?.trim()) return null;

    // Try primary proxy first
    try {
        const res = await fetch(`${PRIMARY}/${encodeURIComponent(username.trim())}`, {
            signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
            const data = await res.json();
            if (data?.totalSolved !== undefined || data?.solvedProblem !== undefined) {
                return parseAlfaResponse(username, data);
            }
        }
    } catch { }

    // Fallback proxy
    try {
        const res = await fetch(`${FALLBACK}/${encodeURIComponent(username.trim())}`, {
            signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
            const data = await res.json();
            if (data?.status === 'success' || data?.totalSolved !== undefined) {
                return parseFallbackResponse(username, data);
            }
        }
    } catch { }

    console.warn('[DevTrack] LeetCode fetch failed for:', username);
    return null;
}

function parseAlfaResponse(username: string, d: any): LCStats {
    // Alfa API returns submissionCalendar as { "unixTimestamp": count } object
    const calendar: Record<string, number> = d.submissionCalendar || {};
    const submissionDates = Object.keys(calendar)
        .map(ts => new Date(parseInt(ts) * 1000).toISOString().split('T')[0])
        .sort();

    return {
        username,
        totalSolved: d.solvedProblem ?? d.totalSolved ?? 0,
        easySolved: d.easySolved ?? 0,
        mediumSolved: d.mediumSolved ?? 0,
        hardSolved: d.hardSolved ?? 0,
        ranking: d.ranking ?? 0,
        submissionDates,
        lastSynced: Date.now(),
    };
}

function parseFallbackResponse(username: string, d: any): LCStats {
    return {
        username,
        totalSolved: d.totalSolved ?? 0,
        easySolved: d.easySolved ?? 0,
        mediumSolved: d.mediumSolved ?? 0,
        hardSolved: d.hardSolved ?? 0,
        ranking: d.ranking ?? 0,
        submissionDates: [],
        lastSynced: Date.now(),
    };
}

