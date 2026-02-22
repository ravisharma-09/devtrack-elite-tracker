import React from 'react';
import { useStore } from '../engine/learningStore';
import type { RoadmapCategory } from '../types';
import { CheckSquare, Square, Plus, Minus, Lock } from 'lucide-react';
import { syncRoadmapTopic } from '../engine/syncEngine';
import { useAuth } from '../auth/AuthContext';

export const Roadmap: React.FC = () => {
    const {
        roadmap,
        completeMicroTask,
        updateTopicProgress,
        setRoadmap,
        setStatistics,
    } = useStore();

    const { user } = useAuth();

    // Toggle a whole topic (non-microtask topics only)
    const toggleTopic = (categoryId: string, topicId: string) => {
        setRoadmap(prev => {
            const next: RoadmapCategory[] = JSON.parse(JSON.stringify(prev));
            const cat = next.find(c => c.id === categoryId);
            if (!cat) return prev;
            const topic = cat.topics.find(t => t.id === topicId);
            if (!topic || !topic.unlocked || topic.tasks?.length) return prev;

            const wasComplete = topic.completed;
            topic.completed = !topic.completed;
            if (topic.completed && topic.targetCount) topic.progress = topic.targetCount;
            else if (!topic.completed && topic.targetCount) topic.progress = 0;

            next.forEach(c => {
                let prevDone = true;
                c.topics.forEach((t, idx) => {
                    t.unlocked = idx === 0 ? true : prevDone;
                    prevDone = t.completed;
                });
            });

            setStatistics(s => ({
                ...s,
                totalRoadmapTopicsCompleted: s.totalRoadmapTopicsCompleted + (topic.completed && !wasComplete ? 1 : (!topic.completed && wasComplete ? -1 : 0)),
            }));

            // Auto-unlock and DB write to roadmap_progress
            if (user && user.id !== 'local') {
                syncRoadmapTopic(categoryId, topicId, topic.progress || 0, topic.completed, user.id).catch(() => { });
            }

            return next;
        });
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-8 border-b border-brand-border pb-4">
                <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2">System Roadmap</h2>
                <p className="retro-text-sub">SDE Elite Mastery Track — Dependency-Ordered Execution</p>
            </header>

            {roadmap.map(category => {
                const completedCount = category.topics.filter(t => t.completed).length;
                const totalCount = category.topics.length;
                const catPct = Math.round((completedCount / totalCount) * 100);

                return (
                    <section key={category.id} className="retro-panel p-6">
                        {/* Category header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 border-b border-brand-border/50 pb-3 gap-2">
                            <h3 className="text-xl font-semibold retro-accent uppercase tracking-wide">
                                [{category.title}]
                            </h3>
                            <div className="flex items-center gap-3">
                                <div className="w-32 h-1.5 bg-brand-bg rounded overflow-hidden border border-brand-border/30">
                                    <div className="h-full bg-brand-primary transition-all duration-500" style={{ width: `${catPct}%` }} />
                                </div>
                                <span className="text-xs font-mono text-brand-secondary">
                                    {completedCount}/{totalCount} · {catPct}%
                                </span>
                            </div>
                        </div>

                        {/* Topics */}
                        <div className="space-y-3">
                            {category.topics.map(topic => {
                                const hasMicroTasks = topic.tasks && topic.tasks.length > 0;
                                const hasQuantTarget = !!topic.targetCount;
                                const microDone = hasMicroTasks
                                    ? (topic.tasks as any[]).filter((t: any) => t.completed).length
                                    : 0;

                                return (
                                    <div
                                        key={topic.id}
                                        className={`flex flex-col p-4 rounded border relative overflow-hidden transition-colors ${topic.unlocked
                                            ? 'bg-brand-bg/50 border-brand-border hover:border-brand-primary/40'
                                            : 'bg-brand-bg/20 border-brand-border/20 opacity-50'}`}
                                    >
                                        {/* DSA progress bar background */}
                                        {hasQuantTarget && topic.unlocked && (
                                            <div
                                                className="absolute left-0 top-0 bottom-0 bg-brand-primary/5 transition-all duration-500"
                                                style={{ width: `${(topic.progress / topic.targetCount!) * 100}%` }}
                                            />
                                        )}

                                        {/* Topic Row */}
                                        <div className="flex items-center justify-between z-10 relative">
                                            <div className="flex items-center gap-3">
                                                {!topic.unlocked ? (
                                                    <Lock size={16} className="text-brand-border flex-shrink-0" />
                                                ) : hasMicroTasks ? (
                                                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0 ${topic.completed ? 'bg-brand-primary border-brand-primary' : 'border-brand-border'}`}>
                                                        {topic.completed && <span className="text-brand-bg text-xs">✓</span>}
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => hasQuantTarget ? undefined : toggleTopic(category.id, topic.id)}
                                                        disabled={!topic.unlocked}
                                                        className={`flex-shrink-0 transition-colors ${!topic.unlocked ? 'cursor-not-allowed text-brand-border' : 'text-brand-primary hover:text-brand-accent'}`}
                                                    >
                                                        {topic.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                                                    </button>
                                                )}

                                                <div>
                                                    <h4 className={`font-medium text-sm ${topic.completed ? 'text-brand-primary/60 line-through' : !topic.unlocked ? 'text-brand-secondary' : 'text-brand-primary'}`}>
                                                        {topic.title}
                                                    </h4>
                                                    <div className="text-xs text-brand-secondary font-mono mt-0.5">
                                                        {!topic.unlocked
                                                            ? '🔒 Complete previous topic to unlock'
                                                            : hasMicroTasks
                                                                ? `${microDone}/${topic.tasks!.length} tasks done`
                                                                : `Est: ${topic.estimatedTime}`}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* DSA +/- controls */}
                                            {hasQuantTarget && topic.unlocked && (
                                                <div className={`flex items-center gap-2 bg-brand-bg px-2.5 py-1 rounded border border-brand-border/50`}>
                                                    <button
                                                        onClick={() => updateTopicProgress(category.id, topic.id, -1)}
                                                        disabled={topic.progress <= 0}
                                                        className="text-brand-secondary hover:text-brand-accent disabled:opacity-30 transition-colors"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="font-mono text-xs min-w-[4rem] text-center text-brand-primary">
                                                        {topic.progress} / {topic.targetCount}
                                                    </span>
                                                    <button
                                                        onClick={() => updateTopicProgress(category.id, topic.id, 1)}
                                                        disabled={topic.progress >= topic.targetCount!}
                                                        className="text-brand-secondary hover:text-brand-primary disabled:opacity-30 transition-colors"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Status badge for plain topics */}
                                            {!hasQuantTarget && !hasMicroTasks && topic.unlocked && (
                                                <span className={`text-xs font-mono uppercase px-2 py-1 rounded border ${topic.completed ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/30' : 'text-brand-secondary border-brand-border'}`}>
                                                    {topic.completed ? 'Done' : 'Pending'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Micro-task checklist */}
                                        {hasMicroTasks && topic.unlocked && (
                                            <div className="mt-4 pt-4 border-t border-brand-border/20 z-10 relative">
                                                <div className="text-xs uppercase text-brand-secondary tracking-widest font-mono mb-3">
                                                    Execution Checklist — {microDone}/{topic.tasks!.length}
                                                </div>
                                                <ul className="space-y-2">
                                                    {(topic.tasks as any[]).map((task: any) => (
                                                        <li key={task.id} className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => completeMicroTask(category.id, topic.id, task.id, !task.completed)}
                                                                className={`flex-shrink-0 transition-colors ${task.completed ? 'text-brand-primary' : 'text-brand-secondary hover:text-brand-accent'}`}
                                                            >
                                                                {task.completed ? <CheckSquare size={15} /> : <Square size={15} />}
                                                            </button>
                                                            <span className={`text-sm ${task.completed ? 'line-through text-brand-secondary' : 'text-brand-primary/90'}`}>
                                                                {task.title}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Micro-task checklist locked state hint */}
                                        {hasMicroTasks && !topic.unlocked && (
                                            <div className="mt-3 pt-3 border-t border-brand-border/10 z-10 relative">
                                                <p className="text-xs text-brand-secondary/40 font-mono">
                                                    {topic.tasks!.length} tasks locked — complete previous topic
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
};
