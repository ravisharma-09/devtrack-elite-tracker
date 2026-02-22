export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    const ghToken = process.env.GH_TOKEN || process.env.VITE_GITHUB_TOKEN || '';
    const ghHeaders = {
        ...(ghToken ? { 'Authorization': `Bearer ${ghToken}` } : {}),
        'Accept': 'application/vnd.github.v3+json'
    };

    try {
        const [userRes, reposRes, eventsRes] = await Promise.all([
            fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers: ghHeaders }),
            fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`, { headers: ghHeaders }),
            fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`, { headers: ghHeaders }),
        ]);

        const user = await userRes.json();
        const repos = await reposRes.json();
        const events = await eventsRes.json();

        // Handle error responses from GitHub (e.g., rate limits, not found)
        if (user.message) {
            return res.status(userRes.status === 404 ? 404 : 502).json({ error: user.message });
        }

        const totalStars = Array.isArray(repos) ? repos.reduce((a, r) => a + (r.stargazers_count || 0), 0) : 0;
        const langCount = {};
        if (Array.isArray(repos)) {
            for (const r of repos) {
                if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
            }
        }
        const topLanguages = Object.entries(langCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l]) => l);

        const ninetyDaysAgo = Date.now() - 90 * 86400000;
        const thirtyDaysAgo = Date.now() - 30 * 86400000;
        const dates = new Set();
        let totalCommitsEstimate = 0, lastMonthCommits = 0;

        if (Array.isArray(events)) {
            for (const ev of events) {
                if (ev.type !== 'PushEvent') continue;
                const evDate = new Date(ev.created_at).getTime();
                if (evDate < ninetyDaysAgo) continue;
                const commits = ev.payload?.commits?.length || ev.payload?.size || 0;
                totalCommitsEstimate += commits;
                if (evDate >= thirtyDaysAgo) lastMonthCommits += commits;
                dates.add(ev.created_at.split('T')[0]);
            }
        }

        res.status(200).json({
            username: user.login,
            publicRepos: user.public_repos || 0,
            followers: user.followers || 0,
            following: user.following || 0,
            totalStars,
            totalCommitsEstimate,
            lastMonthCommits,
            contributionDates: Array.from(dates).sort(),
            topLanguages,
            lastSynced: Date.now(),
        });
    } catch (e) {
        console.error('[GH]', e.message);
        res.status(502).json({ error: e.message });
    }
}
