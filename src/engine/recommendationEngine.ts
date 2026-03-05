import { getSupabaseClient } from '../backend/supabaseClient';
import problemBank from '../data/problemBank.json';
import { generateKnowledgeMap } from './skillAnalysisEngine';
import type { ExternalStats } from './externalSyncEngine';

// Topic progression logic. If topic is > 70%, suggest next in sequence.
const TOPIC_PROGRESSION: Record<string, string[]> = {
    'arrays': ['two pointers', 'hashing'],
    'hashing': ['strings'],
    'strings': ['sliding window'],
    'two pointers': ['sliding window', 'binary search'],
    'sliding window': ['binary search'],
    'binary search': ['sorting', 'greedy'],
    'sorting': ['greedy'],
    'greedy': ['math', 'dp'],
    'recursion': ['backtracking', 'trees'],
    'backtracking': ['dp'],
    'trees': ['graphs'],
    'graphs': ['dp'],
    'dp': ['math']
};

export interface RecommendedProblem {
    name: string;
    link: string;
    topic: string;
    rating: number;
    level: number; // 1 = Foundation, 2 = Building, 3 = Advanced
}

export interface RecommendationResult {
    activeTopic: string;
    masteryPercentage: number;
    recommendedProblems: RecommendedProblem[];
}

export async function runAlgorithmicRecommendationEngine(userId: string, extStats: ExternalStats): Promise<RecommendationResult | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;

    // 1. Generate Knowledge Map
    const knowledgeMap = generateKnowledgeMap(extStats.cf, extStats.lc);

    // 2. Identify the lowest mastery foundation topic to focus on
    let activeTopic = 'arrays'; // default
    let minScore = 100;

    // Check foundation topics first
    const foundationTopics = ['arrays', 'strings', 'hashing', 'two pointers'];
    for (const t of foundationTopics) {
        const score = knowledgeMap[t] || 0;
        if (score < 70 && score < minScore) {
            minScore = score;
            activeTopic = t;
        }
    }

    // Adaptive progression: If user is good at foundation, check progression
    if (minScore >= 70) {
        minScore = 100;
        // Search through the progression tree for the first weakness (< 70%)
        const queue = [...TOPIC_PROGRESSION['arrays']];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (visited.has(current)) continue;
            visited.add(current);

            const score = knowledgeMap[current] || 0;
            if (score < 70) {
                activeTopic = current;
                minScore = score;
                break;
            }

            if (TOPIC_PROGRESSION[current]) {
                queue.push(...TOPIC_PROGRESSION[current]);
            }
        }
    }

    // 3. Filter problem bank for the active topic
    const topicProblems = problemBank.filter(p => p.topic.toLowerCase() === activeTopic.toLowerCase());

    // Sort by difficulty (rating)
    topicProblems.sort((a, b) => (a.rating || 1000) - (b.rating || 1000));

    // 4. Assign structural levels based on difficulty
    const chunk = Math.ceil(topicProblems.length / 3);
    const resultProblems: RecommendedProblem[] = topicProblems.map((p, index) => {
        let level = 1;
        if (index >= chunk && index < chunk * 2) level = 2;
        if (index >= chunk * 2) level = 3;

        return {
            name: p.name,
            link: p.link,
            topic: p.topic,
            rating: p.rating || 1000,
            level
        };
    });

    // We take up to 9 structured problems (3 from each level)
    const structuredRecs = [
        ...resultProblems.filter(p => p.level === 1).slice(0, 3),
        ...resultProblems.filter(p => p.level === 2).slice(0, 3),
        ...resultProblems.filter(p => p.level === 3).slice(0, 3)
    ];

    // Save calculation to cache for UI
    try {
        await supabase.from('ai_analytics_cache').upsert({
            user_id: userId,
            weak_topics: [activeTopic],
            strong_topics: Object.keys(knowledgeMap).filter(k => knowledgeMap[k] >= 80),
            updated_at: new Date().toISOString()
        });
    } catch { }

    return {
        activeTopic,
        masteryPercentage: knowledgeMap[activeTopic] || 0,
        recommendedProblems: structuredRecs
    };
}
