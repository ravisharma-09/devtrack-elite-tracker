import { useLocalStorage } from '../hooks/useLocalStorage';
import { initialRoadmap } from '../data/roadmapData';
import { initialStatistics } from '../data/statisticsData';
import type { RoadmapCategory, StudySession, ActivityHistory, Statistics, MicroTask } from '../types';
import { logSessionToHistory, getTodayDateString } from './consistencyEngine';
import { applySessionToRoadmap } from './progressEngine';
import { syncSession, syncMicroTask, syncRoadmapTopic, syncActivityLog } from './syncEngine';
import { useAuth } from '../auth/AuthContext';

// ─── Auto-wired hook — use this in all pages ──────────────────────────────────
// Automatically picks up the logged-in user's ID from AuthContext so every page
// reads/writes the correct user's Supabase-backed data without passing userId.
export function useStore() {
    const { user } = useAuth();
    return useLearningStore(user?.id || 'local');
}

// ─── V3 Storage Keys (user-scoped) ───────────────────────────────────────────
function getKeys(userId: string) {
    const uid = userId || 'local';
    return {
        roadmap: `devtrack_roadmap_v3_${uid}`,
        sessions: `devtrack_sessions_v3_${uid}`,
        stats: `devtrack_stats_v3_${uid}`,
        activity: `devtrack_activity_v3_${uid}`,
        aiRec: `devtrack_ai_v3_${uid}`,
    };
}

export interface AIRecommendation {
    topic: string;
    reason: string;
    estimatedTime: string;
    urgency: 'high' | 'medium' | 'low';
    coachingNote: string;
    cachedAt: number;
}

// ─── Central Store Hook ───────────────────────────────────────────────────────
// NOTE: By the time this hook mounts, AuthContext has already hydrated localStorage
// from Supabase via loadAndHydrate(). So localStorage IS the Supabase data.
export function useLearningStore(userId = 'local') {
    const KEYS = getKeys(userId);

    const [roadmap, setRoadmap] = useLocalStorage<RoadmapCategory[]>(KEYS.roadmap, initialRoadmap);
    const [studySessions, setStudySessions] = useLocalStorage<StudySession[]>(KEYS.sessions, []);
    const [activityHistory, setActivityHistory] = useLocalStorage<ActivityHistory>(KEYS.activity, {});
    const [statistics, setStatistics] = useLocalStorage<Statistics>(KEYS.stats, initialStatistics);
    const [aiRecommendation, setAIRecommendation] = useLocalStorage<AIRecommendation | null>(KEYS.aiRec, null);

    // ── ACTION: Add Study Session ──────────────────────────────────────────────
    // Writes to localStorage immediately, then syncs to Supabase
    const addStudySession = (sessionData: Omit<StudySession, 'id' | 'date' | 'timestamp'>) => {
        const today = getTodayDateString();
        const newSession: StudySession = {
            ...sessionData,
            id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            date: today,
            timestamp: Date.now(),
        };

        setStudySessions(prev => [...prev, newSession]);
        const newActivity = logSessionToHistory(activityHistory, newSession);
        setActivityHistory(newActivity);

        const { updatedRoadmap, actualProgressAdded } = applySessionToRoadmap(roadmap, newSession);
        setRoadmap(updatedRoadmap);

        setStatistics(prev => {
            const todayStr = new Date().toDateString();
            const lastDate = prev.lastActiveDate ? new Date(prev.lastActiveDate) : null;
            const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
            let newStreak = prev.studyStreakDays;
            if (lastDate) {
                lastDate.setHours(0, 0, 0, 0);
                const diff = Math.round((todayDate.getTime() - lastDate.getTime()) / 86400000);
                if (diff === 1) newStreak += 1;
                else if (diff > 1) newStreak = 1;
            } else { newStreak = 1; }
            return {
                ...prev,
                totalStudySessions: prev.totalStudySessions + 1,
                totalStudyMinutes: prev.totalStudyMinutes + newSession.durationMinutes,
                totalProblemsSolved: prev.totalProblemsSolved + actualProgressAdded,
                studyStreakDays: newStreak,
                lastActiveDate: prev.lastActiveDate === todayStr ? prev.lastActiveDate : todayStr,
            };
        });

        // ✅ Sync to Supabase (fire-and-forget; localStorage is already updated)
        syncSession(newSession, userId).catch(() => { });
        if (newActivity[today]) {
            syncActivityLog(today, newActivity[today], userId).catch(() => { });
        }
    };

    // ── ACTION: Complete/Uncomplete a Micro-Task ───────────────────────────────
    // Writes to localStorage immediately, then syncs to Supabase
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

            next.forEach(c => {
                let prevDone = true;
                c.topics.forEach((t, idx) => { t.unlocked = idx === 0 ? true : prevDone; prevDone = t.completed; });
            });

            const microDiff = isCompleted ? 1 : -1;
            const topicDiff = allTasksDone && !wasTopicComplete ? 1 : (!allTasksDone && wasTopicComplete ? -1 : 0);
            setStatistics(s => ({
                ...s,
                totalMicroTasksCompleted: (s.totalMicroTasksCompleted || 0) + microDiff,
                totalRoadmapTopicsCompleted: s.totalRoadmapTopicsCompleted + topicDiff,
            }));

            // ✅ Sync micro-task to Supabase
            syncMicroTask(topicId, taskId, isCompleted, userId).catch(() => { });
            // ✅ Sync parent topic progress to Supabase
            syncRoadmapTopic(categoryId, topicId, allTasksDone ? 100 : topic.progress, allTasksDone, userId).catch(() => { });

            return next;
        });
    };

    // ── ACTION: Update DSA +/- Quantitative Progress ──────────────────────────
    // Writes to localStorage immediately, then syncs to Supabase
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
                c.topics.forEach((t, idx) => { t.unlocked = idx === 0 ? true : prevDone; prevDone = t.completed; });
            });

            setStatistics(s => ({
                ...s,
                totalProblemsSolved: s.totalProblemsSolved + (newProg - oldProg),
                totalRoadmapTopicsCompleted: s.totalRoadmapTopicsCompleted +
                    (topic.completed && !wasComplete ? 1 : !topic.completed && wasComplete ? -1 : 0),
            }));

            // ✅ Sync topic progress to Supabase
            syncRoadmapTopic(categoryId, topicId, newProg, topic.completed, userId).catch(() => { });

            return next;
        });
    };

    // ── ACTION: Store AI Recommendation ───────────────────────────────────────
    const storeAIRecommendation = (rec: AIRecommendation) => setAIRecommendation(rec);

    // ── ACTION: Clear Store (called on logout) ─────────────────────────────────
    const clearStore = () => {
        setRoadmap(initialRoadmap);
        setStudySessions([]);
        setActivityHistory({});
        setStatistics(initialStatistics);
        setAIRecommendation(null);
    };

    return {
        roadmap, studySessions, activityHistory, statistics, aiRecommendation,
        addStudySession, completeMicroTask, updateTopicProgress, storeAIRecommendation, clearStore,
        setRoadmap, setStatistics, setActivityHistory,
    };
}
