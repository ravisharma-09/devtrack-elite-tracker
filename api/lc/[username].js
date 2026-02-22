export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { username } = req.query;
    if (!username) return res.status(400).json({ error: 'Missing username' });

    const query = `query getUserProfile($username:String!){matchedUser(username:$username){username profile{ranking}submitStats{acSubmissionNum{difficulty count}}userCalendar{submissionCalendar}}}`;

    try {
        const lcRes = await fetch('https://leetcode.com/graphql/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://leetcode.com',
                'Origin': 'https://leetcode.com'
            },
            body: JSON.stringify({ query, variables: { username } }),
        });

        const data = await lcRes.json();
        const user = data?.data?.matchedUser;
        if (!user) return res.status(404).json({ error: `LeetCode user not found: ${username}` });

        const acNums = user.submitStats?.acSubmissionNum || [];
        const getCount = d => acNums.find(x => x.difficulty === d)?.count || 0;

        let submissionDates = [];
        try {
            const cal = JSON.parse(user.userCalendar?.submissionCalendar || '{}');
            submissionDates = Object.keys(cal).map(ts => new Date(parseInt(ts) * 1000).toISOString().split('T')[0]).sort();
        } catch { }

        res.status(200).json({
            username: user.username,
            totalSolved: getCount('All'),
            easySolved: getCount('Easy'),
            mediumSolved: getCount('Medium'),
            hardSolved: getCount('Hard'),
            ranking: user.profile?.ranking || 0,
            submissionDates,
            lastSynced: Date.now(),
        });
    } catch (e) {
        console.error('[LC]', e.message);
        res.status(502).json({ error: e.message });
    }
}
