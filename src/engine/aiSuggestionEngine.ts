import type { RoadmapCategory, StudySession, ActivityHistory } from '../types';
import type { AIRecommendation } from './learningStore';
import { calculateConsistencyScore, calculateStreak } from './consistencyEngine';

const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama3-70b-8192';

// ─── Rich Analytics Extraction ────────────────────────────────────────────────
export interface LearningAnalytics {
    consistencyScore: number;
    currentStreak: number;
    sessionsLastWeek: number;
    sessionsWeekBefore: number;
    velocityTrend: 'accelerating' | 'steady' | 'declining' | 'new';
    avgSessionMinutes: number;
    dominantDifficulty: string;
    topCategory: string;
    weakCategories: string[];
    completedTopics: number;
    totalTopics: number;
    completedMicroTasks: number;
    totalMicroTasks: number;
    burnoutRisk: 'high' | 'medium' | 'low';
    nextUnlockedTopic: string | null;
    nextUnlockedMicroTask: string | null;
    studyPatternByDay: Record<string, number>;
    longestSession: number;
    recentTopics: string[];
}

export function extractLearningAnalytics(
    roadmap: RoadmapCategory[],
    sessions: StudySession[],
    history: ActivityHistory
): LearningAnalytics {
    const now = new Date();
    const oneWeekAgo = new Date(now); oneWeekAgo.setDate(now.getDate() - 7);
    const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(now.getDate() - 14);

    const sessionsLastWeek = sessions.filter(s => new Date(s.date) >= oneWeekAgo).length;
    const sessionsWeekBefore = sessions.filter(s => {
        const d = new Date(s.date); return d >= twoWeeksAgo && d < oneWeekAgo;
    }).length;

    let velocityTrend: LearningAnalytics['velocityTrend'] = 'new';
    if (sessions.length >= 3) {
        if (sessionsLastWeek > sessionsWeekBefore * 1.2) velocityTrend = 'accelerating';
        else if (sessionsLastWeek < sessionsWeekBefore * 0.8) velocityTrend = 'declining';
        else velocityTrend = 'steady';
    }

    const avgSessionMinutes = sessions.length > 0
        ? Math.round(sessions.reduce((a, s) => a + s.durationMinutes, 0) / sessions.length)
        : 0;

    const catCount: Record<string, number> = {};
    const diffCount: Record<string, number> = {};
    const dayCount: Record<string, number> = {};
    sessions.forEach(s => {
        catCount[s.category] = (catCount[s.category] || 0) + 1;
        diffCount[s.difficulty] = (diffCount[s.difficulty] || 0) + 1;
        const day = new Date(s.date).toLocaleDateString('en', { weekday: 'short' });
        dayCount[day] = (dayCount[day] || 0) + 1;
    });

    const sortedCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]);
    const topCategory = sortedCats[0]?.[0] || 'None';
    const weakCategories = sortedCats.slice(1).map(([k]) => k);

    const dominantDifficulty = Object.entries(diffCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Medium';

    const completedTopics = roadmap.reduce((a, c) => a + c.topics.filter(t => t.completed).length, 0);
    const totalTopics = roadmap.reduce((a, c) => a + c.topics.length, 0);
    const completedMicroTasks = roadmap.reduce((a, c) =>
        a + c.topics.reduce((ta, t) => ta + (t.tasks?.filter((tk: any) => tk.completed).length || 0), 0), 0);
    const totalMicroTasks = roadmap.reduce((a, c) =>
        a + c.topics.reduce((ta, t) => ta + (t.tasks?.length || 0), 0), 0);

    // Burnout risk: 5+ sessions in 3 days or 3 same-topic in a row
    const recentSessions = [...sessions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
    const recentSameCategory = recentSessions.slice(0, 3).every(s => s.category === recentSessions[0]?.category);
    const highVolumeRecent = sessions.filter(s => {
        const d = new Date(s.date); const threeDays = new Date(now); threeDays.setDate(now.getDate() - 3);
        return d >= threeDays;
    }).length >= 5;
    const burnoutRisk: LearningAnalytics['burnoutRisk'] = highVolumeRecent ? 'high' : recentSameCategory ? 'medium' : 'low';

    // Next unlocked topic and micro-task
    let nextUnlockedTopic: string | null = null;
    let nextUnlockedMicroTask: string | null = null;
    for (const cat of roadmap) {
        for (const topic of cat.topics) {
            if (!topic.unlocked || topic.completed) continue;
            if (!nextUnlockedTopic) nextUnlockedTopic = `${cat.title} → ${topic.title}`;
            if (topic.tasks) {
                const undoneMicro = (topic.tasks as any[]).find((t: any) => !t.completed);
                if (undoneMicro && !nextUnlockedMicroTask) {
                    nextUnlockedMicroTask = `${topic.title} → ${undoneMicro.title}`;
                }
            }
        }
        if (nextUnlockedTopic && (nextUnlockedMicroTask || true)) break;
    }

    return {
        consistencyScore: calculateConsistencyScore(history),
        currentStreak: calculateStreak(history),
        sessionsLastWeek,
        sessionsWeekBefore,
        velocityTrend,
        avgSessionMinutes,
        dominantDifficulty,
        topCategory,
        weakCategories,
        completedTopics,
        totalTopics,
        completedMicroTasks,
        totalMicroTasks,
        burnoutRisk,
        nextUnlockedTopic,
        nextUnlockedMicroTask,
        studyPatternByDay: dayCount,
        longestSession: sessions.reduce((m, s) => Math.max(m, s.durationMinutes), 0),
        recentTopics: recentSessions.map(s => s.topic).slice(0, 5),
    };
}

// ─── Build Rich Groq Prompt ───────────────────────────────────────────────────
function buildPrompt(analytics: LearningAnalytics, sessions: StudySession[]): string {
    const completionPct = analytics.totalTopics > 0
        ? Math.round((analytics.completedTopics / analytics.totalTopics) * 100) : 0;
    const microTaskPct = analytics.totalMicroTasks > 0
        ? Math.round((analytics.completedMicroTasks / analytics.totalMicroTasks) * 100) : 0;

    return `You are an elite SDE coaching AI for a developer. Analyze this learning profile and provide a precision recommendation.

## CURRENT METRICS
- Consistency Score: ${analytics.consistencyScore}% (last 30 days)
- Current Streak: ${analytics.currentStreak} days
- Sessions This Week: ${analytics.sessionsLastWeek} | Last Week: ${analytics.sessionsWeekBefore}
- Velocity Trend: ${analytics.velocityTrend}
- Avg Session Length: ${analytics.avgSessionMinutes} min | Longest: ${analytics.longestSession} min
- Burnout Risk: ${analytics.burnoutRisk}

## ROADMAP PROGRESS  
- Topics Completed: ${analytics.completedTopics}/${analytics.totalTopics} (${completionPct}%)
- Micro-Tasks Done: ${analytics.completedMicroTasks}/${analytics.totalMicroTasks} (${microTaskPct}%)
- Dominant Category: ${analytics.topCategory}
- Under-developed Areas: ${analytics.weakCategories.slice(0, 3).join(', ') || 'None'}

## NEXT UNLOCKED
- Topic: ${analytics.nextUnlockedTopic || 'All complete!'}
- Micro-task: ${analytics.nextUnlockedMicroTask || 'None'}

## RECENT SESSIONS (last 5)
${sessions.slice(-5).map(s => `- ${s.topic} | ${s.durationMinutes}min | ${s.difficulty}`).join('\n') || '- None yet'}

Based on this deep analysis, provide ONE precise recommendation. Consider:
1. If burnout risk is HIGH → recommend a shorter, lighter session or different category
2. If velocity is declining → recommend motivation boost with an achievable win
3. If consistency is low (<40%) → recommend building habit with short daily sessions
4. If accelerating → push to harder challenges
5. Always prefer the next sequential micro-task if one exists

Respond ONLY with valid JSON, nothing else:
{
  "topic": "Exact topic or micro-task name",
  "reason": "2-sentence coaching insight using their specific data",
  "estimatedTime": "X-Y mins",
  "urgency": "high|medium|low",
  "coachingNote": "One actionable tip based on their pattern"
}`;
}

// ─── Call Groq API ────────────────────────────────────────────────────────────
async function callGroqAPI(prompt: string): Promise<Partial<AIRecommendation> | null> {
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
                max_tokens: 350,
                temperature: 0.25,
            }),
        });
        if (!response.ok) return null;
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) return null;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        const parsed = JSON.parse(jsonMatch[0]);
        if (!parsed.topic) return null;
        return parsed;
    } catch { return null; }
}

