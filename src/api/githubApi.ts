// ─── GitHub REST API v3 ───────────────────────────────────────────────────────
// Docs: https://docs.github.com/en/rest
// Rate limit: 60/hr unauthenticated, 5000/hr with VITE_GITHUB_TOKEN

export interface GHStats {
    username: string;
    publicRepos: number;
    followers: number;
    following: number;
    totalStars: number;
    totalCommitsEstimate: number; // sum of latest commits across all repos
    lastMonthCommits: number;
    contributionDates: string[]; // YYYY-MM-DD, last 90 days with push activity
    topLanguages: string[];
    lastSynced: number;
}

function ghHeaders(): HeadersInit {
    const token = (import.meta as any).env?.VITE_GITHUB_TOKEN as string | undefined;
    const headers: HeadersInit = { 'Accept': 'application/vnd.github.v3+json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

export async function fetchGitHubStats(username: string): Promise<GHStats | null> {
    if (!username?.trim()) return null;
    const u = username.trim();
    const headers = ghHeaders();

    try {
        const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(u)}`, {
            headers, signal: AbortSignal.timeout(8000),
        });
        if (!userRes.ok) {
            if (userRes.status === 404) console.warn('[DevTrack] GitHub user not found:', u);
            return null;
        }
        const user = await userRes.json();

        // Fetch up to 100 repos sorted by most recently pushed
        const reposRes = await fetch(
            `https://api.github.com/users/${encodeURIComponent(u)}/repos?per_page=100&sort=pushed`,
            { headers, signal: AbortSignal.timeout(8000) }
        );
        const repos: any[] = reposRes.ok ? await reposRes.json() : [];

        const totalStars = repos.reduce((a, r) => a + (r.stargazers_count || 0), 0);

        // Language extraction
        const langCount: Record<string, number> = {};
        for (const r of repos) {
            if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
        }
        const topLanguages = Object.entries(langCount)
            .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l]) => l);

        // Estimate commits from recent push events (last 90 days)
        const eventsRes = await fetch(
            `https://api.github.com/users/${encodeURIComponent(u)}/events/public?per_page=100`,
            { headers, signal: AbortSignal.timeout(8000) }
        );
        const events: any[] = eventsRes.ok ? await eventsRes.json() : [];

        const ninetyDaysAgo = Date.now() - 90 * 86400000;
        const thirtyDaysAgo = Date.now() - 30 * 86400000;
        const contributionDatesSet = new Set<string>();
        let lastMonthCommits = 0;
        let totalCommitsEstimate = 0;

        for (const ev of events) {
            if (ev.type !== 'PushEvent') continue;
            const evDate = new Date(ev.created_at).getTime();
            if (evDate < ninetyDaysAgo) continue;
            const commits: number = ev.payload?.commits?.length || 0;
            totalCommitsEstimate += commits;
            if (evDate >= thirtyDaysAgo) lastMonthCommits += commits;
            contributionDatesSet.add(ev.created_at.split('T')[0]);
        }

        return {
            username: user.login,
            publicRepos: user.public_repos,
            followers: user.followers,
            following: user.following,
            totalStars,
            totalCommitsEstimate,
            lastMonthCommits,
            contributionDates: Array.from(contributionDatesSet).sort(),
            topLanguages,
            lastSynced: Date.now(),
        };
    } catch (e) {
        console.warn('[DevTrack] GitHub fetch failed:', e);
        return null;
    }
}

// ─── Save GH stats to Supabase ────────────────────────────────────────────────
export async function saveGHStatsToSupabase(userId: string, stats: GHStats, supabase: any): Promise<void> {
    await supabase.from('github_stats').upsert({
        user_id: userId,
        username: stats.username,
        public_repos: stats.publicRepos,
        followers: stats.followers,
        total_stars: stats.totalStars,
        total_commits_estimate: stats.totalCommitsEstimate,
        last_month_commits: stats.lastMonthCommits,
        contribution_dates: stats.contributionDates,
        top_languages: stats.topLanguages,
        last_synced: new Date().toISOString(),
    });
}

// ─── Load GH stats from Supabase ──────────────────────────────────────────────
export async function loadGHStats(userId: string, supabase: any): Promise<GHStats | null> {
    const { data } = await supabase.from('github_stats').select('*').eq('user_id', userId).single();
    if (!data) return null;
    return {
        username: data.username,
        publicRepos: data.public_repos,
        followers: data.followers,
        following: 0,
        totalStars: data.total_stars,
        totalCommitsEstimate: data.total_commits_estimate,
        lastMonthCommits: data.last_month_commits,
        contributionDates: data.contribution_dates || [],
        topLanguages: data.top_languages || [],
        lastSynced: new Date(data.last_synced).getTime(),
    };
}
