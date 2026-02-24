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

// ─── Hydrate roadmap from DB records ─────────────────────────────────────────
export function buildHydratedRoadmap(
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
export function buildStatistics(sessions: StudySession[], roadmap: RoadmapCategory[]): Statistics {
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

// ─── Sync Timetable ────────────────────────────────────────────────────────
export async function syncTimetable(schedule: any, userId = 'local'): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;
    await withRetry(async () => {
        const { error } = await supabase.from('user_timetable').upsert({
            user_id: userId, schedule
        });
        if (error) throw error;
    });
}

// ─── PHASE 2: TELEMETRY SYNC ENGINE ──────────────────────────────────────────
export async function runTelemetrySync(userId: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    try {
        // 1. Get user handles
        const { data: profile } = await supabase
            .from('profiles')
            .select('cf_handle, leetcode_handle, github_username, problems_solved')
            .eq('id', userId)
            .single();

        if (!profile) return;

        let totalProblemsSolved = profile.problems_solved || 0;
        let cfRating = 0;

        // ─── Codeforces Sync ───
        if (profile.cf_handle) {
            const cfStatusUrl = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(profile.cf_handle)}&from=1&count=100`;
            const cfInfoUrl = `https://codeforces.com/api/user.info?handles=${encodeURIComponent(profile.cf_handle)}`;

            const [statusRes, infoRes] = await Promise.all([fetch(cfStatusUrl), fetch(cfInfoUrl)]);

            if (infoRes.ok) {
                const infoData = await infoRes.json();
                if (infoData.status === 'OK' && infoData.result.length > 0) {
                    cfRating = infoData.result[0].rating || 0;
                }
            }

            if (statusRes.ok) {
                const statusData = await statusRes.json();
                if (statusData.status === 'OK') {
                    const submissions = statusData.result;
                    const solvedSet = new Set<string>();

                    for (const sub of submissions) {
                        const probName = sub.problem.name;
                        if (sub.verdict === 'OK') solvedSet.add(probName);

                        // Insert into activities
                        await supabase.from('activities').insert({
                            user_id: userId,
                            source: 'codeforces',
                            type: sub.verdict === 'OK' ? 'solve' : 'attempt',
                            title: probName,
                            topic: sub.problem.tags ? sub.problem.tags[0] : 'general',
                            difficulty: sub.problem.rating ? `Rating ${sub.problem.rating}` : 'unknown',
                            created_at: new Date(sub.creationTimeSeconds * 1000).toISOString()
                        }).select().maybeSingle();

                        // Insert into problem_history
                        if (sub.verdict === 'OK' && !solvedSet.has(probName + "_logged")) {
                            await supabase.from('problem_history').insert({
                                user_id: userId,
                                platform: 'codeforces',
                                problem_name: probName,
                                topic: sub.problem.tags ? sub.problem.tags.join(', ') : 'general',
                                difficulty: sub.problem.rating ? `Rating ${sub.problem.rating}` : 'unknown',
                                solved: true,
                                created_at: new Date(sub.creationTimeSeconds * 1000).toISOString()
                            }).select().maybeSingle();
                            solvedSet.add(probName + "_logged");
                        }
                    }
                    totalProblemsSolved += solvedSet.size;
                }
            }
        }

        // ─── LeetCode Sync ───
        if (profile.leetcode_handle) {
            const lcRes = await fetch(`https://leetcode-stats-api.herokuapp.com/${encodeURIComponent(profile.leetcode_handle)}`);
            if (lcRes.ok) {
                const lcData = await lcRes.json();
                if (lcData.status === 'success') {
                    totalProblemsSolved += lcData.totalSolved || 0;

                    // Log an aggregate entry to problem_history as per instructions
                    await supabase.from('problem_history').insert({
                        user_id: userId,
                        platform: 'leetcode',
                        problem_name: 'LeetCode Aggregate Sync',
                        topic: 'mixed',
                        difficulty: `Easy: ${lcData.easySolved}, Med: ${lcData.mediumSolved}, Hard: ${lcData.hardSolved}`,
                        solved: true
                    }).select().maybeSingle();
                }
            }
        }

        // ─── GitHub Sync ───
        if (profile.github_username) {
            const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(profile.github_username)}/events/public?per_page=30`);
            if (ghRes.ok) {
                const ghData = await ghRes.json();
                for (const ev of ghData) {
                    if (ev.type === 'PushEvent') {
                        await supabase.from('activities').insert({
                            user_id: userId,
                            source: 'github',
                            type: 'commit',
                            title: `Push to ${ev.repo.name}`,
                            topic: 'development',
                            difficulty: 'N/A',
                            created_at: new Date(ev.created_at).toISOString()
                        }).select().maybeSingle();
                    }
                }
            }
        }

        // ─── Calculate New Skill Score ───
        // Formula: (DSA hours × 2) + (CP rating / 10) + (Open source PR/commit count × 10) + (Project hours × 1.5)
        const { data: studySessionsData } = await supabase.from('study_sessions').select('category, duration_minutes').eq('user_id', userId);
        let dsaMinutes = 0;
        let projectMinutes = 0;
        if (studySessionsData) {
            studySessionsData.forEach((s: any) => {
                if (s.category === 'DSA') dsaMinutes += s.duration_minutes || 0;
                if (s.category === 'Project Work') projectMinutes += s.duration_minutes || 0;
            });
        }
        const { count: openSourceCount } = await supabase.from('activities').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('source', 'github');

        const dsaHours = dsaMinutes / 60;
        const projectHours = projectMinutes / 60;
        const newSkillScore = Math.floor((dsaHours * 2) + (cfRating / 10) + ((openSourceCount || 0) * 10) + (projectHours * 1.5));

        // ─── Update Profile ───
        await supabase.from('profiles').update({
            cf_rating: cfRating,
            problems_solved: totalProblemsSolved,
            skill_score: newSkillScore
        }).eq('id', userId);

    } catch (e) {
        console.error('[DevTrack] Telemetry sync failed', e);
    }
}
