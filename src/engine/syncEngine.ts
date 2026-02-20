import { getSupabaseClient } from '../backend/supabaseClient';
import { initialRoadmap } from '../data/roadmapData';
import { initialStatistics } from '../data/statisticsData';
import type { StudySession, ActivityHistory, RoadmapCategory, Statistics, MicroTask } from '../types';

const MAX_RETRIES = 3;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
    try {
        return await fn();
    } catch (err) {
        if (retries <= 1) throw err;
        await new Promise(r => setTimeout(r, 800 * (MAX_RETRIES - retries + 1)));
        return withRetry(fn, retries - 1);
    }
}

// ─── Storage key helpers (mirrors learningStore) ──────────────────────────────
function getKeys(uid: string) {
    return {
        roadmap: `devtrack_roadmap_v3_${uid}`,
        sessions: `devtrack_sessions_v3_${uid}`,
        stats: `devtrack_stats_v3_${uid}`,
        activity: `devtrack_activity_v3_${uid}`,
        aiRec: `devtrack_ai_v3_${uid}`,
    };
}

// ─── Hydrate roadmap from DB records ─────────────────────────────────────────
function buildHydratedRoadmap(
    roadmapProgress: any[],
    microTaskProgress: any[]
): RoadmapCategory[] {
    const roadmap: RoadmapCategory[] = JSON.parse(JSON.stringify(initialRoadmap));

    for (const p of roadmapProgress) {
        for (const cat of roadmap) {
            const topic = cat.topics.find(t => t.id === p.topic_id);
            if (topic) { topic.progress = p.progress; topic.completed = p.completed; }
        }
    }

    for (const mt of microTaskProgress) {
        for (const cat of roadmap) {
            for (const topic of cat.topics) {
                if (!topic.tasks) continue;
                const task = (topic.tasks as MicroTask[]).find(t => t.id === mt.task_id);
                if (task) task.completed = mt.completed;
            }
        }
    }

    // Recalculate unlock cascade
    for (const cat of roadmap) {
        let prevDone = true;
        cat.topics.forEach((t, idx) => {
            t.unlocked = idx === 0 ? true : prevDone;
            prevDone = t.completed;
        });
    }

    return roadmap;
}

// ─── Recompute statistics from raw data ───────────────────────────────────────
function buildStatistics(sessions: StudySession[], roadmap: RoadmapCategory[]): Statistics {
    const total = sessions.reduce((a, s) => ({ min: a.min + s.durationMinutes, count: a.count + 1 }), { min: 0, count: 0 });
    const completedTopics = roadmap.reduce((a, c) => a + c.topics.filter(t => t.completed).length, 0);
    const completedMicro = roadmap.reduce((a, c) =>
        a + c.topics.reduce((b, t) => b + ((t.tasks as MicroTask[] | undefined)?.filter(mt => mt.completed).length || 0), 0), 0);

    // Streak from sorted session dates
    const dateSet = new Set(sessions.map(s => s.date));
    const dates = Array.from(dateSet).sort().reverse();
    let streak = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; i < dates.length; i++) {
        const d = new Date(dates[i]); d.setHours(0, 0, 0, 0);
        const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
        if (diff === i || diff === i + 1) streak++;
        else break;
    }

    return {
        ...initialStatistics,
        totalStudySessions: total.count,
        totalStudyMinutes: total.min,
        totalRoadmapTopicsCompleted: completedTopics,
        totalMicroTasksCompleted: completedMicro,
        studyStreakDays: streak,
        lastActiveDate: dates[0] || null,
        totalProblemsSolved: sessions.reduce((a, s) => a + (s.durationMinutes > 0 ? 1 : 0), 0),
    };
}

// ─── MAIN: Load all user data from Supabase + hydrate localStorage ────────────
export async function loadAndHydrate(userId: string): Promise<boolean> {
    const supabase = await getSupabaseClient();
    if (!supabase) return false; // Offline mode — use existing localStorage

    try {
        const [sessionsRes, activityRes, roadmapRes, microRes] = await Promise.all([
            supabase.from('study_sessions').select('*').eq('user_id', userId),
            supabase.from('activity_log').select('*').eq('user_id', userId),
            supabase.from('roadmap_progress').select('*').eq('user_id', userId),
            supabase.from('microtask_progress').select('*').eq('user_id', userId),
        ]);

        const sessions: StudySession[] = (sessionsRes.data || []).map((r: any) => ({
            id: r.id, topic: r.topic, category: r.category,
            durationMinutes: r.duration_minutes, difficulty: r.difficulty,
            notes: r.notes || '', date: r.date,
            timestamp: new Date(r.created_at).getTime(),
        }));

        const activityLog: ActivityHistory = {};
        (activityRes.data || []).forEach((r: any) => {
            activityLog[r.date] = { minutesStudied: r.minutes_studied, tasksCompleted: r.tasks_completed, topics: r.topics || [] };
        });

        const roadmap = buildHydratedRoadmap(roadmapRes.data || [], microRes.data || []);
        const stats = buildStatistics(sessions, roadmap);

        // Write to user-scoped localStorage — learningStore will read from here
        const KEYS = getKeys(userId);
        localStorage.setItem(KEYS.sessions, JSON.stringify(sessions));
        localStorage.setItem(KEYS.activity, JSON.stringify(activityLog));
        localStorage.setItem(KEYS.roadmap, JSON.stringify(roadmap));
        localStorage.setItem(KEYS.stats, JSON.stringify(stats));

        return true;
    } catch (e) {
        console.warn('[DevTrack] Supabase load failed, using cached data', e);
        return false;
    }
}

// ─── Sync Study Session ───────────────────────────────────────────────────────
export async function syncSession(session: StudySession, userId = 'local'): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await withRetry(async () => {
        const { error } = await supabase.from('study_sessions').upsert({
            id: session.id, user_id: userId, topic: session.topic,
            category: session.category, duration_minutes: session.durationMinutes,
            difficulty: session.difficulty, notes: session.notes || '', date: session.date,
        });
        if (error) throw error;
    });
}

// ─── Sync Activity Log Entry ──────────────────────────────────────────────────
export async function syncActivityLog(date: string, entry: ActivityHistory[string], userId = 'local'): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await withRetry(async () => {
        const { error } = await supabase.from('activity_log').upsert({
            id: `${userId}_${date}`, user_id: userId, date,
            minutes_studied: entry.minutesStudied, tasks_completed: entry.tasksCompleted, topics: entry.topics,
        });
        if (error) throw error;
    });
}

// ─── Sync Micro-Task Completion ───────────────────────────────────────────────
export async function syncMicroTask(topicId: string, taskId: string, completed: boolean, userId = 'local'): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await withRetry(async () => {
        const { error } = await supabase.from('microtask_progress').upsert({
            id: `${userId}_${taskId}`, user_id: userId, topic_id: topicId, task_id: taskId, completed,
        });
        if (error) throw error;
    });
}

// ─── Sync Topic (DSA +/-) Progress ───────────────────────────────────────────
export async function syncRoadmapTopic(categoryId: string, topicId: string, progress: number, completed: boolean, userId = 'local'): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await withRetry(async () => {
        const { error } = await supabase.from('roadmap_progress').upsert({
            id: `${userId}_${topicId}`, user_id: userId, topic_id: topicId,
            category_id: categoryId, progress, completed,
        });
        if (error) throw error;
    });
}
