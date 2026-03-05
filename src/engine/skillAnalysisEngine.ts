// ─── Skill Analysis Engine ──────────────────────────────────────────────────────
// Generates a Knowledge Map based on external platform tags and solved counts.
// Topics are normalized across LeetCode and Codeforces.

import type { CFStats } from '../api/codeforcesApi';
import type { LCStats } from '../api/leetcodeApi';

// Defines the number of problems required in a topic to be considered "100% Mastered"
// Can be adjusted based on difficulty, but we use a flat metric for simplicity.
const MASTERY_THRESHOLD = 30;

// Mapping of platform-specific tags to our unified internal topics.
const TAG_NORMALIZATION_MAP: Record<string, string> = {
    // Arrays & Hashing
    'Array': 'arrays',
    'Hash Table': 'hashing',
    'math': 'math',
    'implementation': 'implementation',
    // Strings
    'String': 'strings',
    'strings': 'strings',
    'string suffix structures': 'strings',
    // Pointers & Window
    'Two Pointers': 'two pointers',
    'two pointers': 'two pointers',
    'Sliding Window': 'sliding window',
    // Binary Search
    'Binary Search': 'binary search',
    'binary search': 'binary search',
    // Recursion & Backtracking
    'Recursion': 'recursion',
    'Backtracking': 'backtracking',
    // Trees & Graphs
    'Tree': 'trees',
    'Binary Tree': 'trees',
    'Binary Search Tree': 'trees',
    'trees': 'trees',
    'Graph': 'graphs',
    'graphs': 'graphs',
    'Depth-First Search': 'graphs',
    'Breadth-First Search': 'graphs',
    'dfs and similar': 'graphs',
    'shortest paths': 'graphs',
    // DP
    'Dynamic Programming': 'dp',
    'dp': 'dp',
    // Greedy
    'Greedy': 'greedy',
    'greedy': 'greedy',
    // Sorting
    'Sorting': 'sorting',
    'sortings': 'sorting',
    // Bit Manipulation
    'Bit Manipulation': 'bit manipulation',
    'bitmasks': 'bit manipulation'
};

const DEFAULT_TOPICS = [
    'arrays', 'strings', 'hashing', 'two pointers', 'sliding window',
    'binary search', 'recursion', 'backtracking', 'trees', 'graphs', 'dp', 'math', 'greedy', 'sorting'
];

export interface KnowledgeMap {
    [topic: string]: number; // 0 to 100 percentage
}

/**
 * Normalizes tags from Codeforces and LeetCode into a single unified map where
 * the values are the estimated mastery probabilities (0-100).
 */
export function generateKnowledgeMap(cf: CFStats | null, lc: LCStats | null): KnowledgeMap {
    const topicProblemCounts: Record<string, number> = {};

    // Initialize all default topics to 0
    DEFAULT_TOPICS.forEach(topic => {
        topicProblemCounts[topic] = 0;
    });

    // 1. Process Codeforces Tags
    if (cf && cf.topicAC) {
        for (const [tag, count] of Object.entries(cf.topicAC)) {
            const normalized = TAG_NORMALIZATION_MAP[tag];
            if (normalized) {
                topicProblemCounts[normalized] = (topicProblemCounts[normalized] || 0) + count;
            }
        }
    }

    // 2. Process LeetCode Tags
    if (lc && lc.tags) {
        for (const [tag, count] of Object.entries(lc.tags)) {
            const normalized = TAG_NORMALIZATION_MAP[tag];
            if (normalized) {
                topicProblemCounts[normalized] = (topicProblemCounts[normalized] || 0) + count;
            }
        }
    }

    // 3. Compute Percentages
    const knowledgeMap: KnowledgeMap = {};
    for (const [topic, count] of Object.entries(topicProblemCounts)) {
        knowledgeMap[topic] = Math.min(100, Math.floor((count / MASTERY_THRESHOLD) * 100));
    }

    return knowledgeMap;
}
