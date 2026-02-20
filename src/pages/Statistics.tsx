import React from 'react';
import { useStore } from '../engine/learningStore';
import { calculatePlayerLevel } from '../data/statisticsData';
import { calculateConsistencyScore, calculateStreak } from '../engine/consistencyEngine';
import { extractLearningAnalytics } from '../engine/aiSuggestionEngine';
import { ConsistencyGraph } from '../components/ConsistencyGraph';
import { Trophy, Flame, Target, BookOpen, Clock, BarChart2, TrendingUp, TrendingDown, Minus, Award, Zap } from 'lucide-react';

export const Statistics: React.FC = () => {
    const { roadmap, studySessions, activityHistory, statistics } = useStore();

    // ── Compute advanced analytics ────────────────────────────────────────────
    const analytics = extractLearningAnalytics(roadmap, studySessions, activityHistory);
    const liveStreak = calculateStreak(activityHistory);
    const consistencyScore = calculateConsistencyScore(activityHistory);

    const roadmapPct = analytics.totalTopics > 0
        ? Math.round((analytics.completedTopics / analytics.totalTopics) * 100) : 0;
    const microPct = analytics.totalMicroTasks > 0
        ? Math.round((analytics.completedMicroTasks / analytics.totalMicroTasks) * 100) : 0;

    const level = calculatePlayerLevel(roadmapPct);
    const formatHours = (m: number) => m >= 60 ? `${(m / 60).toFixed(1)}h` : `${m}m`;

    // Per-category breakdown
    const categoryStats = roadmap.map(cat => {
        const completed = cat.topics.filter(t => t.completed).length;
        const total = cat.topics.length;
        const microDone = cat.topics.reduce((a, t) => a + (t.tasks?.filter((tk: any) => tk.completed).length || 0), 0);
        const microTotal = cat.topics.reduce((a, t) => a + (t.tasks?.length || 0), 0);
        const sessionCount = studySessions.filter(s =>
            cat.id === 'dsa' ? s.category === 'DSA' :
                cat.id === 'webdev' ? s.category === 'Web Dev' :
                    cat.id === 'projects' ? s.category === 'Project' :
                        s.category === 'CS Fundamentals'
        ).length;
        return { id: cat.id, title: cat.title, completed, total, microDone, microTotal, sessionCount };
    });

    // Weekly breakdown (last 7 days)
    const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const entry = activityHistory[key];
        return { day: d.toLocaleDateString('en', { weekday: 'short' }), mins: entry?.minutesStudied || 0, sessions: entry?.tasksCompleted || 0 };
    });
    const maxMins = Math.max(...last7.map(d => d.mins), 30);

    // Velocity indicator
    const VelocityIcon = analytics.velocityTrend === 'accelerating' ? TrendingUp
        : analytics.velocityTrend === 'declining' ? TrendingDown : Minus;
    const velocityColor = analytics.velocityTrend === 'accelerating' ? 'text-brand-primary'
        : analytics.velocityTrend === 'declining' ? 'text-red-400' : 'text-brand-accent';

    // Best study day
    const bestDay = Object.entries(analytics.studyPatternByDay).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-8 border-b border-brand-border pb-4">
                <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2">Advanced Metrics</h2>
                <p className="retro-text-sub">Deep learning telemetry — all values computed live from execution data</p>
            </header>

            {/* ── LEVEL BANNER ──────────────────────────────────────────────── */}
            <div className="retro-panel p-6 border-yellow-400/40 bg-brand-bg/50 shadow-[0_0_20px_rgba(250,204,21,0.06)] relative overflow-hidden">
                <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Trophy className="text-yellow-400 w-10 h-10 flex-shrink-0" />
                        <div>
                            <div className="text-xs font-mono text-brand-secondary uppercase tracking-widest">System Rank</div>
                            <div className="text-3xl font-bold font-mono text-brand-primary">{level.toUpperCase()}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm font-mono">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-brand-primary">{roadmapPct}%</div>
                            <div className="text-xs text-brand-secondary">Roadmap</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-brand-accent">{microPct}%</div>
                            <div className="text-xs text-brand-secondary">Micro-Tasks</div>
                        </div>
                        <div className={`flex items-center gap-1 ${velocityColor}`}>
                            <VelocityIcon size={16} />
                            <span className="text-xs uppercase tracking-widest">{analytics.velocityTrend}</span>
                        </div>
                    </div>
                </div>
                {/* Roadmap progress bar */}
                <div className="mt-4 h-1.5 w-full bg-brand-bg rounded overflow-hidden border border-brand-border/30">
                    <div className="h-full bg-gradient-to-r from-brand-primary to-brand-accent transition-all duration-700"
                        style={{ width: `${roadmapPct}%` }} />
                </div>
            </div>

            {/* ── CORE STATS GRID ───────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Deep Work Time', value: formatHours(statistics.totalStudyMinutes), icon: <Clock size={20} className="text-blue-400" />, sub: `${statistics.totalStudySessions} sessions total` },
                    { label: 'Problems Solved', value: statistics.totalProblemsSolved.toString(), icon: <Target size={20} className="text-brand-accent" />, sub: 'DSA progress units' },
                    { label: 'Micro-Tasks', value: `${analytics.completedMicroTasks}/${analytics.totalMicroTasks}`, icon: <BookOpen size={20} className="text-brand-primary" />, sub: `${microPct}% of curriculum` },
                    { label: 'Active Streak', value: `${Math.max(statistics.studyStreakDays, liveStreak)}d`, icon: <Flame size={20} className="text-red-400" />, sub: `${consistencyScore}% consistency` },
                ].map(s => (
                    <div key={s.label} className="retro-panel p-4">
                        <div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-xs font-mono text-brand-secondary uppercase tracking-widest">{s.label}</span></div>
                        <div className="text-2xl font-bold font-mono text-brand-primary">{s.value}</div>
                        <div className="text-xs text-brand-secondary/70 mt-1">{s.sub}</div>
                    </div>
                ))}
            </div>

            {/* ── WEEKLY ACTIVITY CHART ─────────────────────────────────────── */}
            <div className="retro-panel p-6">
                <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-5 flex items-center gap-2">
                    <BarChart2 size={16} /> 7-Day Activity Breakdown
                </h3>
                <div className="flex items-end gap-2 h-28">
                    {last7.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                                <div
                                    className="w-full rounded-t transition-all duration-500 bg-brand-primary/70 hover:bg-brand-primary"
                                    style={{ height: `${Math.max((d.mins / maxMins) * 80, d.mins > 0 ? 4 : 0)}px` }}
                                    title={`${d.mins}m studied`}
                                />
                            </div>
                            <span className="text-xs font-mono text-brand-secondary">{d.day}</span>
                            {d.sessions > 0 && <span className="text-xs font-mono text-brand-primary">{d.sessions}s</span>}
                        </div>
                    ))}
                </div>
                <div className="flex justify-between text-xs font-mono text-brand-secondary/50 mt-2">
                    <span>This week: {analytics.sessionsLastWeek} sessions</span>
                    <span>Last week: {analytics.sessionsWeekBefore} sessions</span>
                </div>
            </div>

            {/* ── INTELLIGENCE INSIGHTS + PATTERN ──────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pattern Analysis */}
                <div className="retro-panel p-6">
                    <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-4 flex items-center gap-2">
                        <Zap size={16} /> Learning Pattern
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'Avg Session', value: `${analytics.avgSessionMinutes}m`, good: analytics.avgSessionMinutes >= 30 },
                            { label: 'Longest Session', value: `${analytics.longestSession}m`, good: analytics.longestSession >= 60 },
                            { label: 'Best Day', value: bestDay, good: true },
                            { label: 'Burnout Risk', value: analytics.burnoutRisk, good: analytics.burnoutRisk === 'low' },
                            { label: 'Focus Area', value: analytics.topCategory || '—', good: true },
                            { label: 'Velocity', value: analytics.velocityTrend, good: analytics.velocityTrend === 'accelerating' },
                        ].map(item => (
                            <div key={item.label}>
                                <div className="text-xs font-mono text-brand-secondary uppercase tracking-widest">{item.label}</div>
                                <div className={`text-sm font-bold font-mono mt-0.5 capitalize ${item.good ? 'text-brand-primary' : 'text-brand-accent'}`}>
                                    {item.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Category breakdown */}
                <div className="retro-panel p-6">
                    <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-4 flex items-center gap-2">
                        <Award size={16} /> Category Progress
                    </h3>
                    <div className="space-y-3">
                        {categoryStats.filter(c => c.total > 0).map(cat => {
                            const pct = Math.round((cat.completed / cat.total) * 100);
                            return (
                                <div key={cat.id}>
                                    <div className="flex justify-between text-xs font-mono mb-1">
                                        <span className="text-brand-primary truncate max-w-[60%]">{cat.title}</span>
                                        <span className="text-brand-secondary">{cat.completed}/{cat.total} topics · {pct}%</span>
                                    </div>
                                    <div className="h-1 w-full bg-brand-bg rounded overflow-hidden border border-brand-border/20">
                                        <div className="h-full bg-brand-primary transition-all duration-700"
                                            style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── RECENT SESSIONS ───────────────────────────────────────────── */}
            <div className="retro-panel p-6">
                <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-4 flex items-center gap-2">
                    <TrendingUp size={16} /> Recent Sessions
                </h3>
                {studySessions.length === 0 ? (
                    <p className="text-brand-secondary text-xs font-mono">No sessions logged yet.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {[...studySessions].reverse().slice(0, 10).map(s => (
                            <div key={s.id} className="flex justify-between items-center p-2 border border-brand-border/20 rounded text-xs font-mono hover:border-brand-primary/30 transition-colors">
                                <div>
                                    <span className="text-brand-primary font-bold">{s.topic}</span>
                                    <span className="text-brand-secondary ml-2">{s.category}</span>
                                </div>
                                <div className="flex items-center gap-2 text-brand-secondary flex-shrink-0 ml-2">
                                    <span>{s.durationMinutes}m</span>
                                    <span className={s.difficulty === 'Hard' ? 'text-red-400' : s.difficulty === 'Medium' ? 'text-brand-accent' : 'text-brand-primary'}>
                                        {s.difficulty}
                                    </span>
                                    <span className="text-brand-secondary/40">{s.date}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── HEATMAP ───────────────────────────────────────────────────── */}
            <ConsistencyGraph daysToView={365} activityHistory={activityHistory} />
        </div>
    );
};
