import React, { useEffect, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { initialTimetable } from '../data/timetableData';
import { useStore } from '../engine/learningStore';
import { useAuth } from '../auth/AuthContext';
import { AddStudySessionModal } from '../components/AddStudySessionModal';
import { ConsistencyGraph } from '../components/ConsistencyGraph';
import { syncAIAnalytics } from '../engine/aiSyncEngine';
import { computeSkillProfile } from '../engine/analyticsEngine';
import { fetchUnifiedActivityFeed, type ExternalActivity } from '../engine/externalActivityEngine';
import { getTodayStats, calculateConsistencyScore } from '../engine/consistencyEngine';
import { updateLeaderboardStats } from '../engine/leaderboardEngine';
import { Link } from 'react-router-dom';
import type { DailyTimetable } from '../types';
import { Brain, Clock, PlusCircle, Target, Flame, TrendingUp, Zap, Activity as ActivityIcon } from 'lucide-react';

export const Dashboard: React.FC = () => {
    const [timetable] = useLocalStorage<DailyTimetable[]>('devtrack_timetable', initialTimetable);
    const { user } = useAuth();
    const {
        roadmap, studySessions, activityHistory, statistics, externalStats,
        aiAnalytics, setAiAnalytics, addStudySession,
    } = useStore();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [recentActivities, setRecentActivities] = useState<ExternalActivity[]>([]);

    const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    const todayTasks = timetable[currentDayIndex]?.tasks || [];
    const todayDone = todayTasks.filter(t => t.completed).length;
    const todayProgress = todayTasks.length > 0 ? Math.round((todayDone / todayTasks.length) * 100) : 0;

    const consistencyScore = calculateConsistencyScore(activityHistory);
    const todayStats = getTodayStats(activityHistory);

    // Fallback dummy profile for initial empty states
    const skill = computeSkillProfile(roadmap, studySessions, activityHistory, externalStats?.cf || null, externalStats?.lc || null, externalStats?.gh || null);

    useEffect(() => {
        const extTime = externalStats?.lastSynced || 0;
        const aiTime = aiAnalytics?.lastUpdated || 0;
        const isStale = Date.now() - aiTime > 3600000; // refresh UI aggressively if cache logic fails
        const needsExternalUpdate = extTime > aiTime;

        const shouldFetch = !aiAnalytics || isStale || needsExternalUpdate;
        if (!shouldFetch) return;

        syncAIAnalytics(user?.id || 'local', skill, roadmap, activityHistory, studySessions, aiAnalytics, needsExternalUpdate)
            .then((payload: any) => {
                if (payload) setAiAnalytics(payload);
            })
            .catch(() => { })
            .finally(() => setIsLoadingAI(false));
    }, [externalStats?.lastSynced]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Leaderboard Auto-Sync ─────────────────────────────────────────────────
    useEffect(() => {
        if (!user || user.id === 'local') return;

        // Auto-push the computed skill profile to the global leaderboard
        // We throttle this implicitly by only pushing when the core stats change
        const cfRating = externalStats?.cf?.rating || 0;
        const lcSolved = externalStats?.lc?.totalSolved || 0;
        const ghScore = skill.developmentScore || 0;
        const studyMinutes = studySessions.reduce((a, s) => a + (s.durationMinutes || 0), 0);

        updateLeaderboardStats(
            user.id,
            (user as any).user_metadata?.name || user.email?.split('@')[0] || 'Dev',
            skill.overallScore,
            skill.totalProblemsSolved,
            studyMinutes,
            skill.consistencyScore,
            cfRating,
            lcSolved,
            ghScore
        ).catch(console.error);

    }, [
        skill.overallScore,
        skill.totalProblemsSolved,
        skill.consistencyScore,
        studySessions.length,
        externalStats?.lastSynced
    ]);

    // ── External Activity Auto-Sync (View-only) ───────────────────────────────
    useEffect(() => {
        if (!user || user.id === 'local') return;
        fetchUnifiedActivityFeed(user.id, 5).then(setRecentActivities).catch(() => { });
    }, [user, externalStats?.lastSynced]);

    const totalTopics = roadmap.reduce((a, c) => a + c.topics.length, 0);
    const completedTopics = roadmap.reduce((a, c) => a + c.topics.filter(t => t.completed).length, 0);
    const roadmapPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-8 border-b border-brand-border pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2">Command Center</h2>
                    <p className="retro-text-sub">SDE Elite Execution Dashboard — All Systems Nominal</p>
                </div>
                <button onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/50 text-brand-primary px-4 py-2 text-sm font-mono hover:bg-brand-primary hover:text-black transition-colors rounded uppercase tracking-widest">
                    <PlusCircle size={16} /> Log Session
                </button>
            </header>

            {/* STATS ROW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Study Streak', value: `${statistics.studyStreakDays}d`, icon: <Flame size={18} className="text-red-400" />, color: 'text-red-400' },
                    { label: 'Today Minutes', value: `${todayStats.minutesStudied}m`, icon: <Clock size={18} className="text-blue-400" />, color: 'text-blue-400' },
                    { label: 'Consistency', value: `${consistencyScore}%`, icon: <TrendingUp size={18} className="text-brand-primary" />, color: 'text-brand-primary' },
                    { label: 'Roadmap Done', value: `${roadmapPct}%`, icon: <Target size={18} className="text-brand-accent" />, color: 'text-brand-accent' },
                ].map(stat => (
                    <div key={stat.label} className="retro-panel p-4 flex items-center gap-3">
                        <div className="p-2 bg-brand-bg rounded-lg border border-brand-border">{stat.icon}</div>
                        <div>
                            <div className="text-xs font-mono text-brand-secondary uppercase tracking-widest">{stat.label}</div>
                            <div className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* AI RECOMMENDATION CARD */}
                {/* AI DAILY PLAN CARD */}
                <div className="retro-panel p-6 lg:col-span-2 relative overflow-hidden border-brand-accent/30">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-accent/60 to-transparent" />
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold uppercase text-brand-accent tracking-wide flex items-center gap-2">
                            <Brain size={18} /> Groq AI Daily Plan
                        </h3>
                        {isLoadingAI && (
                            <span className="text-xs font-mono text-brand-secondary animate-pulse">Syncing Telemetry...</span>
                        )}
                    </div>

                    {aiAnalytics?.plan ? (
                        <div className="space-y-4">
                            <div className="text-brand-primary font-mono font-bold text-sm mb-2 opacity-90">
                                "{aiAnalytics.plan.motivationalInsight}"
                            </div>
                            <ul className="space-y-3">
                                {aiAnalytics.plan.dailyPlan.map((task, idx) => (
                                    <li key={idx} className="flex items-start gap-3 p-3 bg-brand-bg/50 border border-brand-primary/10 rounded">
                                        <Zap size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                                        <div className="text-brand-secondary text-sm leading-relaxed">{task}</div>
                                    </li>
                                ))}
                            </ul>

                            <div className="flex items-center gap-2 pt-3 mt-4 border-t border-brand-border/20">
                                <Clock size={13} className="text-brand-secondary" />
                                <span className="text-xs font-mono text-brand-secondary">Est. 2h</span>
                                <span className="text-brand-secondary/30 mx-1">|</span>
                                <span className="text-xs font-mono text-brand-secondary/50">Groq llama3-70b</span>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col justify-center text-center opacity-50 py-8">
                            <Zap size={24} className="mx-auto mb-2 text-brand-secondary" />
                            <div className="text-sm font-mono text-brand-secondary">AI Engines analyzing telemetry...</div>
                        </div>
                    )}
                </div>

                {/* TODAY'S SCHEDULE */}
                <div className="retro-panel p-6">
                    <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-4">Today's Schedule</h3>
                    <div className="mb-4">
                        <div className="flex justify-between text-xs font-mono mb-1">
                            <span className="text-brand-secondary">Completion</span>
                            <span className="text-brand-primary">{todayDone}/{todayTasks.length}</span>
                        </div>
                        <div className="h-2 bg-brand-bg rounded overflow-hidden border border-brand-border/30">
                            <div className="h-full bg-brand-primary transition-all duration-500 rounded" style={{ width: `${todayProgress}%` }} />
                        </div>
                    </div>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto">
                        {todayTasks.slice(0, 6).map(task => (
                            <div key={task.id} className="flex items-center gap-2 text-xs font-mono">
                                <span className={task.completed ? 'text-brand-primary' : 'text-brand-secondary'}>
                                    {task.completed ? '✓' : '○'}
                                </span>
                                <span className={task.completed ? 'text-brand-primary/60 line-through' : 'text-brand-primary/80'}>
                                    {task.title}
                                </span>
                            </div>
                        ))}
                        {todayTasks.length === 0 && (
                            <p className="text-brand-secondary text-xs font-mono">No tasks scheduled</p>
                        )}
                    </div>
                    {todayStats.sessionsCompleted > 0 && (
                        <div className="mt-4 pt-4 border-t border-brand-border/30">
                            <div className="text-xs font-mono text-brand-secondary uppercase tracking-widest mb-1">Logged Today</div>
                            <div className="text-brand-primary font-mono text-sm">
                                {todayStats.sessionsCompleted} session{todayStats.sessionsCompleted !== 1 ? 's' : ''} · {todayStats.minutesStudied}m
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RECENT EXTERNAL ACTIVITY */}
            <div className="retro-panel p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest flex items-center gap-2">
                        <ActivityIcon size={16} /> Recent External Activity
                    </h3>
                    <Link to="/activity" className="text-xs font-mono text-brand-primary hover:underline">View All →</Link>
                </div>

                {recentActivities.length > 0 ? (
                    <div className="space-y-3">
                        {recentActivities.map(act => (
                            <div key={act.id} className="flex justify-between items-center bg-brand-bg/50 border border-brand-border/30 p-3 rounded">
                                <div className="flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full ${act.platform === 'LeetCode' ? 'bg-orange-500' : act.platform === 'Codeforces' ? 'bg-cyan-500' : 'bg-brand-secondary'}`} />
                                    <span className="text-xs font-mono text-brand-primary">{act.activity_title}</span>
                                </div>
                                <span className="text-[10px] font-mono text-brand-secondary">{new Date(act.activity_timestamp).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 text-brand-secondary/50 font-mono text-xs">
                        No external telemetry detected. Sync handles in profile.
                    </div>
                )}
            </div>

            {/* CONSISTENCY GRAPH */}
            <ConsistencyGraph daysToView={365} activityHistory={activityHistory} />

            {isModalOpen && (
                <AddStudySessionModal
                    onClose={() => setIsModalOpen(false)}
                    onSave={(session) => addStudySession(session)}
                />
            )}
        </div>
    );
};
