import React from 'react';
import { useLearningStore } from '../engine/learningStore';
import { calculatePlayerLevel } from '../data/statisticsData';
import { calculateConsistencyScore, calculateStreak } from '../engine/consistencyEngine';
import { Trophy, Flame, Target, BookOpen, Clock, BarChart, TrendingUp } from 'lucide-react';
import { ConsistencyGraph } from '../components/ConsistencyGraph';

export const Statistics: React.FC = () => {
    const { roadmap, studySessions, activityHistory, statistics } = useLearningStore();

    // ── Compute all values dynamically from learningStore ─────────────────────
    const totalMicroTasks = roadmap.reduce((acc, cat) =>
        acc + cat.topics.reduce((t, topic) => t + (topic.tasks?.length || 0), 0), 0);

    const totalTopics = roadmap.reduce((acc, cat) => acc + cat.topics.length, 0);
    const completedTopics = roadmap.reduce((acc, cat) => acc + cat.topics.filter(t => t.completed).length, 0);

    const roadmapPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    const microTaskPct = totalMicroTasks > 0
        ? Math.round(((statistics.totalMicroTasksCompleted || 0) / totalMicroTasks) * 100)
        : 0;

    const currentLevel = calculatePlayerLevel(roadmapPct);
    const consistencyScore = calculateConsistencyScore(activityHistory);
    const liveStreak = calculateStreak(activityHistory);

    // Most/least studied from sessions
    const categoryCount: Record<string, number> = {};
    studySessions.forEach(s => { categoryCount[s.category] = (categoryCount[s.category] || 0) + 1; });
    const sortedCats = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
    const mostStudied = sortedCats[0]?.[0] || '—';
    const leastStudied = sortedCats[sortedCats.length - 1]?.[0] || '—';

    const formatHours = (mins: number) => mins >= 60 ? `${(mins / 60).toFixed(1)}h` : `${mins}m`;

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-8 border-b border-brand-border pb-4">
                <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2">Metrics Analysis</h2>
                <p className="retro-text-sub">System-wide performance telemetry — all values computed live from execution data</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* LEVEL BANNER */}
                <div className="retro-panel p-6 flex flex-col justify-center items-center gap-2 md:col-span-2 lg:col-span-4 bg-brand-bg/50 border-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.08)] relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-50" />
                    <h3 className="text-brand-secondary text-sm font-mono uppercase tracking-widest mb-2">Current System Rank</h3>
                    <div className="flex items-center gap-4">
                        <Trophy className="text-yellow-400 w-10 h-10" />
                        <div className="text-4xl md:text-5xl font-bold font-mono text-brand-primary tracking-widest">
                            {currentLevel.toUpperCase()}
                        </div>
                    </div>
                    <p className="text-xs text-brand-secondary mt-3 font-mono">
                        Roadmap Completion: {completedTopics}/{totalTopics} topics ({roadmapPct}%)
                    </p>
                </div>

                <StatCard icon={<Clock className="text-blue-400 w-8 h-8" />} title="Total Deep Work"
                    value={formatHours(statistics.totalStudyMinutes)} subtitle="All-time study hours" borderClass="border-blue-400/50" />

                <StatCard icon={<Target className="text-brand-accent w-8 h-8" />} title="Problems Solved"
                    value={statistics.totalProblemsSolved.toString()} subtitle="DSA progress units" borderClass="border-brand-accent/50" />

                <StatCard icon={<BookOpen className="text-brand-primary w-8 h-8" />} title="Micro-Tasks Done"
                    value={`${statistics.totalMicroTasksCompleted || 0} / ${totalMicroTasks}`}
                    subtitle={`${microTaskPct}% of curriculum`} borderClass="border-brand-primary/50" />

                <StatCard icon={<Flame className="text-red-500 w-8 h-8" />} title="Execution Streak"
                    value={`${Math.max(statistics.studyStreakDays, liveStreak)} Days`}
                    subtitle="Consecutive active days" borderClass="border-red-500/50" />

                {/* INTELLIGENCE ANALYTICS */}
                <div className="retro-panel p-6 col-span-1 md:col-span-2 flex flex-col justify-center">
                    <h3 className="text-brand-secondary text-sm font-mono uppercase tracking-wider mb-4 border-b border-brand-border pb-2 flex items-center gap-2">
                        <BarChart size={16} /> Volume Analytics
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="block text-xs text-brand-secondary font-mono mb-1 uppercase tracking-widest">Consistency (30d)</span>
                            <span className="text-2xl font-bold font-mono text-brand-primary">{consistencyScore}%</span>
                        </div>
                        <div>
                            <span className="block text-xs text-brand-secondary font-mono mb-1 uppercase tracking-widest">Sessions Logged</span>
                            <span className="text-2xl font-bold font-mono text-brand-primary">{statistics.totalStudySessions}</span>
                        </div>
                        <div className="mt-2">
                            <span className="block text-xs text-brand-secondary font-mono mb-1 uppercase tracking-widest">Most Dominant</span>
                            <span className="text-sm font-bold font-mono text-brand-primary truncate block">{mostStudied}</span>
                        </div>
                        <div className="mt-2">
                            <span className="block text-xs text-brand-secondary font-mono mb-1 uppercase tracking-widest">Trailing Signal</span>
                            <span className="text-sm font-bold font-mono text-brand-accent truncate block">{leastStudied}</span>
                        </div>
                    </div>
                </div>

                {/* RECENT SESSIONS */}
                <div className="retro-panel p-6 col-span-1 md:col-span-2 flex flex-col">
                    <h3 className="text-brand-secondary text-sm font-mono uppercase tracking-wider mb-4 border-b border-brand-border pb-2 flex items-center gap-2">
                        <TrendingUp size={16} /> Recent Sessions
                    </h3>
                    <div className="space-y-2 overflow-y-auto max-h-40">
                        {studySessions.length === 0 && (
                            <p className="text-brand-secondary text-xs font-mono">No sessions logged yet.</p>
                        )}
                        {[...studySessions].reverse().slice(0, 8).map(s => (
                            <div key={s.id} className="flex justify-between items-center text-xs font-mono border-b border-brand-border/20 pb-1">
                                <span className="text-brand-primary">{s.topic}</span>
                                <span className="text-brand-secondary">{s.durationMinutes}m · {s.difficulty}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* HEATMAP */}
                <div className="col-span-1 md:col-span-2 lg:col-span-4">
                    <ConsistencyGraph daysToView={365} activityHistory={activityHistory} />
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{
    icon: React.ReactNode; title: string; value: string; subtitle: string; borderClass: string;
}> = ({ icon, title, value, subtitle, borderClass }) => (
    <div className={`retro-panel p-6 flex flex-col md:flex-row items-start md:items-center gap-6`}>
        <div className={`p-4 rounded-lg bg-brand-bg border ${borderClass}`}>{icon}</div>
        <div>
            <h3 className="text-brand-secondary text-xs lg:text-sm font-mono uppercase tracking-wider mb-1">{title}</h3>
            <div className="text-2xl lg:text-3xl font-bold font-mono text-brand-primary mb-1">{value}</div>
            <p className="text-xs text-brand-secondary/70">{subtitle}</p>
        </div>
    </div>
);
