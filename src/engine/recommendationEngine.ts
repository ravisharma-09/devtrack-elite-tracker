import type { RoadmapCategory, StudySession } from '../types';
import type { AIRecommendation } from './learningStore';

export interface NextBestAction {
    topic: string;
    category: string;
    reason: string;
    estimatedTime: string;
}

// ─── Deterministic Next Best Action ──────────────────────────────────────────
// Priority: prerequisite-ordered, burnout-detected, micro-task granular
export function calculateNextBestAction(
    roadmap: RoadmapCategory[],
    studySessions: StudySession[]
): NextBestAction | null {
    // Detect burnout: 3 consecutive sessions on same topic
    const recent = [...studySessions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);
    let burnoutCategory: string | null = null;
    if (recent.length === 3 && recent.every(s => s.topic === recent[0].topic)) {
        burnoutCategory = recent[0].category;
    }

    const alternativesExist = burnoutCategory
        ? roadmap.some(c => !c.id.toLowerCase().includes(burnoutCategory!.toLowerCase().replace(/\s/g, ''))
            && c.topics.some(t => t.unlocked && !t.completed))
        : false;

    for (const category of roadmap) {
        const skipForBurnout = burnoutCategory && alternativesExist &&
            category.id.toLowerCase().includes(burnoutCategory.toLowerCase().replace(/\s/g, ''));
        if (skipForBurnout) continue;

        for (const topic of category.topics) {
            if (!topic.unlocked || topic.completed) continue;

            if (topic.tasks && topic.tasks.length > 0) {
                const nextTask = topic.tasks.find((t: any) => !t.completed);
                if (nextTask) {
                    return {
                        topic: `${topic.title} — ${(nextTask as any).title}`,
                        category: category.title,
                        reason: burnoutCategory
                            ? `Burnout detected on ${burnoutCategory}. Pivoting to ${category.title}.`
                            : `Next sequential micro-task in ${topic.title} curriculum.`,
                        estimatedTime: '30-45 mins',
                    };
                }
            } else {
                return {
                    topic: topic.title,
                    category: category.title,
                    reason: burnoutCategory
                        ? `Burnout detected on ${burnoutCategory}. Focusing on ${category.title}.`
                        : `Next unlocked prerequisite in ${category.title} track.`,
                    estimatedTime: topic.estimatedTime || '60-90 mins',
                };
            }
        }
    }

    return null;
}

// ─── Convert AI Recommendation to display format ──────────────────────────────
export function convertAIRecToAction(rec: AIRecommendation): NextBestAction {
    return {
        topic: rec.topic,
        category: 'AI Suggested',
        reason: rec.reason,
        estimatedTime: rec.estimatedTime,
    };
}
