export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { handle } = req.query;
    if (!handle) return res.status(400).json({ error: 'Missing handle' });

    try {
        const [infoRes, statusRes] = await Promise.all([
            fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`),
            fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=500`),
        ]);

        const infoData = await infoRes.json();
        const statusData = await statusRes.json();

        if (infoData.status !== 'OK') return res.status(404).json({ error: `CF handle not found: ${handle}` });

        const user = infoData.result[0];
        const submissions = statusData.status === 'OK' ? statusData.result : [];

        const solved = new Set();
        const ninetyDaysAgo = Date.now() - 90 * 86400000;
        const recentDates = new Set();
        const topicAC = {};
        const topicFail = {};

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

        res.status(200).json({
            handle: user.handle,
            rating: user.rating || 0,
            maxRating: user.maxRating || 0,
            rank: user.rank || 'unrated',
            maxRank: user.maxRank || 'unrated',
            problemsSolved: solved.size,
            totalSubmissions: submissions.length,
            recentSubmissionDates: Array.from(recentDates).sort(),
            weakTopics,
            lastSynced: Date.now(),
        });
    } catch (e) {
        console.error('[CF]', e.message);
        res.status(502).json({ error: e.message });
    }
}
