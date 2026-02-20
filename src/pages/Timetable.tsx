import React, { useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { initialTimetable } from '../data/timetableData';
import { useLearningStore } from '../engine/learningStore';
import { AddStudySessionModal } from '../components/AddStudySessionModal';
import type { DailyTimetable } from '../types';
import { CheckSquare, Square, Clock, PlusCircle, BookOpen } from 'lucide-react';
import { getTodayDateString } from '../engine/consistencyEngine';

export const Timetable: React.FC = () => {
    const [timetable, setTimetable] = useLocalStorage<DailyTimetable[]>('devtrack_timetable', initialTimetable);
    const { addStudySession, studySessions, setStatistics } = useLearningStore();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const today = getTodayDateString();

    // Sessions logged today from the engine store
    const todaySessions = studySessions.filter(s => s.date === today);

    const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    const toggleTask = (dayIndex: number, taskId: string) => {
        let completing = false;
        let duration = 0;

        setTimetable((prev: DailyTimetable[]) => {
            const next: DailyTimetable[] = JSON.parse(JSON.stringify(prev));
            const task = next[dayIndex]?.tasks.find((t: any) => t.id === taskId);
            if (task) {
                task.completed = !task.completed;
                completing = task.completed;
                duration = task.durationMinutes;
            }
            return next;
        });

        if (completing) {
            setStatistics(prev => {
                const todayStr = new Date().toDateString();
                const lastDate = prev.lastActiveDate ? new Date(prev.lastActiveDate) : null;
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                let newStreak = prev.studyStreakDays;
                if (lastDate) {
                    lastDate.setHours(0, 0, 0, 0);
                    const diff = Math.round((now.getTime() - lastDate.getTime()) / 86400000);
                    if (diff === 1) newStreak += 1;
                    else if (diff > 1) newStreak = 1;
                } else {
                    newStreak = 1;
                }
                return {
                    ...prev,
                    studyStreakDays: newStreak,
                    lastActiveDate: prev.lastActiveDate === todayStr ? prev.lastActiveDate : todayStr,
                    totalStudyMinutes: prev.totalStudyMinutes + duration,
                };
            });
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-8 border-b border-brand-border pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2">Daily Execution System</h2>
                    <p className="retro-text-sub">Weekly schedule + live session log for today</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/50 text-brand-primary px-4 py-2 text-sm font-mono hover:bg-brand-primary hover:text-black transition-colors rounded uppercase tracking-widest"
                >
                    <PlusCircle size={16} /> Add Study Session
                </button>
            </header>

            {/* ── TODAY'S LIVE SESSION LOG ──────────────────────────────────── */}
            <div className="retro-panel p-6 border-brand-accent/30">
                <h3 className="text-sm font-mono uppercase text-brand-accent tracking-widest mb-4 flex items-center gap-2">
                    <BookOpen size={16} /> Today's Study Log — {today}
                </h3>
                {todaySessions.length === 0 ? (
                    <p className="text-brand-secondary font-mono text-sm">No sessions logged today. Hit "Add Study Session" to start.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {todaySessions.map(s => (
                            <div key={s.id} className="flex items-start gap-3 p-3 bg-brand-bg/50 border border-brand-primary/20 rounded">
                                <CheckSquare size={16} className="text-brand-primary mt-0.5 flex-shrink-0" />
                                <div>
                                    <div className="text-brand-primary font-mono text-sm font-bold">{s.topic}</div>
                                    <div className="flex items-center gap-2 mt-1 text-xs font-mono text-brand-secondary">
                                        <span>{s.category}</span>
                                        <span>·</span>
                                        <Clock size={11} />
                                        <span>{s.durationMinutes}m</span>
                                        <span>·</span>
                                        <span className={
                                            s.difficulty === 'Hard' ? 'text-red-400' :
                                                s.difficulty === 'Medium' ? 'text-brand-accent' : 'text-brand-primary'
                                        }>{s.difficulty}</span>
                                    </div>
                                    {s.notes && <div className="text-xs text-brand-secondary/60 mt-1 italic">{s.notes}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── WEEKLY SCHEDULE GRID ─────────────────────────────────────── */}
            <div>
                <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-4">Weekly Schedule</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {timetable.map((dayData, index) => {
                        const isToday = index === currentDayIndex;
                        const total = dayData.tasks.length;
                        const done = dayData.tasks.filter(t => t.completed).length;
                        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                        return (
                            <div
                                key={dayData.day}
                                className={`retro-panel p-5 relative overflow-hidden transition-all duration-300 ${isToday
                                    ? 'ring-2 ring-brand-primary shadow-[0_0_15px_rgba(34,197,94,0.1)] -translate-y-1'
                                    : 'opacity-80 hover:opacity-100'}`}
                            >
                                {isToday && (
                                    <div className="absolute top-0 right-0 bg-brand-primary text-brand-bg text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                                        Today
                                    </div>
                                )}

                                <div className="flex justify-between items-center mb-3">
                                    <h3 className={`text-lg font-bold uppercase ${isToday ? 'text-brand-primary' : 'text-brand-secondary'}`}>
                                        {dayData.day}
                                    </h3>
                                    <span className={`font-mono text-sm ${pct === 100 ? 'text-brand-primary' : 'text-brand-accent'}`}>
                                        {pct}%
                                    </span>
                                </div>

                                <div className="h-1 w-full bg-brand-bg rounded mb-4 overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 rounded ${pct === 100 ? 'bg-brand-primary shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-brand-accent'}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    {dayData.tasks.map(task => (
                                        <div
                                            key={task.id}
                                            className={`flex items-start gap-3 p-3 rounded border transition-colors ${task.completed
                                                ? 'bg-brand-bg border-brand-primary/30'
                                                : 'bg-brand-bg/50 border-brand-border hover:border-brand-secondary/50'}`}
                                        >
                                            <button
                                                onClick={() => toggleTask(index, task.id)}
                                                className={`mt-0.5 shrink-0 transition-colors ${task.completed
                                                    ? 'text-brand-primary' : 'text-brand-secondary hover:text-brand-accent'}`}
                                            >
                                                {task.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </button>
                                            <div className="flex-1">
                                                <div className={`font-medium text-sm ${task.completed ? 'text-brand-primary/60 line-through' : 'text-brand-primary'}`}>
                                                    {task.title}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1 text-xs text-brand-secondary font-mono">
                                                    <Clock size={11} />{task.durationMinutes} min
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {dayData.tasks.length === 0 && (
                                        <p className="text-brand-secondary/50 text-xs font-mono text-center py-2">Rest day</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {isModalOpen && (
                <AddStudySessionModal
                    onClose={() => setIsModalOpen(false)}
                    onSave={session => addStudySession(session)}
                />
            )}
        </div>
    );
};
