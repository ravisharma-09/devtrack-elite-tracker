export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const { topic, mastery, rating } = req.query;
    if (!topic) return res.status(400).json({ error: 'Missing topic' });

    const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'Missing Groq API Key on server.' });
    }

    const currentMastery = mastery ? parseInt(mastery) : 0;
    const currentRating = rating ? parseInt(rating) : 1200;

    const systemPrompt = `
You are an elite competitive programming and technical interview coach.
Your student needs a structured practice set for the topic: "${topic}".
Their current mastery of this topic is ${currentMastery}% (0-100 scale).
Their current overall competitive programming rating is ${currentRating}.

Your exact job is to generate a highly-curated list of 10 to 15 high-quality coding problems for them to practice this topic.
The questions MUST:
1. Cover every important pattern within "${topic}" (e.g. for Arrays: traversal, prefix sum, hashing, two pointers, sliding window).
2. Gradually increase in difficulty.
3. Be strictly relevant and highly rated real problems from LeetCode or Codeforces.
4. If their mastery is low (< 50%), focus heavily on foundational and easy/medium problems. If it is high, focus on advanced patterns.

You MUST return ONLY a JSON object with this exact schema:
{
    "topic": "${topic}",
    "description": "A 1-2 sentence coaching comment explaining the focus of this practice set based on their mastery level.",
    "questions": [
        {
            "title": "Exact problem name (e.g., Two Sum)",
            "platform": "LeetCode" | "Codeforces",
            "difficulty": "Easy" | "Medium" | "Hard",
            "topic": "${topic}",
            "pattern": "Specific algorithm pattern (e.g., prefix-sum, two-pointers)",
            "url": "The absolute direct URL to the problem on leetcode.com or codeforces.com"
        }
    ]
}

DO NOT wrap the response in markdown blocks like \`\`\`json. Return pure raw JSON.
Ensure the links are 100% accurate standard URL formats.
    `;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Generate structured practice for ${topic}.` }
                ],
                temperature: 0.3,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error("[Groq] API error:", errBody);
            return res.status(response.status).json({ error: "Groq API error", details: errBody });
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            return res.status(502).json({ error: "Empty content received from Groq" });
        }

        return res.status(200).json(JSON.parse(content));
    } catch (e) {
        console.error("[Groq] Lambda execution failed:", e);
        return res.status(502).json({ error: e.message });
    }
}
