import type { RoadmapCategory, StudySession } from '../types';
import type { AIRecommendation } from './learningStore';

const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama3-70b-8192';

// ─── Build structured context prompt ─────────────────────────────────────────
function buildPrompt(
    roadmap: RoadmapCategory[],
    sessions: StudySession[],
    consistencyScore: number
): string {
    const completedTopics: string[] = [];
    const incompleteTopics: string[] = [];

    roadmap.forEach(cat => {
        cat.topics.forEach(t => {
            if (t.completed) completedTopics.push(`${cat.title} → ${t.title}`);
            else if (t.unlocked) incompleteTopics.push(`${cat.title} → ${t.title}`);
        });
    });

    const categoryCount: Record<string, number> = {};
    sessions.forEach(s => { categoryCount[s.category] = (categoryCount[s.category] || 0) + 1; });
    const sorted = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
    const strongestCategory = sorted[0]?.[0] || 'None';
    const weakestCategory = sorted[sorted.length - 1]?.[0] || 'None';

    const recentTopics = sessions.slice(-5).map(s => s.topic).join(', ') || 'None';

    return `You are an expert SDE learning coach for a developer named Ravi.

Current learning context:
- Consistency score: ${consistencyScore}% (last 30 days)
- Strongest area: ${strongestCategory}
- Weakest/least studied: ${weakestCategory}
- Recently studied: ${recentTopics}
- Completed topics: ${completedTopics.slice(0, 10).join(', ') || 'None yet'}
- Currently unlocked (incomplete): ${incompleteTopics.slice(0, 5).join(', ') || 'None'}

Based on this data, recommend the SINGLE BEST next topic to study right now.

Respond ONLY with valid JSON in this exact format, nothing else:
{
  "topic": "Topic name here",
  "reason": "One sentence explanation",
  "estimatedTime": "X-Y mins"
}`;
}

// ─── Call Groq API ─────────────────────────────────────────────────────────────
async function callGroqAPI(prompt: string): Promise<AIRecommendation | null> {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY as string;
    if (!apiKey || apiKey === 'your-groq-key-here') return null;

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
                temperature: 0.3,
            }),
        });

        if (!response.ok) return null;

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) return null;

        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;

        const parsed = JSON.parse(jsonMatch[0]);
        if (!parsed.topic || !parsed.reason) return null;

        return {
            topic: parsed.topic,
            reason: parsed.reason,
            estimatedTime: parsed.estimatedTime || '45-60 mins',
            cachedAt: Date.now(),
        };
    } catch {
        return null;
    }
}

// ─── Deterministic Fallback ───────────────────────────────────────────────────
function deterministicRecommendation(
    roadmap: RoadmapCategory[],
    sessions: StudySession[]
): AIRecommendation {
    // Burnout detection: 3+ consecutive sessions on same topic
    const recent = sessions.slice(-3);
    const burnoutTopic = recent.length === 3 && recent.every(s => s.topic === recent[0].topic)
        ? recent[0].topic : null;

    for (const cat of roadmap) {
        for (const topic of cat.topics) {
            if (!topic.unlocked || topic.completed) continue;

            // Skip burnout topic if alternatives exist
            if (burnoutTopic && topic.title.toLowerCase().includes(burnoutTopic.toLowerCase())) continue;

            if (topic.tasks && topic.tasks.length > 0) {
                const nextTask = topic.tasks.find((t: any) => !t.completed);
                if (nextTask) {
                    return {
                        topic: `${topic.title}: ${(nextTask as any).title}`,
                        reason: burnoutTopic
                            ? `Switching from ${burnoutTopic} to avoid burnout.`
                            : `Next micro-task in your ${cat.title} progression.`,
                        estimatedTime: '30-45 mins',
                        cachedAt: Date.now(),
                    };
                }
            } else {
                return {
                    topic: topic.title,
                    reason: `Next unlocked topic in ${cat.title}.`,
                    estimatedTime: topic.estimatedTime || '60-90 mins',
                    cachedAt: Date.now(),
                };
            }
        }
    }

    return {
        topic: 'Revision & Practice',
        reason: 'All active roadmap topics complete. Enter revision mode.',
        estimatedTime: '60 mins',
        cachedAt: Date.now(),
    };
}

// ─── Main Export: Get AI Recommendation ───────────────────────────────────────
// Uses cached value if <60 min old. Falls back to deterministic if Groq fails.
export async function getAIRecommendation(
    roadmap: RoadmapCategory[],
    sessions: StudySession[],
    consistencyScore: number,
    cached: AIRecommendation | null
): Promise<AIRecommendation> {
    // Use cache if fresh
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return cached;
    }

    // Try Groq
    const prompt = buildPrompt(roadmap, sessions, consistencyScore);
    const groqResult = await callGroqAPI(prompt);
    if (groqResult) return groqResult;

    // Deterministic fallback
    return deterministicRecommendation(roadmap, sessions);
}
