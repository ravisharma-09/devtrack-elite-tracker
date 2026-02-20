// ─── Analytics Engine ─────────────────────────────────────────────────────────
// Combines DevTrack internal data + external platform stats into a unified
// skill profile. This is the single source of truth for statistics.

import type { RoadmapCategory, StudySession, ActivityHistory } from '../types';
import type { CFStats } from '../api/codeforcesApi';
import type { LCStats } from '../api/leetcodeApi';
import type { GHStats } from '../api/githubApi';
import { calculateConsistencyScore } from './consistencyEngine';

export interface SkillProfile {
    // DSA & Problem Solving (CF + LC + roadmap)
    dsaScore: number;           // 0-100
    cfRating: number;
    cfMaxRating: number;
    cfRank: string;
    lcTotalSolved: number;
    lcEasySolved: number;
    lcMediumSolved: number;
    lcHardSolved: number;
    totalProblemsSolved: number;

    // Development (GitHub)
    developmentScore: number;   // 0-100
    ghPublicRepos: number;
    ghLastMonthCommits: number;
    ghTotalStars: number;
    ghTopLanguages: string[];

    // Consistency (all sources combined)
    consistencyScore: number;   // 0-100
    studyStreakDays: number;
    devtrackSessions: number;

    // Learning velocity (topics/week)
    learningVelocity: number;

    // Composite
    overallScore: number;       // 0-100 weighted

    // Unified heatmap data: date → { devtrack, cf, gh }
    unifiedActivity: Record<string, { devtrack: boolean; cf: boolean; gh: boolean }>;

    // Data for Recharts
    topicMasteryData: { topic: string; score: number }[];
    velocityHistory: { week: string; problemsSolved: number }[];
}

const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

export function isStale(lastSynced: number | undefined | null): boolean {
    if (!lastSynced) return true;
    return Date.now() - lastSynced > STALE_MS;
}

// ─── Compute DSA Score (0-100) ────────────────────────────────────────────────
function computeDSAScore(
    cfRating: number,
    lcTotal: number,
    roadmapTopicsCompleted: number,
    roadmapTotal: number
): number {
    // CF: 0-3500 → 0-40 points
    const cfPts = Math.min(40, Math.round((cfRating / 3500) * 40));
    // LC: 0-3000 solved → 0-35 points
    const lcPts = Math.min(35, Math.round((lcTotal / 3000) * 35));
    // Roadmap: completion % → 0-25 points
    const roadPct = roadmapTotal > 0 ? roadmapTopicsCompleted / roadmapTotal : 0;
    const roadPts = Math.round(roadPct * 25);
    return Math.min(100, cfPts + lcPts + roadPts);
}

// ─── Compute Dev Score (0-100) ────────────────────────────────────────────────
function computeDevScore(gh: GHStats | null): number {
    if (!gh) return 0;
    // Repos: 0-50 → 0-30 pts
    const repoPts = Math.min(30, Math.round((gh.publicRepos / 50) * 30));
    // Last month commits: 0-100 → 0-40 pts
    const commitPts = Math.min(40, Math.round((gh.lastMonthCommits / 100) * 40));
    // Stars: 0-200 → 0-30 pts
    const starPts = Math.min(30, Math.round((gh.totalStars / 200) * 30));
    return Math.min(100, repoPts + commitPts + starPts);
}

// ─── Build Unified Activity Map ───────────────────────────────────────────────
function buildUnifiedActivity(
    devtrackHistory: ActivityHistory,
    cfDates: string[],
    ghDates: string[],
    lcDates: string[]
): Record<string, { devtrack: boolean; cf: boolean; gh: boolean }> {
    const result: Record<string, { devtrack: boolean; cf: boolean; gh: boolean }> = {};

    const addEntry = (date: string, source: 'devtrack' | 'cf' | 'gh') => {
        if (!result[date]) result[date] = { devtrack: false, cf: false, gh: false };
        result[date][source] = true;
    };

    Object.keys(devtrackHistory).forEach(d => addEntry(d, 'devtrack'));
    cfDates.forEach(d => addEntry(d, 'cf'));
    ghDates.forEach(d => addEntry(d, 'gh'));
    lcDates.forEach(d => addEntry(d, 'cf')); // LC activity merges into cf slot visually

    return result;
}

