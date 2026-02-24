import React, { useState, useEffect } from 'react';
import { useStore } from '../engine/learningStore';
import { AddStudySessionModal } from '../components/AddStudySessionModal';
import { CheckSquare, Square, Clock, PlusCircle, BookOpen, PlayCircle, PauseCircle, MoreHorizontal } from 'lucide-react';
import { getTodayDateString } from '../engine/consistencyEngine';
import type { StudySession } from '../types';

export const Timetable: React.FC = () => {
    const { timetable, setTimetableTaskCompleted, addStudySession, studySessions } = useStore();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showAllDays, setShowAllDays] = useState(false);
    const today = getTodayDateString();

    const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
    const [timerSeconds, setTimerSeconds] = useState<number>(0);
    const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
    const [modalPrefill, setModalPrefill] = useState<{ topic?: string, duration?: number, category?: StudySession['category'] }>({});

    // Sessions logged today from the engine store
    const todaySessions = studySessions.filter(s => s.date === today);

    const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    useEffect(() => {
        let interval: any;
        if (isTimerRunning) {
            interval = setInterval(() => {
                setTimerSeconds(s => s + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning]);

    const formatTime = (totalSeconds: number) => {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleStartTimer = (task: any) => {
        if (activeTimerTaskId !== task.id) {
            setActiveTimerTaskId(task.id);
            setTimerSeconds(0);
        }
        setIsTimerRunning(true);
    };

    const handlePauseTimer = () => {
        setIsTimerRunning(false);
    };

    const handleLogSession = (task: any) => {
        setIsTimerRunning(false);
        const mins = Math.max(1, Math.floor(timerSeconds / 60));

        let guessCat: StudySession['category'] = 'DSA';
        const t = task.title.toLowerCase();
        if (t.includes('web') || t.includes('react')) guessCat = 'Web Development';
        else if (t.includes('cp') || t.includes('competitive')) guessCat = 'Competitive Programming';
        else if (t.includes('math')) guessCat = 'Maths';
        else if (t.includes('chem')) guessCat = 'Chemistry';
        else if (t.includes('project')) guessCat = 'Project Work';
        else if (t.includes('open source')) guessCat = 'Open Source';

        setModalPrefill({ topic: task.title, duration: mins, category: guessCat });
        setIsModalOpen(true);
    };

    const toggleTask = (dayIndex: number, taskId: string) => {
        setTimetableTaskCompleted(dayIndex, taskId);
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-8 border-b border-brand-border pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2">Daily Execution System</h2>
                    <p className="retro-text-sub">Weekly schedule + live session log for today</p>
                </div>
                <button
                    onClick={() => {
                        setModalPrefill({});
                        setIsModalOpen(true);
                    }}
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
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest">
                        {showAllDays ? 'Full Weekly Schedule' : "Today's Schedule"}
                    </h3>
                    <button
                        onClick={() => setShowAllDays(!showAllDays)}
                        className="text-brand-secondary hover:text-brand-primary p-2 transition-colors flex items-center gap-2 font-mono text-xs uppercase"
                        title="Toggle full week"
                    >
                        {showAllDays ? 'Hide Full Week' : 'Show Full Week'}
                        <MoreHorizontal size={20} />
                    </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {timetable.map((dayData, index) => {
                        const isToday = index === currentDayIndex;
                        if (!showAllDays && !isToday) return null;

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
                                    {dayData.tasks.map(task => {
                                        const isTaskActiveTimer = activeTimerTaskId === task.id;
                                        return (
                                            <div
                                                key={task.id}
                                                className={`flex flex-col gap-2 p-3 rounded border transition-colors ${task.completed
                                                    ? 'bg-brand-bg border-brand-primary/30'
                                                    : 'bg-brand-bg/50 border-brand-border hover:border-brand-secondary/50'} ${isTaskActiveTimer ? 'ring-1 ring-brand-accent shadow-[0_0_10px_rgba(245,158,11,0.2)]' : ''}`}
                                            >
                                                <div className="flex items-start gap-3">
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
                                                            <Clock size={11} />{task.durationMinutes} min allotted
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Active Timer Controls */}
                                                {isToday && !task.completed && (
                                                    <div className="ml-7 flex items-center gap-3 mt-1 pt-2 border-t border-brand-border/50">
                                                        {isTaskActiveTimer ? (
                                                            <>
                                                                <div className="font-mono text-brand-accent font-bold bg-brand-bg px-2 py-1 rounded text-sm tracking-wider">
                                                                    {formatTime(timerSeconds)}
                                                                </div>
                                                                {isTimerRunning ? (
                                                                    <button onClick={handlePauseTimer} className="flex items-center gap-1 text-xs text-brand-secondary hover:text-brand-accent uppercase font-mono tracking-wider">
                                                                        <PauseCircle size={14} /> Pause
                                                                    </button>
                                                                ) : (
                                                                    <button onClick={() => handleStartTimer(task)} className="flex items-center gap-1 text-xs text-brand-secondary hover:text-brand-primary uppercase font-mono tracking-wider">
                                                                        <PlayCircle size={14} /> Resume
                                                                    </button>
                                                                )}
                                                                <button onClick={() => handleLogSession(task)} className="flex items-center gap-1 text-xs text-brand-primary bg-brand-primary/10 px-2 py-1 rounded hover:bg-brand-primary hover:text-black uppercase font-mono tracking-wider ml-auto">
                                                                    Log & Done
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button onClick={() => handleStartTimer(task)} className="flex items-center gap-1 text-xs text-brand-secondary hover:text-brand-primary uppercase font-mono tracking-wider">
                                                                <PlayCircle size={14} /> Start Timer
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
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
                    initialTopic={modalPrefill.topic}
                    initialCategory={modalPrefill.category}
                    initialDuration={modalPrefill.duration}
                    onSave={(session) => {
                        addStudySession(session);
                        // Stop and clear timer if the logged session corresponds to it
                        if (activeTimerTaskId) {
                            setIsTimerRunning(false);
                            setActiveTimerTaskId(null);
                            setTimerSeconds(0);
                        }
                    }}
                />
            )}
        </div>
    );
};
