import { useLocalStorage } from '../hooks/useLocalStorage';
import { initialRoadmap } from '../data/roadmapData';
import { initialStatistics } from '../data/statisticsData';
import type { RoadmapCategory, StudySession, ActivityHistory, Statistics, MicroTask } from '../types';
import { logSessionToHistory, getTodayDateString } from './consistencyEngine';
import { applySessionToRoadmap } from './progressEngine';

// ─── V3 Storage Keys ──────────────────────────────────────────────────────────
const KEYS = {
    roadmap: 'devtrack_roadmap_v3',
    sessions: 'devtrack_sessions_v3',
    stats: 'devtrack_stats_v3',
    activity: 'devtrack_activity_v3',
    aiRec: 'devtrack_ai_v3',
};

export interface AIRecommendation {
    topic: string;
    reason: string;
    estimatedTime: string;
    cachedAt: number;
}

// ─── Central Store Hook ───────────────────────────────────────────────────────
export function useLearningStore() {
    const [roadmap, setRoadmap] = useLocalStorage<RoadmapCategory[]>(KEYS.roadmap, initialRoadmap);
    const [studySessions, setStudySessions] = useLocalStorage<StudySession[]>(KEYS.sessions, []);
    const [activityHistory, setActivityHistory] = useLocalStorage<ActivityHistory>(KEYS.activity, {});
    const [statistics, setStatistics] = useLocalStorage<Statistics>(KEYS.stats, initialStatistics);
    const [aiRecommendation, setAIRecommendation] = useLocalStorage<AIRecommendation | null>(KEYS.aiRec, null);

    // ── ACTION: Add Study Session ──────────────────────────────────────────────
    // Cascades to: sessions list → activity history → roadmap progress → statistics
    const addStudySession = (sessionData: Omit<StudySession, 'id' | 'date' | 'timestamp'>) => {
        const today = getTodayDateString();
        const newSession: StudySession = {
            ...sessionData,
            id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            date: today,
            timestamp: Date.now(),
        };

        // 1. Persist session
        setStudySessions(prev => [...prev, newSession]);

        // 2. Update heatmap
        setActivityHistory(prev => logSessionToHistory(prev, newSession));

        // 3. Apply roadmap progress
        const { updatedRoadmap, actualProgressAdded } = applySessionToRoadmap(roadmap, newSession);
        setRoadmap(updatedRoadmap);

        // 4. Update statistics with streak logic
        setStatistics(prev => {
            const todayStr = new Date().toDateString();
            const lastDate = prev.lastActiveDate ? new Date(prev.lastActiveDate) : null;
            const todayDate = new Date();
            todayDate.setHours(0, 0, 0, 0);

            let newStreak = prev.studyStreakDays;
            if (lastDate) {
                lastDate.setHours(0, 0, 0, 0);
                const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / 86400000);
                if (diffDays === 1) newStreak += 1;
                else if (diffDays > 1) newStreak = 1;
            } else {
                newStreak = 1;
            }

            return {
                ...prev,
                totalStudySessions: prev.totalStudySessions + 1,
                totalStudyMinutes: prev.totalStudyMinutes + newSession.durationMinutes,
                totalProblemsSolved: prev.totalProblemsSolved + actualProgressAdded,
                studyStreakDays: newStreak,
                lastActiveDate: prev.lastActiveDate === todayStr ? prev.lastActiveDate : todayStr,
            };
        });

        // 5. Background Supabase sync (non-blocking, silent fail)
        import('./syncEngine').then(({ syncSession }) => {
            syncSession(newSession).catch(() => { });
        });
    };

    // ── ACTION: Complete/Uncomplete a Micro-Task ───────────────────────────────
    // Marks task → checks topic completion → cascades unlock → updates stats
    const completeMicroTask = (categoryId: string, topicId: string, taskId: string, isCompleted: boolean) => {
        setRoadmap(prev => {
            const next: RoadmapCategory[] = JSON.parse(JSON.stringify(prev));
            const cat = next.find(c => c.id === categoryId);
            if (!cat) return prev;

            const topic = cat.topics.find(t => t.id === topicId);
            if (!topic || !topic.tasks) return prev;

            const task = topic.tasks.find((t: MicroTask) => t.id === taskId);
            if (!task || task.completed === isCompleted) return prev;

            task.completed = isCompleted;

            const wasTopicComplete = topic.completed;
            const allTasksDone = topic.tasks.every((t: MicroTask) => t.completed);
            topic.completed = allTasksDone;
            if (allTasksDone) topic.progress = 100;

            // Cascade unlock through all categories
            next.forEach(c => {
                let prevDone = true;
                c.topics.forEach((t, idx) => {
                    t.unlocked = idx === 0 ? true : prevDone;
                    prevDone = t.completed;
                });
            });

            const microDiff = isCompleted ? 1 : -1;
            const topicDiff = allTasksDone && !wasTopicComplete ? 1 : (!allTasksDone && wasTopicComplete ? -1 : 0);

            setStatistics(s => ({
                ...s,
                totalMicroTasksCompleted: (s.totalMicroTasksCompleted || 0) + microDiff,
                totalRoadmapTopicsCompleted: s.totalRoadmapTopicsCompleted + topicDiff,
            }));

            return next;
        });
    };

    // ── ACTION: Update DSA +/- Quantitative Progress ──────────────────────────
    const updateTopicProgress = (categoryId: string, topicId: string, increment: number) => {
        setRoadmap(prev => {
            const next: RoadmapCategory[] = JSON.parse(JSON.stringify(prev));
            const cat = next.find(c => c.id === categoryId);
            if (!cat) return prev;

            const topic = cat.topics.find(t => t.id === topicId);
            if (!topic || !topic.targetCount || !topic.unlocked) return prev;

            const oldProg = topic.progress;
            const newProg = Math.max(0, Math.min(topic.targetCount, topic.progress + increment));
            if (newProg === oldProg) return prev;

            const wasComplete = topic.completed;
            topic.progress = newProg;
            topic.completed = newProg >= topic.targetCount;

            next.forEach(c => {
                let prevDone = true;
                c.topics.forEach((t, idx) => {
                    t.unlocked = idx === 0 ? true : prevDone;
                    prevDone = t.completed;
                });
            });

            const topicDiff = topic.completed && !wasComplete ? 1 : (!topic.completed && wasComplete ? -1 : 0);
            setStatistics(s => ({
                ...s,
                totalProblemsSolved: s.totalProblemsSolved + (newProg - oldProg),
                totalRoadmapTopicsCompleted: s.totalRoadmapTopicsCompleted + topicDiff,
            }));

            return next;
        });
    };

    // ── ACTION: Store AI Recommendation ───────────────────────────────────────
    const storeAIRecommendation = (rec: AIRecommendation) => setAIRecommendation(rec);

    return {
        // ── State
        roadmap,
        studySessions,
        activityHistory,
        statistics,
        aiRecommendation,
        // ── Actions (preferred — never call raw setters from UI)
        addStudySession,
        completeMicroTask,
        updateTopicProgress,
        storeAIRecommendation,
        // ── Raw setters (only for edge cases in Roadmap.tsx toggleTopic)
        setRoadmap,
        setStatistics,
        setActivityHistory,
    };
}