// ─── Main Compute ─────────────────────────────────────────────────────────────
export function computeSkillProfile(
    roadmap: RoadmapCategory[],
    sessions: StudySession[],
    activityHistory: ActivityHistory,
    cf: CFStats | null,
    lc: LCStats | null,
    gh: GHStats | null
): SkillProfile {
    const roadmapTotal = roadmap.reduce((a, c) => a + c.topics.length, 0);
    const roadmapCompleted = roadmap.reduce((a, c) => a + c.topics.filter(t => t.completed).length, 0);

    // Calculate Radar Chart Data (Topic Mastery)
    const topicMasteryData: { topic: string; score: number }[] = [];
    roadmap.forEach(cat => {
        cat.topics.forEach(t => {
            if (t.progress > 0 || t.targetCount) {
                const target = t.targetCount || 10;
                const score = Math.min(100, Math.round((t.progress / target) * 100));
                topicMasteryData.push({ topic: t.title, score });
            }
        });
    });

    // Calculate Bar Chart Data (Velocity History - Problems Solved per Week)
    const velocityHistoryMap: Record<string, number> = {};
    const now = new Date();
    // Default last 4 weeks to 0
    for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        velocityHistoryMap[`W${Math.ceil((d.getDate()) / 7)} ${d.toLocaleString('default', { month: 'short' })}`] = 0;
    }

    // Aggregate roadmap progress instances (simplified via sessions vs activityHistory)
    Object.keys(activityHistory).forEach(dateStr => {
        const d = new Date(dateStr);
        if (now.getTime() - d.getTime() <= 30 * 24 * 60 * 60 * 1000) {
            const weekLabel = `W${Math.ceil((d.getDate()) / 7)} ${d.toLocaleString('default', { month: 'short' })}`;
            if (velocityHistoryMap[weekLabel] !== undefined) {
                velocityHistoryMap[weekLabel] += activityHistory[dateStr].tasksCompleted;
            }
        }
    });

    const velocityHistory = Object.keys(velocityHistoryMap).map(k => ({
        week: k,
        problemsSolved: velocityHistoryMap[k]
    }));

    const cfRating = cf?.rating ?? 0;
    const lcTotal = lc?.totalSolved ?? 0;
    const dsaScore = computeDSAScore(cfRating, lcTotal, roadmapCompleted, roadmapTotal);
    const devScore = computeDevScore(gh);
    const consistency = calculateConsistencyScore(activityHistory);

    // Learning velocity: completed topics in last 2 weeks / 2
    const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const recentSessions = sessions.filter(s => new Date(s.date) >= twoWeeksAgo);
    const velocity = Math.round((recentSessions.length / 2) * 10) / 10;

    // Overall: DSA 40% + Dev 30% + Consistency 30%
    const overall = Math.round(dsaScore * 0.4 + devScore * 0.3 + consistency * 0.3);

    const unifiedActivity = buildUnifiedActivity(
        activityHistory,
        cf?.recentSubmissionDates ?? [],
        gh?.contributionDates ?? [],
        lc?.submissionDates ?? []
    );

    return {
        dsaScore,
        cfRating,
        cfMaxRating: cf?.maxRating ?? 0,
        cfRank: cf?.rank ?? '—',
        lcTotalSolved: lc?.totalSolved ?? 0,
        lcEasySolved: lc?.easySolved ?? 0,
        lcMediumSolved: lc?.mediumSolved ?? 0,
        lcHardSolved: lc?.hardSolved ?? 0,
        totalProblemsSolved: (cf?.problemsSolved ?? 0) + (lc?.totalSolved ?? 0),
        developmentScore: devScore,
        ghPublicRepos: gh?.publicRepos ?? 0,
        ghLastMonthCommits: gh?.lastMonthCommits ?? 0,
        ghTotalStars: gh?.totalStars ?? 0,
        ghTopLanguages: gh?.topLanguages ?? [],
        consistencyScore: consistency,
        studyStreakDays: sessions.length > 0 ? computeStreak(sessions) : 0,
        devtrackSessions: sessions.length,
        learningVelocity: velocity,
        overallScore: overall,
        unifiedActivity,
        topicMasteryData,
        velocityHistory
    };
}

function computeStreak(sessions: StudySession[]): number {
    const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let streak = 0;
    for (let i = 0; i < dates.length; i++) {
        const d = new Date(dates[i]); d.setHours(0, 0, 0, 0);
        const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
        if (diff === i || diff === i + 1) streak++;
        else break;
    }
    return streak;
}
