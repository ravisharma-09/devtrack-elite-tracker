/**
 * DSA Suggestion Engine
 *
 * Produces TWO structured DSA recommendation tracks per user:
 *  A) Rating Progression — CF problems near user's current rating to push rating up.
 *  B) Topic Mastery      — Structured topic problems based on roadmap + problem_attempts.
 *
 * Never random. Always deterministic and grounded in real user data.
 */

import { getSupabaseClient } from '../backend/supabaseClient';
import problemBank from '../data/problemBank.json';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DSAProblem {
    name: string;
    link: string;
    topic: string;
    rating: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface RatingProgressionTrack {
    section: 'Rating Progression';
    targetRange: string;
    cfHandle: string;
    currentRating: number;
    rank: string;
    problemsSolved: number;
    problems: DSAProblem[];
}

export interface TopicMasteryTrack {
    section: 'Topic Mastery';
    currentTopic: string;
    roadmapProgress: number;       // 0-100%
    successRate: number;           // % from problem_attempts
    patternFocus: string[];
    problems: DSAProblem[];
    nextTopicSuggestion?: string;
}

export interface DSASuggestionResult {
    ratingProgression: RatingProgressionTrack | null;
    topicMastery: TopicMasteryTrack | null;
    error?: string;                // If we can't generate — show message instead
}

// ── Ordered topic progression (for Topic Mastery next-topic logic) ────────────
const TOPIC_ORDER = [
    'Math', 'Implementation', 'Strings', 'Sorting', 'Greedy',
    'Bit Manipulation', 'Prefix Sum', 'Binary Search', 'Two Pointers',
    'Number Theory', 'Arrays', 'Recursion', 'Graphs', 'Trees', 'DP',
    'Geometry', 'Permutations',
];

// ── Main Engine ───────────────────────────────────────────────────────────────

export async function runDSASuggestionEngine(userId: string): Promise<DSASuggestionResult> {
    const supabase = await getSupabaseClient();
    if (!supabase) return { ratingProgression: null, topicMastery: null, error: 'Supabase not configured.' };

    // 1. Load user handles from users table
    const { data: userRow } = await supabase
        .from('users')
        .select('codeforces_handle, leetcode_username')
        .eq('id', userId)
        .single();

    const cfHandle = userRow?.codeforces_handle?.trim() || '';

    // 2. Load real CF stats from external_stats
    const { data: extRow } = await supabase
        .from('external_stats')
        .select('cf, lc')
        .eq('user_id', userId)
        .single();

    const cfStats = extRow?.cf || null;
    const cfRating: number = cfStats?.rating || 0;

    // Validation gate — don't generate if we have no CF data
    if (!cfHandle || !cfRating) {
        return {
            ratingProgression: null,
            topicMastery: null,
            error: 'Connect your Codeforces handle in Profile and click "Connect" to generate structured recommendations.'
        };
    }

    // 3. Load problem_attempts for topic stats
    const { data: attempts } = await supabase
        .from('problem_attempts')
        .select('topic, verdict, rating')
        .eq('user_id', userId);

    const topicStats = buildTopicStats(attempts || []);

    // 4. Load roadmap progress
    const { data: roadmapRows } = await supabase
        .from('roadmap_progress')
        .select('topic_id, progress, completed')
        .eq('user_id', userId);

    const activeTopic = findActiveTopic(roadmapRows || [], topicStats);

    // 5. Build Section A — Rating Progression
    const ratingProgression = buildRatingProgression(cfStats, cfHandle);

    // 6. Build Section B — Topic Mastery
    const topicMastery = buildTopicMastery(activeTopic, topicStats, roadmapRows || []);

    return { ratingProgression, topicMastery };
}

// ── Section A: Rating Progression ────────────────────────────────────────────

function buildRatingProgression(cfStats: any, cfHandle: string): RatingProgressionTrack {
    const rating: number = cfStats?.rating || 800;
    const rank: string = cfStats?.rank || 'unrated';
    const solved: number = cfStats?.problemsSolved || 0;

    // Determine target windows based on rating band
    let windows: Array<{ offset: number; count: number }>;
    if (rating < 1200) {
        windows = [{ offset: 0, count: 2 }, { offset: 100, count: 2 }, { offset: 200, count: 1 }];
    } else if (rating < 1600) {
        windows = [{ offset: 100, count: 3 }, { offset: 200, count: 2 }];
    } else {
        windows = [{ offset: 200, count: 3 }, { offset: 300, count: 2 }];
    }

    const problems: DSAProblem[] = [];
    const usedNames = new Set<string>();

    for (const w of windows) {
        const lo = rating + w.offset - 50;
        const hi = rating + w.offset + 50;
        const pool = (problemBank as any[]).filter(p => p.rating >= lo && p.rating <= hi);
        // Sort deterministically by name, not randomly
        pool.sort((a, b) => a.name.localeCompare(b.name));
        let added = 0;
        for (const p of pool) {
            if (added >= w.count) break;
            if (usedNames.has(p.name)) continue;
            usedNames.add(p.name);
            problems.push(toDSAProblem(p));
            added++;
        }
    }

    // If bank had nothing, generate Codeforces problemset links dynamically
    if (problems.length === 0) {
        const tags = ['implementation', 'math', 'greedy', 'strings'];
        for (let i = 0; i < 5 && i < tags.length; i++) {
            problems.push({
                name: `CF Problemset — ${tags[i]} @${rating}`,
                link: `https://codeforces.com/problemset?tags=${tags[i]}&order=BY_RATING_ASC`,
                topic: capitalize(tags[i]),
                rating,
                difficulty: ratingToDifficulty(rating),
            });
        }
    }

    const loTarget = rating + (windows[0]?.offset || 0);
    const hiTarget = rating + (windows[windows.length - 1]?.offset || 200) + 100;

    return {
        section: 'Rating Progression',
        targetRange: `${loTarget}–${hiTarget}`,
        cfHandle,
        currentRating: rating,
        rank,
        problemsSolved: solved,
        problems,
    };
}

// ── Section B: Topic Mastery ──────────────────────────────────────────────────

function buildTopicMastery(
    activeTopic: string,
    topicStats: Record<string, { total: number; ac: number; avgRating: number }>,
    roadmapRows: any[]
): TopicMasteryTrack {
    const stats = topicStats[activeTopic] || { total: 0, ac: 0, avgRating: 800 };
    const successRate = stats.total > 0 ? Math.round((stats.ac / stats.total) * 100) : 0;
    const roadmapRow = roadmapRows.find(r => r.topic_id?.toLowerCase().includes(activeTopic.toLowerCase()));
    const roadmapProgress: number = roadmapRow?.progress || 0;

    // Determine pattern focus based on weakness
    const isWeak = successRate < 50 || stats.total < 3;
    const patternFocus = getPatternFocus(activeTopic, isWeak);

    // Find problems for the active topic
    const topicPool = (problemBank as any[]).filter(p =>
        p.topic.toLowerCase() === activeTopic.toLowerCase()
    );
    topicPool.sort((a, b) => a.rating - b.rating); // ascending by difficulty

    const problems: DSAProblem[] = topicPool.slice(0, 5).map(toDSAProblem);

    // If we have no problems in bank for this topic, generate CF tag links
    if (problems.length === 0) {
        const tagKey = activeTopic.toLowerCase().replace(/ /g, '+');
        for (let i = 0; i < 3; i++) {
            problems.push({
                name: `CF ${activeTopic} Practice #${i + 1}`,
                link: `https://codeforces.com/problemset?tags=${tagKey}&order=BY_RATING_ASC`,
                topic: activeTopic,
                rating: 800 + i * 100,
                difficulty: ratingToDifficulty(800 + i * 100),
            });
        }
    }

    // Next topic suggestion
    const currentIdx = TOPIC_ORDER.findIndex(t => t.toLowerCase() === activeTopic.toLowerCase());
    const nextTopicSuggestion = roadmapProgress >= 80 && currentIdx >= 0
        ? TOPIC_ORDER[currentIdx + 1] || undefined
        : undefined;

    return {
        section: 'Topic Mastery',
        currentTopic: activeTopic,
        roadmapProgress,
        successRate,
        patternFocus,
        problems,
        nextTopicSuggestion,
    };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

interface TopicStat { total: number; ac: number; avgRating: number }

function buildTopicStats(attempts: any[]): Record<string, TopicStat> {
    const stats: Record<string, TopicStat> = {};
    for (const a of attempts) {
        const t = a.topic || 'Unknown';
        if (!stats[t]) stats[t] = { total: 0, ac: 0, avgRating: 0 };
        stats[t].total++;
        if (a.verdict === 'AC' || a.verdict === 'OK') stats[t].ac++;
        stats[t].avgRating = ((stats[t].avgRating * (stats[t].total - 1)) + (a.rating || 800)) / stats[t].total;
    }
    return stats;
}

function findActiveTopic(
    roadmapRows: any[],
    topicStats: Record<string, TopicStat>
): string {
    // Find the first roadmap topic that's in-progress (0 < progress < 100)
    const inProgress = roadmapRows
        .filter(r => !r.completed && (r.progress || 0) > 0)
        .sort((a, b) => (b.progress || 0) - (a.progress || 0));

    if (inProgress.length > 0) {
        const topic = inProgress[0].topic_id || '';
        // Convert snake_case/slug to Title Case
        return topic.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Math';
    }

    // Otherwise find the topic with the most attempts but worst success rate
    const weakest = Object.entries(topicStats)
        .sort(([, a], [, b]) => (a.ac / Math.max(a.total, 1)) - (b.ac / Math.max(b.total, 1)));

    return weakest[0]?.[0] || 'Math';
}

function getPatternFocus(topic: string, isWeak: boolean): string[] {
    const patterns: Record<string, string[]> = {
        'Math': ['Modular Arithmetic', 'GCD/LCM', 'Prime Sieve', 'Number Properties'],
        'Strings': ['Two Pointers', 'Sliding Window', 'Pattern Matching', 'Palindromes'],
        'Arrays': ['Prefix Sum', 'Two Pointers', 'Sliding Window', 'Sorting Logic', 'Edge Cases'],
        'Greedy': ['Interval Scheduling', 'Exchange Argument', 'Greedy Proof'],
        'Graphs': ['BFS', 'DFS', 'Shortest Path', 'Connected Components'],
        'DP': ['Memoization', 'Bottom-Up', 'State Design', 'Subset DP'],
        'Binary Search': ['Lower Bound', 'Upper Bound', 'Binary Search on Answer'],
        'Sorting': ['Comparison Sorts', 'Counting Sort', 'Merge Sort Variants'],
        'Implementation': ['Simulation', 'Careful Case Analysis', 'Off-by-One'],
        'Bit Manipulation': ['XOR Properties', 'Bit Masking', 'Bit Counting'],
        'Trees': ['Tree DFS', 'Tree BFS', 'Diameter', 'LCA'],
        'Number Theory': ['Prime Factorization', 'Euler Totient', 'Modular Inverse'],
        'Recursion': ['Divide & Conquer', 'Backtracking', 'Base Cases'],
    };
    const all = patterns[topic] || ['General Problem Solving', 'Edge Cases'];
    return isWeak ? all : all.slice(0, 2); // fewer hints if already strong
}

function toDSAProblem(p: any): DSAProblem {
    return {
        name: p.name,
        link: p.link,
        topic: p.topic,
        rating: p.rating,
        difficulty: ratingToDifficulty(p.rating),
    };
}

function ratingToDifficulty(r: number): 'Easy' | 'Medium' | 'Hard' {
    if (r >= 1500) return 'Hard';
    if (r >= 1200) return 'Medium';
    return 'Easy';
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}
