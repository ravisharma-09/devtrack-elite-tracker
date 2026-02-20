import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { initialTimetable } from '../data/timetableData';
import { initialRoadmap } from '../data/roadmapData';
import { initialStatistics } from '../data/statisticsData';
import { initialStudySessions } from '../data/studySessionStore';
import { logActivity, getTodayDateString } from '../data/activityStore';
import { analyzeLearningState } from '../engines/learningAnalyzer';
import { ConsistencyGraph } from '../components/ConsistencyGraph';
import { AddStudySessionModal } from '../components/AddStudySessionModal';
import type { DailyTimetable, RoadmapCategory, Statistics, ActivityHistory, StudySession } from '../types';
import { CalendarDays, Brain, Target, Clock, BarChart, PlusCircle } from 'lucide-react';

export const Dashboard: React.FC = () => {
    const [timetable] = useLocalStorage<DailyTimetable[]>('devtrack_timetable', initialTimetable);
    const [roadmap] = useLocalStorage<RoadmapCategory[]>('devtrack_roadmap', initialRoadmap);
    const [, setStatistics] = useLocalStorage<Statistics>('devtrack_statistics', initialStatistics);
    const [activityHistory, setActivityHistory] = useLocalStorage<ActivityHistory>('devtrack_activity', {});
    const [studySessions, setStudySessions] = useLocalStorage<StudySession[]>('devtrack_sessions', initialStudySessions);

    const [isModalOpen, setIsModalOpen] = useState(false);

    const intelligence = analyzeLearningState(roadmap, activityHistory, studySessions);
    const nextBestAction = intelligence.nextTopic;

    const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    const todayTasks = timetable[currentDayIndex]?.tasks || [];
    const todayCompleted = todayTasks.filter(t => t.completed).length;
    const todayProgress = todayTasks.length > 0 ? Math.round((todayCompleted / todayTasks.length) * 100) : 0;

    const handleAddSession = (sessionData: Omit<StudySession, 'id' | 'date'>) => {
        const newSession: StudySession = {
            ...sessionData,
            id: Math.random().toString(36).substr(2, 9),
            date: getTodayDateString(),
        };

        setStudySessions(prev => [...prev, newSession]);
        setActivityHistory(prev => logActivity(prev, newSession.date, newSession.durationMinutes, newSession.topic, true));
        setStatistics(prev => ({
            ...prev,
            totalStudySessions: prev.totalStudySessions + 1,
            totalStudyMinutes: prev.totalStudyMinutes + newSession.durationMinutes
        }));
    };

    const currentWeekMinutes = studySessions
        .filter(s => {
            const today = new Date();
            const sessionDate = new Date(s.date);
            const diffTime = Math.abs(today.getTime() - sessionDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 7;
        })
        .reduce((acc, curr) => acc + curr.durationMinutes, 0);

    const weeklyHours = (currentWeekMinutes / 60).toFixed(1);

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-8 border-b border-brand-border pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2">DevTrack Core</h2>
                    <p className="retro-text-sub flex items-center gap-2">
                        Intelligence Engine: <span className="text-brand-accent tracking-widest">ONLINE</span>
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/50 text-brand-primary px-4 py-2 text-sm font-mono hover:bg-brand-primary hover:text-black transition-colors rounded uppercase tracking-widest"
                    >
                        <PlusCircle size={16} /> Add Session
                    </button>
                </div>
            </header>

            {/* Primary Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* INTELLIGENT RECOMMENDATION CARD */}
                {nextBestAction && (
                    <div className="retro-panel p-6 shadow-[0_0_15px_rgba(245,158,11,0.05)] border-brand-accent/30 lg:col-span-2 relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-10 transition-opacity duration-700">
                            <Brain size={160} />
                        </div>

                        <div className="relative z-10 flex items-center justify-between mb-4 border-b border-brand-accent/20 pb-2">
                            <h3 className="text-xl font-bold uppercase text-brand-accent tracking-wide flex items-center gap-2">
                                <Brain size={20} /> AI Analysis
                            </h3>
                            <span className="text-xs font-mono text-brand-secondary">User Level: <strong className="text-brand-accent">{intelligence.userLevel}</strong></span>
                        </div>

                        <div className="relative z-10 grid grid-cols-2 gap-4">
                            <div className="bg-brand-bg border border-brand-border/50 p-4 rounded">
                                <div className="text-xs uppercase text-brand-secondary tracking-widest mb-1 mb-2 font-mono">Next Target</div>
                                <div className="text-xl text-brand-primary font-bold">{nextBestAction.actionTopic}</div>
                                <div className="text-sm text-brand-secondary mt-1 flex items-center gap-1"><Target size={14} /> {nextBestAction.category}</div>
                            </div>

                            <div className="bg-brand-bg border border-[rgba(245,158,11,0.2)] p-4 rounded flex flex-col justify-center">
                                <div className="text-xs uppercase text-brand-secondary font-mono tracking-wide mb-1 flex items-center gap-1"><Clock size={12} /> Focus Reason</div>
                                <div className="text-brand-accent/90 text-sm leading-relaxed">{nextBestAction.reason}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STUDY HOURS THIS WEEK */}
                <div className="retro-panel p-6 flex flex-col justify-center border-brand-primary/20 bg-brand-bg/50 relative overflow-hidden">
                    <div className="absolute bottom-0 right-0 p-4 opacity-5"><BarChart size={80} /></div>
                    <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-2 relative z-10">This Week</h3>
                    <div className="flex items-end gap-2 relative z-10">
                        <span className="text-5xl font-bold font-mono text-brand-primary">{weeklyHours}</span>
                        <span className="text-brand-secondary pb-1 font-mono tracking-widest mb-1">HRS</span>
                    </div>
                </div>

                {/* ACTIVE FOCUS AREA */}
                <div className="retro-panel p-6 flex flex-col justify-center border-blue-400/20 bg-brand-bg/50">
                    <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-2">Engine Assessment</h3>
                    <div className="space-y-3 mt-1">
                        <div>
                            <span className="text-xs text-brand-secondary uppercase tracking-widest block mb-0.5">Primary Strength</span>
                            <span className="text-brand-primary font-mono text-sm block truncate" title={intelligence.strength}>{intelligence.strength}</span>
                        </div>
                        <div>
                            <span className="text-xs text-brand-secondary uppercase tracking-widest block mb-0.5">Growth Area</span>
                            <span className="text-brand-accent font-mono text-sm block truncate" title={intelligence.weakness}>{intelligence.weakness}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* EXECUTION CONSISTENCY GRAPH */}
                <div className="lg:col-span-2 flex">
                    <div className="w-full">
                        <ConsistencyGraph daysToView={90} activityHistory={activityHistory} />
                    </div>
                </div>

                {/* DAILY OVERVIEW WIDGET */}
                <div className="retro-panel p-6 shadow-[0_0_15px_rgba(34,197,94,0.05)] border-brand-primary/30 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <CalendarDays className="text-brand-primary" />
                            <h3 className="text-lg font-bold uppercase text-brand-primary tracking-wide">Daily Output</h3>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-brand-secondary font-mono tracking-widest uppercase">Timetable Sync</span>
                                    <span className="text-xs font-mono text-brand-primary">{todayProgress}%</span>
                                </div>
                                <div className="h-2 w-full bg-brand-bg rounded-full overflow-hidden border border-brand-border/50">
                                    <div
                                        className="h-full bg-brand-primary shadow-[0_0_10px_rgba(34,197,94,0.5)] transition-all duration-1000"
                                        style={{ width: `${todayProgress}%` }}
                                    />
                                </div>
                            </div>

                            {todayTasks.length > 0 && (
                                <div className="mt-6 pt-4 border-t border-brand-border/30">
                                    <div className="text-xs text-brand-secondary font-mono tracking-widest uppercase mb-3">Tasks Remainder</div>
                                    <div className="space-y-2">
                                        {todayTasks.filter(t => !t.completed).map(task => (
                                            <div key={task.id} className="text-sm text-brand-primary/80 truncate flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent"></div>
                                                {task.title}
                                            </div>
                                        ))}
                                        {todayTasks.filter(t => !t.completed).length === 0 && (
                                            <div className="text-sm font-mono text-brand-secondary italic">All targets neutralized.</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {isModalOpen && (
                <AddStudySessionModal
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleAddSession}
                />
            )}
        </div>
    );
};
