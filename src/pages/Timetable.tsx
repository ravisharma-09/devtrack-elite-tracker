import React, { useState, useEffect } from 'react';
import { useStore } from '../engine/learningStore';
import { AddStudySessionModal } from '../components/AddStudySessionModal';
import { CheckSquare, Square, Clock, PlusCircle, BookOpen, PlayCircle, PauseCircle, MoreHorizontal } from 'lucide-react';
import { getTodayDateString } from '../engine/consistencyEngine';
import type { StudySession } from '../types';

export const Timetable: React.FC = () => {
    const { timetable, setTimetableTaskCompleted, addStudySession, studySessions, timerState, startTimer, pauseTimer, stopAndClearTimer } = useStore();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showAllDays, setShowAllDays] = useState(false);
    const today = getTodayDateString();

    const [displaySeconds, setDisplaySeconds] = useState<number>(0);
    const [modalPrefill, setModalPrefill] = useState<{ topic?: string, duration?: number, category?: StudySession['category'] }>({});

    // Sessions logged today from the engine store
    const todaySessions = studySessions.filter(s => s.date === today);

    const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    useEffect(() => {
        let interval: any;
        if (timerState.isRunning) {
            interval = setInterval(() => {
                setDisplaySeconds(
                    timerState.accumulatedSeconds +
                    Math.floor((Date.now() - (timerState.lastStartedTimestamp || Date.now())) / 1000)
                );
            }, 1000);
        } else {
            setDisplaySeconds(timerState.accumulatedSeconds);
        }
        return () => clearInterval(interval);
    }, [timerState]);

    const formatTimeBig = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleStartTimer = (task: any) => {
        startTimer(task);
    };

    const handlePauseTimer = () => {
        pauseTimer();
    };

    const handleLogSession = (task: any) => {
        pauseTimer();
        const mins = Math.max(1, Math.floor(displaySeconds / 60));

        let guessCat: StudySession['category'] = 'DSA';
        const t = task.title.toLowerCase();
        if (t.includes('web') || t.includes('react')) guessCat = 'Web Development';
        else if (t.includes('cp') || t.includes('competitive')) guessCat = 'Competitive Programming';
        else if (t.includes('math')) guessCat = 'Maths';
        else if (t.includes('chem')) guessCat = 'Chemistry';
        else if (t.includes('project')) guessCat = 'Project Work';
        else if (t.includes('open source') || t.includes('os')) guessCat = 'Open Source';

        setModalPrefill({ topic: task.id === 'custom' ? '' : task.title, duration: mins, category: guessCat });
        setIsModalOpen(true);
    };

    const toggleTask = (dayIndex: number, taskId: string) => {
        setTimetableTaskCompleted(dayIndex, taskId);
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-4 border-b border-brand-border pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2">Daily Execution System</h2>
                    <p className="retro-text-sub">Run live study blocks and track timetable progress</p>
                </div>
                <button
                    onClick={() => {
                        setModalPrefill({});
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/50 text-brand-primary px-4 py-2 text-sm font-mono hover:bg-brand-primary hover:text-black transition-colors rounded uppercase tracking-widest"
                >
                    <PlusCircle size={16} /> Log Manually
                </button>
            </header>

            {/* ── BIG CENTRAL TIMER ────────────────────────────────────────── */}
            <div className={`retro-panel p-8 text-center border-2 transition-all duration-300 ${timerState.isRunning ? 'border-brand-primary shadow-[0_0_30px_rgba(34,197,94,0.15)]' : 'border-brand-accent/30'}`}>
                {timerState.task ? (
                    <div>
                        <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-2 flex items-center justify-center gap-2">
                            <Clock size={16} className={timerState.isRunning ? "text-brand-primary animate-pulse" : ""} />
                            Currently Active: <span className="text-brand-primary ml-1">{timerState.task.title}</span>
                        </h3>
                        <div className={`text-6xl md:text-8xl font-black font-mono tracking-widest my-8 ${timerState.isRunning ? 'text-brand-primary drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'text-brand-accent drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]'}`}>
                            {formatTimeBig(displaySeconds)}
                        </div>
                        <div className="flex flex-wrap justify-center items-center gap-4">
                            {timerState.isRunning ? (
                                <button onClick={handlePauseTimer} className="flex items-center gap-2 bg-brand-bg border border-brand-accent text-brand-accent px-6 py-3 rounded hover:bg-brand-accent hover:text-black uppercase font-mono tracking-widest transition-colors font-bold">
                                    <PauseCircle size={20} /> Pause Clock
                                </button>
                            ) : (
                                <button onClick={() => handleStartTimer(timerState.task)} className="flex items-center gap-2 bg-brand-bg border border-brand-primary text-brand-primary px-6 py-3 rounded hover:bg-brand-primary hover:text-black uppercase font-mono tracking-widest transition-colors font-bold">
                                    <PlayCircle size={20} /> Resume Clock
                                </button>
                            )}
                            <button onClick={() => handleLogSession(timerState.task)} className="flex items-center gap-2 bg-brand-primary/20 border border-brand-primary text-brand-primary px-6 py-3 rounded hover:bg-brand-primary hover:text-black uppercase font-mono tracking-widest transition-colors font-bold">
                                <CheckSquare size={20} /> End & Log Session
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="py-6">
                        <div className="text-6xl md:text-8xl font-black font-mono tracking-widest my-8 text-brand-secondary/30">
                            00:00
                        </div>
                        <p className="text-brand-secondary font-mono text-sm mb-6 uppercase tracking-wider">Select a task from today's timetable below, or start a random session.</p>
                        <button onClick={() => handleStartTimer({ id: 'custom', title: 'Custom Session' })} className="flex items-center gap-2 bg-brand-bg border border-brand-accent text-brand-accent px-6 py-3 rounded hover:bg-brand-accent hover:text-black uppercase font-mono tracking-widest transition-colors mx-auto font-bold">
                            <PlayCircle size={20} /> Start Custom Session
                        </button>
                    </div>
                )}
            </div>

            {/* ── TODAY'S LIVE SESSION LOG ──────────────────────────────────── */}
            <div className="retro-panel p-6 border-brand-accent/30">
                <h3 className="text-sm font-mono uppercase text-brand-accent tracking-widest mb-4 flex items-center gap-2">
                    <BookOpen size={16} /> Today's Completed Logs — {today}
                </h3>
                {todaySessions.length === 0 ? (
                    <p className="text-brand-secondary font-mono text-sm">No sessions completed today yet.</p>
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
                                        const isTaskActiveTimer = timerState.task?.id === task.id;
                                        return (
                                            <div
                                                key={task.id}
                                                className={`flex items-center justify-between gap-2 p-3 rounded border transition-colors ${task.completed
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
                                                    <div>
                                                        <div className={`font-medium text-sm ${task.completed ? 'text-brand-primary/60 line-through' : 'text-brand-primary'}`}>
                                                            {task.title}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-1 text-xs text-brand-secondary font-mono">
                                                            <Clock size={11} />{task.durationMinutes} min allotted
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Start Timer Play Button Wrapper */}
                                                {isToday && !task.completed && !isTaskActiveTimer && (
                                                    <button onClick={() => handleStartTimer(task)} className="p-2 text-brand-secondary hover:text-brand-primary transition-colors flex-shrink-0" title="Load into Timer">
                                                        <PlayCircle size={20} />
                                                    </button>
                                                )}
                                                {isToday && !task.completed && isTaskActiveTimer && (
                                                    <div className="px-2 font-mono text-brand-accent text-xs font-bold uppercase tracking-wider animate-pulse flex-shrink-0">
                                                        Active
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
                        if (timerState.task) {
                            stopAndClearTimer();
                        }
                    }}
                />
            )}
        </div>
    );
};
