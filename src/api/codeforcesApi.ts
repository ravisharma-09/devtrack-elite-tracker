// ─── Codeforces Official API ──────────────────────────────────────────────────
// Docs: https://codeforces.com/apiHelp

export interface CFStats {
    handle: string;
    rating: number;
    maxRating: number;
    rank: string;
    maxRank: string;
    problemsSolved: number;
    totalSubmissions: number;
    recentSubmissionDates: string[]; // YYYY-MM-DD format, last 90 days
    lastSynced: number;
}

interface CFUserInfo {
    handle: string;
    rating?: number;
    maxRating?: number;
    rank?: string;
    maxRank?: string;
}

interface CFSubmission {
    creationTimeSeconds: number;
    verdict: string;
    problem: { contestId: number; index: string; name: string };
}

export async function fetchCodeforcesStats(handle: string): Promise<CFStats | null> {
    if (!handle?.trim()) return null;

    try {
        const [infoRes, statusRes] = await Promise.all([
            fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`),
            fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=500`),
        ]);

        if (!infoRes.ok || !statusRes.ok) return null;
        const [infoData, statusData] = await Promise.all([infoRes.json(), statusRes.json()]);

        if (infoData.status !== 'OK' || statusData.status !== 'OK') return null;

        const user: CFUserInfo = infoData.result[0];
        const submissions: CFSubmission[] = statusData.result || [];

        // Count unique problems solved (AC verdict)
        const solvedSet = new Set<string>();
        const ninetyDaysAgo = Date.now() / 1000 - 90 * 86400;
        const recentDates = new Set<string>();

        for (const sub of submissions) {
            if (sub.verdict === 'OK') {
                solvedSet.add(`${sub.problem.contestId}_${sub.problem.index}`);
                if (sub.creationTimeSeconds >= ninetyDaysAgo) {
                    const d = new Date(sub.creationTimeSeconds * 1000);
                    recentDates.add(d.toISOString().split('T')[0]);
                }
            }
        }

        return {
            handle: user.handle,
            rating: user.rating ?? 0,
            maxRating: user.maxRating ?? 0,
            rank: user.rank ?? 'unrated',
            maxRank: user.maxRank ?? 'unrated',
            problemsSolved: solvedSet.size,
            totalSubmissions: submissions.length,
            recentSubmissionDates: Array.from(recentDates).sort(),
            lastSynced: Date.now(),
        };
    } catch (e) {
        console.warn('[DevTrack] Codeforces fetch failed:', e);
        return null;
    }
}

