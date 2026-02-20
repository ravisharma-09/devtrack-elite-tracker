import { useLocalStorage } from '../hooks/useLocalStorage';
import { initialRoadmap } from '../data/roadmapData';
import { initialStatistics } from '../data/statisticsData';
import type { RoadmapCategory, StudySession, ActivityHistory, Statistics, MicroTask } from '../types';
import { logSessionToHistory, getTodayDateString } from './consistencyEngine';
import { applySessionToRoadmap } from './progressEngine';

// ─── V3 Storage Keys (user-scoped) ───────────────────────────────────────────
// Each user's data is isolated by userId even in localStorage
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
// userId scopes all storage so two users never share data
export function useLearningStore(userId = 'local') {
    const KEYS = getKeys(userId);

    const [roadmap, setRoadmap] = useLocalStorage<RoadmapCategory[]>(KEYS.roadmap, initialRoadmap);
    const [studySessions, setStudySessions] = useLocalStorage<StudySession[]>(KEYS.sessions, []);
    const [activityHistory, setActivityHistory] = useLocalStorage<ActivityHistory>(KEYS.activity, {});
    const [statistics, setStatistics] = useLocalStorage<Statistics>(KEYS.stats, initialStatistics);
    const [aiRecommendation, setAIRecommendation] = useLocalStorage<AIRecommendation | null>(KEYS.aiRec, null);

    // ── ACTION: Add Study Session ──────────────────────────────────────────────
    const addStudySession = (sessionData: Omit<StudySession, 'id' | 'date' | 'timestamp'>) => {
        const today = getTodayDateString();
        const newSession: StudySession = {
            ...sessionData,
            id: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            date: today,
            timestamp: Date.now(),
        };

        setStudySessions(prev => [...prev, newSession]);
        setActivityHistory(prev => logSessionToHistory(prev, newSession));

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

        // Background Supabase sync
        import('./syncEngine').then(({ syncSession }) => {
            syncSession(newSession, userId).catch(() => { });
        });
    };

    // ── ACTION: Complete/Uncomplete a Micro-Task ───────────────────────────────
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
                c.topics.forEach((t, idx) => { t.unlocked = idx === 0 ? true : prevDone; prevDone = t.completed; });
            });
            setStatistics(s => ({
                ...s,
                totalProblemsSolved: s.totalProblemsSolved + (newProg - oldProg),
                totalRoadmapTopicsCompleted: s.totalRoadmapTopicsCompleted + (topic.completed && !wasComplete ? 1 : !topic.completed && wasComplete ? -1 : 0),
            }));
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