// ─── Deterministic Fallback ───────────────────────────────────────────────────
function deterministicRecommendation(analytics: LearningAnalytics): AIRecommendation {
    let topic = analytics.nextUnlockedMicroTask || analytics.nextUnlockedTopic || 'Revision & Practice';
    let reason = '';
    let coachingNote = '';
    const urgency: AIRecommendation['urgency'] = analytics.burnoutRisk === 'high' ? 'low' : 'medium';

    if (analytics.burnoutRisk === 'high') {
        reason = `You've been studying intensely. A lighter session will consolidate your memory better than pushing harder right now.`;
        coachingNote = 'Try a 25-minute review session today instead of learning new material.';
    } else if (analytics.velocityTrend === 'declining') {
        reason = `Your session frequency dropped this week. Getting one small win today rebuilds momentum.`;
        coachingNote = 'Set a 30-minute timer — starting is the hardest part.';
    } else if (analytics.consistencyScore < 40) {
        reason = `Consistency is at ${analytics.consistencyScore}%. Even 20 minutes daily beats long sporadic sessions.`;
        coachingNote = 'Pick a fixed daily time slot and protect it like a meeting.';
    } else {
        reason = `You're on a ${analytics.currentStreak}-day streak. Continue your momentum on the next sequential objective.`;
        coachingNote = analytics.avgSessionMinutes > 0 ? `Your avg session is ${analytics.avgSessionMinutes}m — optimal range.` : 'Aim for 45-60 minute focused sessions.';
    }

    return { topic, reason, estimatedTime: '30-60 mins', urgency, coachingNote, cachedAt: Date.now() };
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export async function getAIRecommendation(
    roadmap: RoadmapCategory[],
    sessions: StudySession[],
    activityHistory: ActivityHistory,
    cached: AIRecommendation | null
): Promise<AIRecommendation> {
    // Return valid cache
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return cached;

    const analytics = extractLearningAnalytics(roadmap, sessions, activityHistory);
    const prompt = buildPrompt(analytics, sessions);
    const groqResult = await callGroqAPI(prompt);

    if (groqResult?.topic) {
        return {
            topic: groqResult.topic,
            reason: groqResult.reason || '',
            estimatedTime: groqResult.estimatedTime || '45-60 mins',
            urgency: (groqResult as any).urgency || 'medium',
            coachingNote: (groqResult as any).coachingNote || '',
            cachedAt: Date.now(),
        };
    }

    return deterministicRecommendation(analytics);
}

export { extractLearningAnalytics as analyzeLearningData };
