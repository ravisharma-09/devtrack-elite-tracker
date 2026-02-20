import { getSupabaseClient } from '../backend/supabaseClient';
import type { StudySession, ActivityHistory } from '../types';

const MAX_RETRIES = 3;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
    try {
        return await fn();
    } catch (err) {
        if (retries <= 1) throw err;
        await new Promise(r => setTimeout(r, 1000 * (MAX_RETRIES - retries + 1)));
        return withRetry(fn, retries - 1);
    }
}

// ─── Sync a Study Session ─────────────────────────────────────────────────────
export async function syncSession(session: StudySession, userId = 'local'): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    await withRetry(async () => {
        const { error } = await supabase.from('study_sessions').upsert({
            id: session.id,
            user_id: userId,
            topic: session.topic,
            category: session.category,
            duration_minutes: session.durationMinutes,
            difficulty: session.difficulty,
            notes: session.notes || '',
            date: session.date,
        });
        if (error) throw error;
    });
}

// ─── Sync Activity Log ────────────────────────────────────────────────────────
export async function syncActivityLog(date: string, entry: ActivityHistory[string], userId = 'local'): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    await withRetry(async () => {
        const { error } = await supabase.from('activity_log').upsert({
            id: `${userId}_${date}`,
            user_id: userId,
            date,
            minutes_studied: entry.minutesStudied,
            tasks_completed: entry.tasksCompleted,
            topics: entry.topics,
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
            id: `${userId}_${taskId}`,
            user_id: userId,
            topic_id: topicId,
            task_id: taskId,
            completed,
        });
        if (error) throw error;
    });
}

// ─── Load All Data from Backend ───────────────────────────────────────────────
export async function loadFromBackend(userId: string): Promise<{
    sessions: StudySession[];
    activityLog: ActivityHistory;
} | null> {
    const supabase = await getSupabaseClient();
    if (!supabase) return null;

    try {
        const [sessionsResult, activityResult] = await Promise.all([
            supabase.from('study_sessions').select('*').eq('user_id', userId),
            supabase.from('activity_log').select('*').eq('user_id', userId),
        ]);

        const sessions: StudySession[] = (sessionsResult.data || []).map((r: any) => ({
            id: r.id, topic: r.topic, category: r.category,
            durationMinutes: r.duration_minutes, difficulty: r.difficulty,
            notes: r.notes, date: r.date,
            timestamp: new Date(r.created_at).getTime(),
        }));

        const activityLog: ActivityHistory = {};
        (activityResult.data || []).forEach((r: any) => {
            activityLog[r.date] = {
                minutesStudied: r.minutes_studied,
                tasksCompleted: r.tasks_completed,
                topics: r.topics || [],
            };
        });

        return { sessions, activityLog };
    } catch { return null; }
}
