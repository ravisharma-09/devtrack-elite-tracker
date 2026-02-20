import React from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { initialRoadmap } from '../data/roadmapData';
import { initialStatistics } from '../data/statisticsData';
import { logActivity, getTodayDateString } from '../data/activityStore';
import type { RoadmapCategory, Statistics, ActivityHistory } from '../types';
import { CheckSquare, Square, Plus, Minus, Lock } from 'lucide-react';

export const Roadmap: React.FC = () => {
    const [roadmap, setRoadmap] = useLocalStorage<RoadmapCategory[]>('devtrack_roadmap', initialRoadmap);
    const [, setStatistics] = useLocalStorage<Statistics>('devtrack_statistics', initialStatistics);
    const [, setActivityHistory] = useLocalStorage<ActivityHistory>('devtrack_activity', {});

    const propagateUnlocks = (newRoadmap: RoadmapCategory[]) => {
        newRoadmap.forEach(category => {
            let isPreviousCompleted = true; // First item defaults to unlocked
            category.topics.forEach((topic, index) => {
                if (index === 0) {
                    topic.unlocked = true;
                } else {
                    topic.unlocked = isPreviousCompleted;
                }
                isPreviousCompleted = topic.completed;
            });
        });
    };

    const toggleTopic = (categoryId: string, topicId: string) => {
        setRoadmap((prev) => {
            const newRoadmap = JSON.parse(JSON.stringify(prev)); // Deep clone
            const category = newRoadmap.find((c: RoadmapCategory) => c.id === categoryId);
            if (category) {
                const topic = category.topics.find((t: any) => t.id === topicId);
                if (topic && topic.unlocked) {
                    topic.completed = !topic.completed;

                    if (topic.completed && topic.targetCount) {
                        topic.progress = topic.targetCount;
                    } else if (!topic.completed && topic.targetCount && topic.progress === topic.targetCount) {
                        topic.progress = 0;
                    }

                    // Update statistics
                    setStatistics((prevStats) => ({
                        ...prevStats,
                        totalRoadmapTopicsCompleted: prevStats.totalRoadmapTopicsCompleted + (topic.completed ? 1 : -1)
                    }));

                    if (topic.completed) {
                        setActivityHistory((prev) => logActivity(prev, getTodayDateString(), 30, topic.title, true));
                    }
                }
            }
            propagateUnlocks(newRoadmap);
            return newRoadmap;
        });
    };

    const updateProgress = (categoryId: string, topicId: string, increment: number) => {
        setRoadmap((prev) => {
            const newRoadmap = JSON.parse(JSON.stringify(prev)); // Deep clone
            const category = newRoadmap.find((c: RoadmapCategory) => c.id === categoryId);
            if (category) {
                const topic = category.topics.find((t: any) => t.id === topicId);
                if (topic && topic.targetCount && topic.unlocked) {
                    const oldProgress = topic.progress;
                    const newProgress = Math.max(0, Math.min(topic.targetCount, topic.progress + increment));
                    topic.progress = newProgress;

                    if (newProgress === topic.targetCount && !topic.completed) {
                        topic.completed = true;
                        setStatistics((prevStats) => ({
                            ...prevStats,
                            totalRoadmapTopicsCompleted: prevStats.totalRoadmapTopicsCompleted + 1,
                            totalProblemsSolved: prevStats.totalProblemsSolved + (newProgress - oldProgress)
                        }));
                        setActivityHistory((prev) => logActivity(prev, getTodayDateString(), 60, topic.title, true));
                    } else if (newProgress < topic.targetCount && topic.completed) {
                        topic.completed = false;
                        setStatistics((prevStats) => ({
                            ...prevStats,
                            totalRoadmapTopicsCompleted: prevStats.totalRoadmapTopicsCompleted - 1,
                            totalProblemsSolved: prevStats.totalProblemsSolved + (newProgress - oldProgress)
                        }));
                    } else {
                        setStatistics((prevStats) => ({
                            ...prevStats,
                            totalProblemsSolved: prevStats.totalProblemsSolved + (newProgress - oldProgress)
                        }));
                    }
                }
            }
            propagateUnlocks(newRoadmap);
            return newRoadmap;
        });
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-8 border-b border-brand-border pb-4">
                <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2">System Roadmap</h2>
                <p className="retro-text-sub">SDE Elite Mastery Track Progression - Dependency Sync Active</p>
            </header>

            {roadmap.map((category) => {
                const completedTopics = category.topics.filter(t => t.completed).length;
                const totalTopics = category.topics.length;
                const categoryProgress = Math.round((completedTopics / totalTopics) * 100);

                return (
                    <section key={category.id} className="retro-panel p-6">
                        <div className="flex justify-between items-end mb-6 border-b border-brand-border/50 pb-2">
                            <h3 className="text-xl font-semibold retro-accent uppercase tracking-wide">[{category.title}]</h3>
                            <div className="text-sm font-mono retro-text-sub">
                                Progress: {completedTopics}/{totalTopics} ({categoryProgress}%)
                            </div>
                        </div>

                        <div className="space-y-4">
                            {category.topics.map((topic) => (
                                <div key={topic.id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 bg-brand-bg/50 border rounded relative overflow-hidden group transition-colors ${topic.unlocked ? 'border-brand-border hover:border-brand-primary/50' : 'border-brand-border/20 opacity-60'}`}>

                                    {/* Progress background bar for topics with target count */}
                                    {topic.targetCount && (
                                        <div
                                            className="absolute left-0 top-0 bottom-0 bg-brand-primary/5 z-0 transition-all duration-500"
                                            style={{ width: `${(topic.progress / topic.targetCount) * 100}%` }}
                                        />
                                    )}

                                    <div className="flex items-start gap-4 z-10 w-full relative">
                                        {!topic.unlocked && (
                                            <div className="absolute -left-1.5 -top-1.5 p-1 bg-brand-bg rounded-full border border-brand-border z-20">
                                                <Lock size={12} className="text-brand-secondary" />
                                            </div>
                                        )}
                                        <button
                                            onClick={() => toggleTopic(category.id, topic.id)}
                                            disabled={!topic.unlocked}
                                            className={`mt-1 transition-colors ${!topic.unlocked ? 'text-brand-border cursor-not-allowed' : 'text-brand-primary hover:text-brand-accent'}`}
                                        >
                                            {topic.completed ? <CheckSquare size={20} /> : <Square size={20} />}
                                        </button>
                                        <div>
                                            <h4 className={`font-medium ${topic.completed ? 'text-brand-primary/70 line-through' : !topic.unlocked ? 'text-brand-secondary' : 'text-brand-primary'}`}>
                                                {topic.title}
                                            </h4>
                                            <div className="text-xs text-brand-secondary mt-1 font-mono">
                                                {topic.unlocked ? `EST: ${topic.estimatedTime}` : 'LOCKED - Complete previous topic first'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 md:mt-0 flex items-center justify-end z-10 w-full md:w-auto">
                                        {topic.targetCount ? (
                                            <div className={`flex items-center gap-3 bg-brand-bg px-3 py-1.5 rounded border ${!topic.unlocked ? 'border-brand-border/20' : 'border-brand-border/50'}`}>
                                                <button
                                                    onClick={() => updateProgress(category.id, topic.id, -1)}
                                                    disabled={!topic.unlocked || topic.progress <= 0}
                                                    className="text-brand-secondary hover:text-brand-accent disabled:opacity-30 disabled:hover:text-brand-secondary transition-colors"
                                                >
                                                    <Minus size={16} />
                                                </button>
                                                <span className={`font-mono text-sm min-w-[3rem] text-center ${!topic.unlocked ? 'text-brand-secondary' : 'text-brand-primary'}`}>
                                                    {topic.progress} / {topic.targetCount}
                                                </span>
                                                <button
                                                    onClick={() => updateProgress(category.id, topic.id, 1)}
                                                    disabled={!topic.unlocked || topic.progress >= topic.targetCount}
                                                    className="text-brand-secondary hover:text-brand-primary disabled:opacity-30 disabled:hover:text-brand-secondary transition-colors"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <span className={`text-xs font-mono uppercase px-2 py-1 rounded border ${!topic.unlocked ? 'bg-brand-bg text-brand-secondary/50 border-brand-border/20' : topic.completed ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/30' : 'bg-brand-bg text-brand-secondary border-brand-border'}`}>
                                                {topic.completed ? 'Completed' : !topic.unlocked ? 'Locked' : 'Pending'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
};
