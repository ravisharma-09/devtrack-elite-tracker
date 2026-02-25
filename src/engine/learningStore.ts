import { useState } from 'react';
import { initialRoadmap } from '../data/roadmapData';
import { initialStatistics } from '../data/statisticsData';
import type { RoadmapCategory, StudySession, ActivityHistory, Statistics, MicroTask } from '../types';
import { logSessionToHistory, getTodayDateString } from './consistencyEngine';
import { applySessionToRoadmap } from './progressEngine';
import { syncSession, syncMicroTask, syncRoadmapTopic, syncActivityLog } from './syncEngine';
import { useAuth } from '../auth/AuthContext';
import { initialTimetable } from '../data/timetableData';
import type { DailyTimetable } from '../types';
import type { GroqTopicAnalysis } from '../ai/groqAnalyticsEngine';
import type { GroqQuestionSuggestions } from '../ai/groqQuestionEngine';
import type { GroqDailyPlan } from '../ai/groqPlannerEngine';

export interface AIAnalyticsPayload {
    analysis: GroqTopicAnalysis | null;
    questions: GroqQuestionSuggestions | null;
    plan: GroqDailyPlan | null;
    lastUpdated: number;
}

// ─── Auto-wired hook — use this in all pages ──────────────────────────────────
import React, { createContext, useContext, useEffect } from 'react';
import { getSupabaseClient } from '../backend/supabaseClient';

const LearningContext = createContext<ReturnType<typeof useLearningStoreBase> | null>(null);

