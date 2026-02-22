// ─── DevTrack Proxy API Server (zero dependencies) ───────────────────────────
// Uses only Node.js built-in modules. Requires Node 18+ (built-in fetch).
// Run with: node server/index.js
//
// Endpoints:
//   GET /api/cf/:handle     — Codeforces stats + weakTopics
//   GET /api/lc/:username   — LeetCode solved via GraphQL
//   GET /api/gh/:username   — GitHub stats
//   GET /api/health         — Health check

import http from 'http';
import https from 'https';
import { URL } from 'url';

const PORT = 3001;

// ── Tiny JSON fetcher using built-in https ────────────────────────────────────
function httpsGet(urlStr, options = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(urlStr);
        const reqOpts = {
            hostname: u.hostname,
            port: u.port || 443,
            path: u.pathname + u.search,
            method: options.method || 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'DevTrack-App/1.0',
                ...(options.headers || {}),
            },
        };
        const req = https.request(reqOpts, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}`));
                    resolve(JSON.parse(data));
                } catch { reject(new Error('Invalid JSON')); }
            });
        });
        req.on('error', reject);
        req.setTimeout(12000, () => { req.destroy(new Error('Timeout')); });
        if (options.body) req.write(options.body);
        req.end();
    });
}

// ── Simple router ─────────────────────────────────────────────────────────────
const routes = [];
function get(pattern, handler) {
    routes.push({ pattern: new RegExp('^' + pattern.replace(':handle', '([^/]+)').replace(':username', '([^/]+)') + '$'), handler, paramName: pattern.includes(':handle') ? 'handle' : 'username' });
}

function jsonRes(res, status, data) {
    const body = JSON.stringify(data);
    res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET', 'Content-Length': Buffer.byteLength(body) });
    res.end(body);
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

// Health
get('/api/health', async (req, res) => jsonRes(res, 200, { status: 'ok', ts: Date.now() }));

// Codeforces
get('/api/cf/:handle', async (req, res, params) => {
    const handle = params.handle;
    try {
        const [infoData, statusData] = await Promise.all([
            httpsGet(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`),
            httpsGet(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=500`),
        ]);

        if (infoData.status !== 'OK') return jsonRes(res, 404, { error: `CF handle not found: ${handle}` });

        const user = infoData.result[0];
        const submissions = statusData.status === 'OK' ? statusData.result : [];

        const solved = new Set();
        const ninetyDaysAgo = Date.now() - 90 * 86400000;
        const recentDates = new Set();
        const topicAC = {}, topicFail = {};

        for (const sub of submissions) {
            const pid = `${sub.problem?.contestId}_${sub.problem?.index}`;
            const isAC = sub.verdict === 'OK';
            if (isAC) solved.add(pid);
            const tsMs = (sub.creationTimeSeconds || 0) * 1000;
            if (tsMs > ninetyDaysAgo) recentDates.add(new Date(tsMs).toISOString().split('T')[0]);
            for (const tag of (sub.problem?.tags || [])) {
                topicAC[tag] = (topicAC[tag] || 0) + (isAC ? 1 : 0);
                topicFail[tag] = (topicFail[tag] || 0) + (isAC ? 0 : 1);
            }
        }

        const weakTopics = Object.keys(topicAC).filter(t => {
            const total = (topicAC[t] || 0) + (topicFail[t] || 0);
            return total > 2 && topicAC[t] / total < 0.4;
        }).slice(0, 6);

        jsonRes(res, 200, {
            handle: user.handle, rating: user.rating || 0, maxRating: user.maxRating || 0,
            rank: user.rank || 'unrated', maxRank: user.maxRank || 'unrated',
            problemsSolved: solved.size, totalSubmissions: submissions.length,
            recentSubmissionDates: Array.from(recentDates).sort(),
            weakTopics, lastSynced: Date.now(),
        });
    } catch (e) {
        console.error('[CF]', e.message);
        jsonRes(res, 502, { error: e.message });
    }
});

// LeetCode
get('/api/lc/:username', async (req, res, params) => {
    const username = params.username;
    const query = `query getUserProfile($username:String!){matchedUser(username:$username){username profile{ranking}submitStats{acSubmissionNum{difficulty count}}userCalendar{submissionCalendar}}}`;
    try {
        const body = JSON.stringify({ query, variables: { username } });
        const data = await httpsGet('https://leetcode.com/graphql/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com', 'Origin': 'https://leetcode.com' },
            body,
        });

        const user = data?.data?.matchedUser;
        if (!user) return jsonRes(res, 404, { error: `LeetCode user not found: ${username}` });

        const acNums = user.submitStats?.acSubmissionNum || [];
        const getCount = d => acNums.find(x => x.difficulty === d)?.count || 0;

        let submissionDates = [];
        try {
            const cal = JSON.parse(user.userCalendar?.submissionCalendar || '{}');
            submissionDates = Object.keys(cal).map(ts => new Date(parseInt(ts) * 1000).toISOString().split('T')[0]).sort();
        } catch { }

        jsonRes(res, 200, {
            username: user.username, totalSolved: getCount('All'),
            easySolved: getCount('Easy'), mediumSolved: getCount('Medium'), hardSolved: getCount('Hard'),
            ranking: user.profile?.ranking || 0, submissionDates, lastSynced: Date.now(),
        });
    } catch (e) {
        console.error('[LC]', e.message);
        jsonRes(res, 502, { error: e.message });
    }
});

// GitHub
get('/api/gh/:username', async (req, res, params) => {
    const username = params.username;
    const ghToken = process.env.GH_TOKEN || process.env.VITE_GITHUB_TOKEN || '';
    const ghHeaders = { ...(ghToken ? { 'Authorization': `Bearer ${ghToken}` } : {}), 'Accept': 'application/vnd.github.v3+json' };
    try {
        const [user, repos, events] = await Promise.all([
            httpsGet(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers: ghHeaders }),
            httpsGet(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`, { headers: ghHeaders }),
            httpsGet(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`, { headers: ghHeaders }),
        ]);

        const totalStars = repos.reduce((a, r) => a + (r.stargazers_count || 0), 0);
        const langCount = {};
        for (const r of repos) if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
        const topLanguages = Object.entries(langCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([l]) => l);

        const ninetyDaysAgo = Date.now() - 90 * 86400000;
        const thirtyDaysAgo = Date.now() - 30 * 86400000;
        const dates = new Set();
        let totalCommitsEstimate = 0, lastMonthCommits = 0;

        for (const ev of events) {
            if (ev.type !== 'PushEvent') continue;
            const evDate = new Date(ev.created_at).getTime();
            if (evDate < ninetyDaysAgo) continue;
            const commits = ev.payload?.commits?.length || ev.payload?.size || 0;
            totalCommitsEstimate += commits;
            if (evDate >= thirtyDaysAgo) lastMonthCommits += commits;
            dates.add(ev.created_at.split('T')[0]);
        }

        jsonRes(res, 200, {
            username: user.login, publicRepos: user.public_repos || 0,
            followers: user.followers || 0, following: user.following || 0,
            totalStars, totalCommitsEstimate, lastMonthCommits,
            contributionDates: Array.from(dates).sort(), topLanguages, lastSynced: Date.now(),
        });
    } catch (e) {
        console.error('[GH]', e.message);
        jsonRes(res, 502, { error: e.message });
    }
});

// ── HTTP Server ───────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': 'Content-Type' });
        return res.end();
    }
    for (const route of routes) {
        const match = req.url.split('?')[0].match(route.pattern);
        if (match) {
            const params = { [route.paramName]: decodeURIComponent(match[1] || '') };
            return route.handler(req, res, params).catch(e => jsonRes(res, 500, { error: e.message }));
        }
    }
    jsonRes(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
    console.log('\n🚀 DevTrack Proxy API — http://localhost:' + PORT);
    console.log('   /api/cf/:handle   → Codeforces');
    console.log('   /api/lc/:username → LeetCode GraphQL');
    console.log('   /api/gh/:username → GitHub\n');
});
