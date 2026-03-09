export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { topic, mastery, rating } = req.query;
    if (!topic) return res.status(400).json({ error: 'Missing topic' });

    try {
        // Dynamically import data to avoid caching issues in serverless
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        
        let datasetPath = path.resolve(__dirname, '../src/data/dsa_dataset.json');
        
        if (!fs.existsSync(datasetPath)) {
             // Fallback for vercel build environment vs local vite proxy
             datasetPath = path.resolve(process.cwd(), 'src/data/dsa_dataset.json');
        }

        const rawData = fs.readFileSync(datasetPath, 'utf8');
        const dataset = JSON.parse(rawData);

        // 1. Filter by topic (case insensitive)
        const topicNorm = topic.toLowerCase().trim();
        const availableTopics = [...new Set(dataset.map(p => p.topic.toLowerCase()))];
        
        // Find closest string match or exact match
        const matchedTopic = availableTopics.find(t => t === topicNorm) 
            || availableTopics.find(t => t.includes(topicNorm) || topicNorm.includes(t));

        if (!matchedTopic) {
            return res.status(404).json({ error: `Topic '${topic}' not found in dataset.` });
        }

        let problems = dataset.filter(p => p.topic.toLowerCase() === matchedTopic);

        // 2. Select difficulty window based on mastery and rating
        const currentMastery = mastery ? parseInt(mastery) : 0;
        const currentRating = rating ? parseInt(rating) : 1200;

        // If mastery is low (<50%), heavily weight towards Easy / 800-1100
        // If mid (50-80%), weight Medium / 1200-1500
        // If high (>80%), weight Hard / 1600+
        let allowedDiffs = [];
        let maxCFRating = 0;
        let minCFRating = 0;

        if (currentMastery < 50) {
            allowedDiffs = ["easy"];
            minCFRating = 800; maxCFRating = 1100;
        } else if (currentMastery < 80) {
            allowedDiffs = ["easy", "medium"];
            minCFRating = 1000; maxCFRating = 1500;
        } else {
            allowedDiffs = ["medium", "hard"];
            minCFRating = 1400; maxCFRating = 2000;
        }

        // Adjust based on CF rating if high (to not serve trivial problems to strong coders)
        if (currentRating > 1400) {
             minCFRating = Math.max(minCFRating, currentRating - 200);
             if (currentRating > 1600) allowedDiffs = ["medium", "hard"];
        }

        let filteredProblems = problems.filter(p => {
             if (p.platform === "leetcode") {
                 return allowedDiffs.includes(p.difficulty);
             } else {
                 return p.cf_rating >= minCFRating && p.cf_rating <= maxCFRating;
             }
        });

        // 3. Group by patterns to form steps
        const patternsMap = {};
        for(const p of filteredProblems) {
             if (!patternsMap[p.pattern]) patternsMap[p.pattern] = [];
             patternsMap[p.pattern].push(p);
        }

        // 4. Build exactly 2 or 3 steps containing 3-4 problems each
        const allPatterns = Object.keys(patternsMap);
        
        // If empty fallback (shouldn't happen with 700 problems)
        if (allPatterns.length === 0) {
            return res.status(200).json({
                topic: problems[0].topic,
                description: "Selected targeted practice core fundamentals.",
                steps: [{
                    stepNumber: 1,
                    patternName: "Core Practice",
                    description: "Mixed fundamental questions.",
                    questions: problems.slice(0, 4).map(({title, platform, difficulty, link}) => ({title, platform, difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1), url: link}))
                }]
            });
        }

        // Shuffle patterns so it's somewhat fresh each load
        allPatterns.sort(() => 0.5 - Math.random());
        const selectedPatterns = allPatterns.slice(0, 3);
        
        const steps = [];
        for (let i = 0; i < selectedPatterns.length; i++) {
             const pattern = selectedPatterns[i];
             const patternProblems = patternsMap[pattern];
             patternProblems.sort(() => 0.5 - Math.random()); // shuffle inside pattern
             
             // Pick up to 4 problems
             const qs = patternProblems.slice(0, 4).map(p => ({
                 title: p.title,
                 platform: p.platform === "leetcode" ? "LeetCode" : "Codeforces",
                 difficulty: p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1),
                 url: p.link
             }));

             steps.push({
                 stepNumber: i + 1,
                 patternName: pattern,
                 description: `Learn to identify and apply the ${pattern} technique to quickly solve this class of problems.`,
                 questions: qs
             });
        }

        const responseObj = {
            topic: problems[0].topic,
            description: `Targeted progression path adapted for your ${currentMastery}% mastery.`,
            steps: steps
        };

        return res.status(200).json(responseObj);

    } catch (e) {
        console.error("Dataset recommendation engine failed:", e);
        return res.status(500).json({ error: e.message });
    }
}
