import React from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { initialTimetable } from '../data/timetableData';
import { initialStatistics } from '../data/statisticsData';
import { logActivity, getTodayDateString } from '../data/activityStore';
import type { DailyTimetable, Statistics, ActivityHistory } from '../types';
import { CheckSquare, Square, Clock } from 'lucide-react';

export const Timetable: React.FC = () => {
    const [timetable, setTimetable] = useLocalStorage<DailyTimetable[]>('devtrack_timetable', initialTimetable);
    const [, setStatistics] = useLocalStorage<Statistics>('devtrack_statistics', initialStatistics);
    const [, setActivityHistory] = useLocalStorage<ActivityHistory>('devtrack_activity', {});

    const toggleTask = (dayIndex: number, taskId: string) => {
        let isCompleting = false;
        let duration = 0;

        setTimetable((prev) => {
            const newTimetable = JSON.parse(JSON.stringify(prev));
            const day = newTimetable[dayIndex];
            if (day) {
                const task = day.tasks.find((t: any) => t.id === taskId);
                if (task) {
                    task.completed = !task.completed;
                    isCompleting = task.completed;
                    duration = task.durationMinutes;
                }
            }
            return newTimetable;
        });

        if (isCompleting) {
            setActivityHistory(prev => logActivity(prev, getTodayDateString(), duration, undefined, true));

            setStatistics((prev) => {
                const todayStr = new Date().toDateString();
                if (prev.lastActiveDate === todayStr) {
                    return prev;
                }

                const lastDate = prev.lastActiveDate ? new Date(prev.lastActiveDate) : null;
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                let newStreak = prev.studyStreakDays;

                if (lastDate) {
                    lastDate.setHours(0, 0, 0, 0);
                    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) {
                        newStreak += 1;
                    } else if (diffDays > 1) {
                        newStreak = 1;
                    }
                } else {
                    newStreak = 1;
                }

                return {
                    ...prev,
                    studyStreakDays: newStreak,
                    lastActiveDate: todayStr,
                    totalStudySessions: prev.totalStudySessions + 1
                };
            });
        }
    };

    const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-8 border-b border-brand-border pb-4">
                <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2">Daily Execution System</h2>
                <p className="retro-text-sub">Systematic weekly scheduling for optimum SDE growth</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {timetable.map((dayData, index) => {
                    const isToday = index === currentDayIndex;
                    const totalTasks = dayData.tasks.length;
                    const completedTasks = dayData.tasks.filter(t => t.completed).length;
                    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                    return (
                        <div
                            key={dayData.day}
                            className={`retro-panel p-5 relative overflow-hidden transition-all duration-300 ${isToday ? 'ring-2 ring-brand-primary shadow-[0_0_15px_rgba(34,197,94,0.1)] -translate-y-1' : 'opacity-80 hover:opacity-100'
                                }`}
                        >
                            {isToday && (
                                <div className="absolute top-0 right-0 bg-brand-primary text-brand-bg text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                                    Today
                                </div>
                            )}

                            <div className="flex justify-between items-center mb-4">
                                <h3 className={`text-lg font-bold uppercase ${isToday ? 'text-brand-primary' : 'text-brand-secondary'}`}>
                                    {dayData.day}
                                </h3>
                                <div className="font-mono text-sm">
                                    <span className={progressPercentage === 100 ? 'text-brand-primary' : 'text-brand-accent'}>
                                        {progressPercentage}%
                                    </span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-1 w-full bg-brand-bg rounded mb-5 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 rounded ${progressPercentage === 100 ? 'bg-brand-primary shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-brand-accent'}`}
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>

                            <div className="space-y-3">
                                {dayData.tasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className={`flex items-start gap-3 p-3 rounded border transition-colors ${task.completed
                                            ? 'bg-brand-bg border-brand-primary/30'
                                            : 'bg-brand-bg/50 border-brand-border hover:border-brand-secondary/50'
                                            }`}
                                    >
                                        <button
                                            onClick={() => toggleTask(index, task.id)}
                                            className={`mt-0.5 shrink-0 transition-colors ${task.completed ? 'text-brand-primary' : 'text-brand-secondary hover:text-brand-accent'
                                                }`}
                                        >
                                            {task.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                                        </button>

                                        <div className="flex-1">
                                            <div className={`font-medium text-sm ${task.completed ? 'text-brand-primary/60 line-through' : 'text-brand-primary'}`}>
                                                {task.title}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-brand-secondary font-mono">
                                                <Clock size={12} />
                                                {task.durationMinutes} min
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