export const LearningProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const store = useLearningStoreBase(user?.id || 'local');

    useEffect(() => {
        if (!user?.id) return;
        let mounted = true;

        const hydrate = async () => {
            const supabase = await getSupabaseClient();
            if (!supabase) return;

            const [sessionsRes, timetableRes, activityRes, roadmapRes, microRes] = await Promise.all([
                supabase.from('study_sessions').select('*').eq('user_id', user.id),
                supabase.from('user_timetable').select('*').eq('user_id', user.id).maybeSingle(),
                supabase.from('activity_log').select('*').eq('user_id', user.id),
                supabase.from('roadmap_progress').select('*').eq('user_id', user.id),
                supabase.from('microtask_progress').select('*').eq('user_id', user.id)
            ]);

            if (!mounted) return;

            let hydratedSessions: StudySession[] = [];
            if (sessionsRes.data) {
                hydratedSessions = sessionsRes.data.map((r: any) => ({
                    id: r.id, topic: r.topic, category: r.category,
                    durationMinutes: r.duration_minutes, difficulty: r.difficulty || 'Medium',
                    notes: r.notes || '', date: r.date,
                    timestamp: new Date(r.created_at).getTime(),
                }));
                store.setStudySessions(hydratedSessions);
            }

            if (timetableRes.data && timetableRes.data.schedule) {
                store.setTimetable(timetableRes.data.schedule);
            }

            if (activityRes.data) {
                const activityLog: ActivityHistory = {};
                activityRes.data.forEach((r: any) => {
                    activityLog[r.date] = { minutesStudied: r.minutes_studied, tasksCompleted: r.tasks_completed, topics: r.topics || [] };
                });
                store.setActivityHistory(activityLog);
            }

            import('./syncEngine').then(({ buildHydratedRoadmap, buildStatistics }) => {
                const hydratedRoadmap = buildHydratedRoadmap(roadmapRes.data || [], microRes.data || []);
                store.setRoadmap(hydratedRoadmap);
                const stats = buildStatistics(hydratedSessions, hydratedRoadmap);
                store.setStatistics(stats);
            });
        };

        hydrate();

        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    return React.createElement(LearningContext.Provider, { value: store }, children);
};

// Automatically picks up the logged-in user's ID from AuthContext so every page
// reads/writes the correct user's Supabase-backed data without passing userId.
export function useStore() {
    const ctx = useContext(LearningContext);
    if (!ctx) throw new Error('useStore must be used inside <LearningProvider>');
    return ctx;
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
function useLearningStoreBase(userId = 'local') {

    const [roadmap, setRoadmap] = useState<RoadmapCategory[]>(initialRoadmap);
    const [studySessions, setStudySessions] = useState<StudySession[]>([]);
    const [activityHistory, setActivityHistory] = useState<ActivityHistory>({});
    const [statistics, setStatistics] = useState<Statistics>(initialStatistics);
    const [aiRecommendation, setAIRecommendation] = useState<AIRecommendation | null>(null);
    const [externalStats, setExternalStats] = useState<any | null>(null);
    const [aiAnalytics, setAiAnalytics] = useState<AIAnalyticsPayload | null>(null);
    const [timetable, setTimetable] = useState<DailyTimetable[]>(initialTimetable);

    // ── Timer State
    const [timerState, setTimerState] = useState<{
        task: { id: string, title: string, category?: StudySession['category'] } | null,
        isRunning: boolean,
        accumulatedSeconds: number,
        lastStartedTimestamp: number | null
    }>({ task: null, isRunning: false, accumulatedSeconds: 0, lastStartedTimestamp: null });

    // ── ACTION: Add Study Session ──────────────────────────────────────────────
    // Writes to localStorage immediately, then syncs to Supabase
    const addStudySession = (sessionData: Omit<StudySession, 'id' | 'timestamp'>) => {
        const today = sessionData.date || getTodayDateString();
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
        syncSession(newSession, userId).then(() => {
            // Trigger background sync to immediately update global stats (skill_score, profiles)
            import('../core/backgroundSync').then(m => m.runBackgroundSync(userId, true));
        }).catch(() => { });
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
        setExternalStats(null);
        setAiAnalytics(null);
        setTimerState({ task: null, isRunning: false, accumulatedSeconds: 0, lastStartedTimestamp: null });
    };

    // ── ACTION: Complete/Uncomplete Timetable Task ──────────────────────────────
    const setTimetableTaskCompleted = (dayIndex: number, taskId: string) => {
        setTimetable(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            if (!next[dayIndex]) return prev;
            const task = next[dayIndex].tasks.find((t: any) => t.id === taskId);
            if (task) {
                task.completed = !task.completed;
            }
            return next;
        });
    };

    // ── ACTION: Timer Controls ──────────────────────────────────────────────────
    const startTimer = (task?: any) => {
        setTimerState(prev => {
            if (task && prev.task?.id !== task.id) {
                return { task: { id: task.id, title: task.title, category: task.category }, isRunning: true, accumulatedSeconds: 0, lastStartedTimestamp: Date.now() };
            }
            if (prev.isRunning) return prev;
            return { ...prev, isRunning: true, lastStartedTimestamp: Date.now() };
        });
    };

    const pauseTimer = () => {
        setTimerState(prev => {
            if (!prev.isRunning) return prev;
            const elapsed = Math.floor((Date.now() - (prev.lastStartedTimestamp || Date.now())) / 1000);
            return { ...prev, isRunning: false, accumulatedSeconds: prev.accumulatedSeconds + elapsed, lastStartedTimestamp: null };
        });
    };

    const stopAndClearTimer = () => {
        setTimerState({ task: null, isRunning: false, accumulatedSeconds: 0, lastStartedTimestamp: null });
    };

    return {
        roadmap, studySessions, activityHistory, statistics, aiRecommendation, externalStats, aiAnalytics, timetable,
        addStudySession, completeMicroTask, updateTopicProgress, storeAIRecommendation, clearStore, setTimetableTaskCompleted,
        startTimer, pauseTimer, stopAndClearTimer,
        setRoadmap, setStatistics, setActivityHistory, setExternalStats, setAiAnalytics, setTimetable, setAIRecommendation, setStudySessions,
        timerState
    };
}
