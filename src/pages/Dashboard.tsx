import React, { useEffect, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { initialTimetable } from '../data/timetableData';
import { useLearningStore } from '../engine/learningStore';
import { AddStudySessionModal } from '../components/AddStudySessionModal';
import { ConsistencyGraph } from '../components/ConsistencyGraph';
import { getAIRecommendation } from '../engine/aiSuggestionEngine';
import { calculateNextBestAction } from '../engine/recommendationEngine';
import { getTodayStats, calculateConsistencyScore } from '../engine/consistencyEngine';
import type { DailyTimetable } from '../types';
import { Brain, Clock, PlusCircle, Target, Flame, TrendingUp, Zap } from 'lucide-react';

export const Dashboard: React.FC = () => {
    const [timetable] = useLocalStorage<DailyTimetable[]>('devtrack_timetable', initialTimetable);
    const {
        roadmap,
        studySessions,
        activityHistory,
        statistics,
        aiRecommendation,
        storeAIRecommendation,
        addStudySession,
    } = useLearningStore();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoadingAI, setIsLoadingAI] = useState(false);

    const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    const todayTasks = timetable[currentDayIndex]?.tasks || [];
    const todayDone = todayTasks.filter(t => t.completed).length;
    const todayProgress = todayTasks.length > 0 ? Math.round((todayDone / todayTasks.length) * 100) : 0;

    const consistencyScore = calculateConsistencyScore(activityHistory);
    const todayStats = getTodayStats(activityHistory);

    // Deterministic fallback recommendation (always available)
    const deterministicRec = calculateNextBestAction(roadmap, studySessions);

    // Use AI recommendation if cached and fresh, else deterministic
    const displayRec = aiRecommendation && (Date.now() - aiRecommendation.cachedAt < 3600000)
        ? { topic: aiRecommendation.topic, reason: aiRecommendation.reason, estimatedTime: aiRecommendation.estimatedTime, category: 'AI · Groq' }
        : deterministicRec
            ? { topic: deterministicRec.topic, reason: deterministicRec.reason, estimatedTime: deterministicRec.estimatedTime, category: deterministicRec.category }
            : null;

    // Fetch fresh AI recommendation in background (respects 60min cache)
    useEffect(() => {
        const shouldFetch = !aiRecommendation || (Date.now() - aiRecommendation.cachedAt > 3600000);
        if (!shouldFetch) return;

        setIsLoadingAI(true);
        getAIRecommendation(roadmap, studySessions, consistencyScore, aiRecommendation)
            .then(rec => {
                storeAIRecommendation(rec);
            })
            .catch(() => { })
            .finally(() => setIsLoadingAI(false));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/50 text-brand-primary px-4 py-2 text-sm font-mono hover:bg-brand-primary hover:text-black transition-colors rounded uppercase tracking-widest"
                >
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

                {/* AI RECOMMENDATION */}
                <div className="retro-panel p-6 lg:col-span-2 relative overflow-hidden border-brand-accent/30">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-accent to-transparent opacity-50" />
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold uppercase text-brand-accent tracking-wide flex items-center gap-2">
                            <Brain size={18} /> AI Mission Brief
                        </h3>
                        {isLoadingAI && (
                            <span className="text-xs font-mono text-brand-secondary animate-pulse">Querying Groq...</span>
                        )}
                        {displayRec && !isLoadingAI && (
                            <span className="text-xs font-mono text-brand-secondary/60 border border-brand-border/30 px-2 py-0.5 rounded">{displayRec.category}</span>
                        )}
                    </div>

                    {displayRec ? (
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <Zap size={18} className="text-brand-accent mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="text-brand-primary font-mono font-bold text-base">{displayRec.topic}</div>
                                    <div className="text-brand-secondary text-sm mt-1">{displayRec.reason}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t border-brand-border/30">
                                <Clock size={14} className="text-brand-secondary" />
                                <span className="text-xs font-mono text-brand-secondary">Est. {displayRec.estimatedTime}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-brand-secondary font-mono text-sm">
                            Loading recommendation...
                        </div>
                    )}
                </div>

                {/* TODAY'S TIMETABLE PROGRESS */}
                <div className="retro-panel p-6">
                    <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-4">Today's Schedule</h3>
                    <div className="mb-4">
                        <div className="flex justify-between text-xs font-mono mb-1">
                            <span className="text-brand-secondary">Completion</span>
                            <span className="text-brand-primary">{todayDone}/{todayTasks.length}</span>
                        </div>
                        <div className="h-2 bg-brand-bg rounded overflow-hidden border border-brand-border/30">
                            <div
                                className="h-full bg-brand-primary transition-all duration-500 rounded"
                                style={{ width: `${todayProgress}%` }}
                            />
                        </div>
                    </div>
                    <div className="space-y-2 max-h-[180px] overflow-y-auto">
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
                            <p className="text-brand-secondary text-xs font-mono">No tasks scheduled today</p>
                        )}
                    </div>
                    {/* Today's logged sessions */}
                    {todayStats.sessionsCompleted > 0 && (
                        <div className="mt-4 pt-4 border-t border-brand-border/30">
                            <div className="text-xs font-mono text-brand-secondary uppercase tracking-widest mb-2">Logged Today</div>
                            <div className="text-brand-primary font-mono text-sm">{todayStats.sessionsCompleted} session{todayStats.sessionsCompleted !== 1 ? 's' : ''} · {todayStats.minutesStudied}m</div>
                        </div>
                    )}
                </div>
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
