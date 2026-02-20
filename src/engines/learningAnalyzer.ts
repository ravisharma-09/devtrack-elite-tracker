import type { RoadmapCategory, ActivityHistory, StudySession } from '../types';
import { generateNextBestAction } from './suggestionEngine';
import type { NextBestAction } from './suggestionEngine';

export interface IntelligentAnalysis {
    userLevel: string;
    strength: string;
    weakness: string;
    nextTopic: NextBestAction | null;
}

export function analyzeLearningState(
    roadmap: RoadmapCategory[],
    history: ActivityHistory,
    sessions: StudySession[]
): IntelligentAnalysis {

    const dsa = roadmap.find(c => c.id === 'dsa');
    const webdev = roadmap.find(c => c.id === 'webdev');

    // Calculate generic level score heuristically
    // DSA weight 50%, Web Dev 30%, Consistency 20%

    // 1. Consistency Score
    const todayDate = new Date();
    let activeDays = 0;
    for (let i = 0; i < 30; i++) {
        const d = new Date(todayDate);
        d.setDate(todayDate.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (history[dateStr] && history[dateStr].minutesStudied > 0) {
            activeDays++;
        }
    }
    const consistencyScore = (activeDays / 30) * 100; // max 100

    // 2. DSA & Web Progress Score
    const dsaComplete = dsa?.topics.filter(t => t.completed).length || 0;
    const webComplete = webdev?.topics.filter(t => t.completed).length || 0;
    const dsaTotal = dsa?.topics.length || 1;
    const webTotal = webdev?.topics.length || 1;

    const dsaScore = (dsaComplete / dsaTotal) * 100;
    const webScore = (webComplete / webTotal) * 100;

    const totalScore = (dsaScore * 0.5) + (webScore * 0.3) + (consistencyScore * 0.2);

    let userLevelStr = 'Beginner';
    if (totalScore >= 90) userLevelStr = 'Elite';
    else if (totalScore >= 70) userLevelStr = 'Expert';
    else if (totalScore >= 50) userLevelStr = 'Advanced';
    else if (totalScore >= 30) userLevelStr = 'Intermediate';
    else if (totalScore >= 10) userLevelStr = 'Learner';

    // Extract Strengths and Weaknesses from recent sessions and roadmap progress
    // Heuristic: Most studied category or most progressed is strength. 

    const categoryCount: Record<string, number> = {};
    sessions.forEach(s => {
        categoryCount[s.category] = (categoryCount[s.category] || 0) + 1;
    });

    let strength = 'Establishing Baseline';
    let weakness = 'Systematic Theory';

    if (dsaScore > webScore + 10 || categoryCount['DSA'] > (categoryCount['Web Dev'] || 0)) {
        strength = 'Data Structures & Algorithms';
        weakness = 'Web Architecture';
    } else if (webScore > dsaScore + 10 || categoryCount['Web Dev'] > (categoryCount['DSA'] || 0)) {
        strength = 'Web Architecture';
        weakness = 'Algorithmic Optimization';
    } else if (consistencyScore > 50) {
        strength = 'Execution Consistency';
        weakness = 'Specialized Depth';
    }

    // Next Topic Engine delegation
    const nextTopic = generateNextBestAction(roadmap);

    return {
        userLevel: userLevelStr,
        strength,
        weakness,
        nextTopic
    };
}
