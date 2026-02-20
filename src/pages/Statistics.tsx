import React from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { initialStatistics, calculatePlayerLevel } from '../data/statisticsData';
import { initialRoadmap } from '../data/roadmapData';
import type { Statistics as StatsModel, RoadmapCategory, ActivityHistory, StudySession } from '../types';
import { Trophy, Flame, Target, BookOpen, Clock, BarChart } from 'lucide-react';
import { ConsistencyGraph } from '../components/ConsistencyGraph';
import { initialStudySessions } from '../data/studySessionStore';

export const Statistics: React.FC = () => {
    const [statistics] = useLocalStorage<StatsModel>('devtrack_statistics', initialStatistics);
    const [roadmap] = useLocalStorage<RoadmapCategory[]>('devtrack_roadmap', initialRoadmap);
    const [activityHistory] = useLocalStorage<ActivityHistory>('devtrack_activity', {});
    const [studySessions] = useLocalStorage<StudySession[]>('devtrack_sessions', initialStudySessions);

    const totalTopicsInRoadmap = roadmap.reduce((acc, cat) => acc + cat.topics.length, 0);
    const roadmapCompletionPercentage = totalTopicsInRoadmap > 0
        ? Math.round((statistics.totalRoadmapTopicsCompleted / totalTopicsInRoadmap) * 100)
        : 0;

    const currentLevel = calculatePlayerLevel(roadmapCompletionPercentage);

    // Consistency Math
    const activeDays = Object.values(activityHistory).filter(a => a.minutesStudied > 0).length;
    const totalTrackedDays = Object.keys(activityHistory).length || 1; // Prevent div/0
    const consistencyPercentage = Math.round((activeDays / Math.max(totalTrackedDays, 30)) * 100);

    // Most / Weakest Topic Math
    const categoryCount: Record<string, number> = {};
    studySessions.forEach(s => {
        categoryCount[s.category] = (categoryCount[s.category] || 0) + 1;
    });

    let mostStudied = 'No Data';
    let leastStudied = 'No Data';
    if (Object.keys(categoryCount).length > 0) {
        const sorted = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
        mostStudied = sorted[0][0];
        leastStudied = sorted[sorted.length - 1][0];
    }

    const formatHours = (mins: number) => (mins / 60).toFixed(1);

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-8 border-b border-brand-border pb-4">
                <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2">Metrics Analysis</h2>
                <p className="retro-text-sub">System-wide performance telemetry & intelligence</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Emphasized Level Card */}
                <div className="retro-panel p-6 flex flex-col justify-center items-center gap-2 md:col-span-2 lg:col-span-4 bg-brand-bg/50 border-yellow-400/50 shadow-[0_0_20px_rgba(250,204,21,0.08)] relative overflow-hidden">

                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-50"></div>

                    <h3 className="text-brand-secondary text-sm font-mono uppercase tracking-widest mb-2">Current System Rank</h3>
                    <div className="flex items-center gap-4">
                        <Trophy className="text-yellow-400 w-10 h-10" />
                        <div className="text-4xl md:text-5xl font-bold font-mono text-brand-primary tracking-widest">
                            {currentLevel.toUpperCase()}
                        </div>
                    </div>
                    <p className="text-xs text-brand-secondary mt-4 font-mono">Roadmap Completion: {roadmapCompletionPercentage}%</p>
                </div>

                <StatCard
                    icon={<Clock className="text-blue-400 w-8 h-8" />}
                    title="Total Deep Work"
                    value={`${formatHours(statistics.totalStudyMinutes)}h`}
                    subtitle="Aggregate system output"
                    borderClass="border-blue-400/50"
                />

                <StatCard
                    icon={<Target className="text-brand-accent w-8 h-8" />}
                    title="Problems Solved"
                    value={statistics.totalProblemsSolved.toString()}
                    subtitle="Total DSA tracking"
                    borderClass="border-brand-accent/50"
                />

                <StatCard
                    icon={<BookOpen className="text-brand-primary w-8 h-8" />}
                    title="Topics Mastered"
                    value={`${statistics.totalRoadmapTopicsCompleted} / ${totalTopicsInRoadmap}`}
                    subtitle="Total roadmap nodes"
                    borderClass="border-brand-primary/50"
                />

                <StatCard
                    icon={<Flame className="text-red-500 w-8 h-8" />}
                    title="Execution Streak"
                    value={`${statistics.studyStreakDays} Days`}
                    subtitle="Consecutive daily logins"
                    borderClass="border-red-500/50"
                />

                {/* INTELLIGENCE BAR CARDS */}
                <div className="retro-panel p-6 col-span-1 md:col-span-2 flex flex-col justify-center">
                    <h3 className="text-brand-secondary text-sm font-mono uppercase tracking-wider mb-4 border-b border-brand-border pb-2 flex items-center gap-2">
                        <BarChart size={16} /> Volume Analytics
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="block text-xs text-brand-secondary font-mono mb-1 uppercase tracking-widest">Consistency Rating</span>
                            <span className="text-2xl font-bold font-mono text-brand-primary">{consistencyPercentage}%</span>
                        </div>
                        <div>
                            <span className="block text-xs text-brand-secondary font-mono mb-1 uppercase tracking-widest">Log Count</span>
                            <span className="text-2xl font-bold font-mono text-brand-primary">{statistics.totalStudySessions}</span>
                        </div>
                        <div className="mt-2">
                            <span className="block text-xs text-brand-secondary font-mono mb-1 uppercase tracking-widest">Most Dominant</span>
                            <span className="text-sm font-bold font-mono text-brand-primary truncate block" title={mostStudied}>{mostStudied}</span>
                        </div>
                        <div className="mt-2">
                            <span className="block text-xs text-brand-secondary font-mono mb-1 uppercase tracking-widest">Trailing Signal</span>
                            <span className="text-sm font-bold font-mono text-brand-accent truncate block" title={leastStudied}>{leastStudied}</span>
                        </div>
                    </div>
                </div>

                <div className="col-span-1 md:col-span-2 lg:col-span-4">
                    <ConsistencyGraph daysToView={365} activityHistory={activityHistory} />
                </div>

            </div>
        </div>
    );
};

const StatCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    value: string;
    subtitle: string;
    borderClass: string;
}> = ({ icon, title, value, subtitle, borderClass }) => (
    <div className={`retro-panel p-6 flex flex-col md:flex-row items-start md:items-center gap-6`}>
        <div className={`p-4 rounded-lg bg-brand-bg border ${borderClass}`}>
            {icon}
        </div>
        <div>
            <h3 className="text-brand-secondary text-xs lg:text-sm font-mono uppercase tracking-wider mb-1">{title}</h3>
            <div className="text-2xl lg:text-3xl font-bold font-mono text-brand-primary mb-1">{value}</div>
            <p className="text-xs text-brand-secondary/70">{subtitle}</p>
        </div>
    </div>
);
