import React, { useEffect, useState } from 'react';
import { useStore } from '../engine/learningStore';
import { useAuth } from '../auth/AuthContext';
import { AddStudySessionModal } from '../components/AddStudySessionModal';
import { ConsistencyGraph } from '../components/ConsistencyGraph';
import { AnimatedProgressGraph } from '../components/AnimatedProgressGraph';
import { getSupabaseClient } from '../backend/supabaseClient';
import { Link } from 'react-router-dom';
import { RetroLoader } from '../components/RetroLoader';
import { Brain, Clock, PlusCircle, Target, Flame, TrendingUp, Zap, Activity as ActivityIcon } from 'lucide-react';
export const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const {
        roadmap, activityHistory, aiAnalytics, timetable, addStudySession, setAiAnalytics, studySessions
    } = useStore();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [recentActivities, setRecentActivities] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);


    const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
    const todayTasks = (timetable[currentDayIndex]?.tasks || []) as any[];
    const todayDone = todayTasks.filter((t: any) => t.completed).length;
    const todayProgress = todayTasks.length > 0 ? Math.round((todayDone / todayTasks.length) * 100) : 0;

    useEffect(() => {
        if (!user) return;
        let mounted = true;

        const fetchData = async () => {
            const supabase = await getSupabaseClient();
            if (!supabase) return;

            // Fetch Profiles
            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (mounted && profileData) {
                setProfile(profileData);
            }

            // Fetch Recent Internal/External Activities
            const [intRes, extRes] = await Promise.all([
                supabase.from('activities').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
                supabase.from('external_activity').select('*').eq('user_id', user.id).order('activity_timestamp', { ascending: false }).limit(5)
            ]);

            if (mounted && extRes.data) {
                setRecentActivities(extRes.data);
            }

            if (mounted && intRes.data) {
                // Internal activities handle logic (empty for now without study sessions)
            }

            // Sync AI Analytics dynamically
            try {
                if (mounted && profileData) {
                    setIsLoadingAI(true);
                    const { syncAIAnalytics } = await import('../engine/aiSyncEngine');

                    // Transform intRes.data to StudySession interface type implicitly mapped
                    const mappedSessions = intRes.data?.filter((a: any) => a.type === 'study').map((a: any) => ({
                        id: a.id, topic: a.topic || 'General', category: a.source || 'devtrack', durationMinutes: a.score || 30, date: a.created_at, timestamp: new Date(a.created_at).getTime(), difficulty: a.difficulty || 'Medium'
                    })) || [];

                    const aiPayload = await syncAIAnalytics(user.id, profileData, roadmap, activityHistory, mappedSessions, aiAnalytics, false);
                    if (mounted && aiPayload) {
                        setAiAnalytics(aiPayload);
                    }
                    if (mounted) setIsLoadingAI(false);
                }
            } catch (e) {
                console.error("AI Sync failed in Dashboard", e);
                if (mounted) setIsLoadingAI(false);
            }
        };

        fetchData();

        getSupabaseClient().then(supabase => {
            if (!supabase) return;
            const sub = supabase.channel('dashboard_changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, () => {
                    fetchData();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'external_activity', filter: `user_id=eq.${user.id}` }, () => {
                    fetchData();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'activities', filter: `user_id=eq.${user.id}` }, () => {
                    fetchData();
                })
                .subscribe();
            return () => { supabase.removeChannel(sub); };
        });

        return () => { mounted = false; };
    }, [user]);


    const streak = profile?.consistency_score || 0;

    // ─── NEW STATS LOGIC ───────────────────────────────────────
    const categoryTotals: Record<string, number> = {};
    const categoryWeekly: Record<string, number> = {};
    let openSourceWeekly = 0;
    let dsaWeekly = 0;
    let lastMathsChemDate: Date | null = null;
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    studySessions.forEach(session => {
        const cat = session.category;
        const duration = session.durationMinutes || 0;
        const sessionDate = new Date(session.timestamp);

        categoryTotals[cat] = (categoryTotals[cat] || 0) + duration;
        if (sessionDate >= oneWeekAgo) {
            categoryWeekly[cat] = (categoryWeekly[cat] || 0) + duration;
            if (cat === 'Open Source') openSourceWeekly += duration;
            if (cat === 'DSA') dsaWeekly += duration;
        }
        if (cat === 'Maths' || cat === 'Chemistry') {
            if (!lastMathsChemDate || sessionDate > lastMathsChemDate) lastMathsChemDate = sessionDate;
        }
    });

    const activeCategories = Object.entries(categoryTotals).filter(([, v]) => v > 0);
    let mostFocused = 'N/A';
    let leastFocused = 'N/A';
    if (activeCategories.length > 0) {
        activeCategories.sort((a, b) => b[1] - a[1]);
        mostFocused = activeCategories[0][0];
        leastFocused = activeCategories[activeCategories.length - 1][0];
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const todayStudyMinutes = studySessions
        .filter(s => new Date(s.timestamp).toISOString().split('T')[0] === todayStr || s.date === todayStr)
        .reduce((acc, curr) => acc + curr.durationMinutes, 0);

    let weeklyPlannedMinutes = 0;
    let weeklyCompletedMinutes = 0;
    timetable.forEach(day => {
        day.tasks.forEach(t => {
            weeklyPlannedMinutes += t.durationMinutes;
            if (t.completed) weeklyCompletedMinutes += t.durationMinutes;
        });
    });
    const weeklyExecutionRate = weeklyPlannedMinutes > 0 ? Math.round((weeklyCompletedMinutes / weeklyPlannedMinutes) * 100) : 0;
    const missedMathsChemDays = lastMathsChemDate ? Math.floor((now.getTime() - (lastMathsChemDate as Date).getTime()) / (1000 * 3600 * 24)) : 7;
    // ───────────────────────────────────────────────────────────

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-8 border-b border-brand-border pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2">Command Center</h2>
                    <p className="retro-text-sub">SDE Elite Execution Dashboard — All Systems Nominal</p>
                </div>
                <button onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/50 text-brand-primary px-4 py-2 text-sm font-mono hover:bg-brand-primary hover:text-black transition-colors rounded uppercase tracking-widest">
                    <PlusCircle size={16} /> Log Session
                </button>
            </header>

            {/* STATS ROW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {
                    [
                        { label: 'Weekly Execution', value: `${weeklyExecutionRate}%`, icon: <TrendingUp size={18} className="text-brand-primary" />, color: 'text-brand-primary' },
                        { label: 'Study Streak', value: `${streak}d`, icon: <Flame size={18} className="text-red-400" />, color: 'text-red-400' },
                        { label: 'Most Focused', value: mostFocused, icon: <Target size={18} className="text-brand-accent" />, color: 'text-brand-accent' },
                        { label: 'Least Focused', value: leastFocused, icon: <Clock size={18} className="text-brand-secondary" />, color: 'text-brand-secondary' },
                    ].map(stat => (
                        <div key={stat.label} className="retro-panel p-4 flex items-center gap-3">
                            <div className="p-2 bg-brand-bg rounded-lg border border-brand-border">{stat.icon}</div>
                            <div className="overflow-hidden">
                                <div className="text-xs font-mono text-brand-secondary uppercase tracking-widest">{stat.label}</div>
                                <div className={`text-xl font-bold font-mono truncate ${stat.color}`}>{stat.value}</div>
                            </div>
                        </div>
                    ))
                }
            </div >

            {/* SMART ALERTS */}
            {(missedMathsChemDays >= 7 || openSourceWeekly < 60 || dsaWeekly < 240) && (
                <div className="bg-brand-bg/80 border border-brand-accent/50 rounded-lg p-4 animate-fade-in shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                    <h3 className="text-sm font-mono uppercase text-brand-accent tracking-widest mb-2 flex items-center gap-2">
                        <Zap size={16} /> Course Correction Required
                    </h3>
                    <ul className="space-y-1">
                        {missedMathsChemDays >= 7 && (
                            <li className="text-sm text-brand-secondary font-mono flex items-center gap-2">
                                <span className="text-red-400">●</span> It has been over 7 days since your last Maths/Chemistry session. Time to review!
                            </li>
                        )}
                        {openSourceWeekly < 60 && (
                            <li className="text-sm text-brand-secondary font-mono flex items-center gap-2">
                                <span className="text-yellow-400">●</span> Open Source contribution is low ({openSourceWeekly}m this week). Suggest picking up a small issue to solve.
                            </li>
                        )}
                        {dsaWeekly < 240 && (
                            <li className="text-sm text-brand-secondary font-mono flex items-center gap-2">
                                <span className="text-brand-primary">●</span> DSA focus is under 4 hours this week ({Math.floor(dsaWeekly / 60)}h {dsaWeekly % 60}m). Consider a focus shift.
                            </li>
                        )}
                    </ul>
                </div>
            )}

            {/* CATEGORY BREAKDOWN */}
            <div className="retro-panel p-6">
                <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-4">Focus Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {['DSA', 'Competitive Programming', 'Maths', 'Chemistry', 'Open Source', 'Web Development', 'Project Work'].map(cat => {
                        const totalMins = categoryTotals[cat] || 0;
                        const hrs = (totalMins / 60).toFixed(1);
                        return (
                            <div key={cat} className="p-3 bg-brand-bg/50 border border-brand-border/30 rounded text-center">
                                <div className="text-[10px] uppercase font-mono text-brand-secondary/80 mb-1 leading-tight h-6">{cat === 'Competitive Programming' ? 'CP' : cat === 'Web Development' ? 'Web Dev' : cat}</div>
                                <div className="text-lg font-bold font-mono text-brand-primary">{hrs} <span className="text-xs text-brand-secondary">hrs</span></div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* AI RECOMMENDATION CARD */}
                {/* AI DAILY PLAN CARD */}
                <div className="retro-panel p-6 lg:col-span-2 relative overflow-hidden border-brand-accent/30">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-accent/60 to-transparent" />
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold uppercase text-brand-accent tracking-wide flex items-center gap-2">
                            <Brain size={18} /> Groq AI Daily Plan
                        </h3>
                        {isLoadingAI && (
                            <span className="text-xs font-mono text-brand-secondary animate-pulse">Syncing Telemetry...</span>
                        )}
                    </div>

                    {studySessions.length < 3 ? (
                        <div className="h-full flex flex-col justify-center items-center text-center py-10 border border-brand-accent/20 bg-brand-bg/30 rounded">
                            <Brain size={28} className="mb-3 text-brand-secondary opacity-50" />
                            <div className="text-sm font-mono text-brand-secondary font-bold tracking-widest uppercase">Not enough telemetry</div>
                            <div className="text-xs font-mono text-brand-secondary/60 mt-2 max-w-[80%]">Log at least 3 sessions to activate AI analysis.</div>
                        </div>
                    ) : aiAnalytics?.plan ? (
                        <div className="space-y-4">
                            <div className="text-brand-primary font-mono font-bold text-sm mb-2 opacity-90">
                                "{aiAnalytics.plan.motivationalInsight}"
                            </div>
                            <ul className="space-y-3">
                                {aiAnalytics.plan.dailyPlan.map((task: any, idx: number) => (
                                    <li key={idx} className="flex items-start gap-3 p-3 bg-brand-bg/50 border border-brand-primary/10 rounded">
                                        <Zap size={16} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                                        <div className="text-brand-secondary text-sm leading-relaxed">{task}</div>
                                    </li>
                                ))}
                            </ul>

                            <div className="flex items-center gap-2 pt-3 mt-4 border-t border-brand-border/20">
                                <Clock size={13} className="text-brand-secondary" />
                                <span className="text-xs font-mono text-brand-secondary">Est. 2h</span>
                                <span className="text-brand-secondary/30 mx-1">|</span>
                                <span className="text-xs font-mono text-brand-secondary/50">Groq llama3-70b</span>
                            </div>
                        </div>
                    ) : isLoadingAI ? (
                        <RetroLoader title="Initializing AI Core" subtitle="Syncing telemetry data..." />
                    ) : (
                        <div className="h-full flex flex-col justify-center items-center text-center py-10 border border-red-900/30 bg-red-900/10 rounded">
                            <Brain size={28} className="mb-3 text-red-500 opacity-80" />
                            <div className="text-sm font-mono text-red-400 font-bold tracking-widest uppercase shadow-red-500 text-shadow">Neural Link Offline</div>
                            <div className="text-xs font-mono text-brand-secondary mt-2 max-w-[80%]">Failed to establish connection with Groq AI engines. Verify API keys or check network status.</div>
                            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-1.5 border border-red-500/50 text-red-400 font-mono text-xs uppercase hover:bg-red-500/20 transition-colors rounded">
                                Retry Connection
                            </button>
                        </div>
                    )}
                </div>

                {/* TODAY'S SCHEDULE */}
                <div className="retro-panel p-6">
                    <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-4">Today's Schedule</h3>
                    <div className="mb-4">
                        <div className="flex justify-between text-xs font-mono mb-1">
                            <span className="text-brand-secondary">Completion</span>
                            <span className="text-brand-primary">{todayDone}/{todayTasks.length}</span>
                        </div>
                        <div className="h-2 bg-brand-bg rounded overflow-hidden border border-brand-border/30">
                            <div className="h-full bg-brand-primary transition-all duration-500 rounded" style={{ width: `${todayProgress}%` }} />
                        </div>
                    </div>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto">
                        {todayTasks.slice(0, 6).map((task: any) => (
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
                            <p className="text-brand-secondary text-xs font-mono">No tasks scheduled</p>
                        )}
                    </div>
                    {todayStudyMinutes > 0 && (
                        <div className="mt-4 pt-4 border-t border-brand-border/30">
                            <div className="text-xs font-mono text-brand-secondary uppercase tracking-widest mb-1">Total Mins Logged</div>
                            <div className="text-brand-primary font-mono text-sm">
                                {todayStudyMinutes}m
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ANIMATED PROGRESS GRAPH */}
            <AnimatedProgressGraph activityHistory={activityHistory} daysToView={14} />

            {/* RECENT EXTERNAL ACTIVITY */}
            <div className="retro-panel p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest flex items-center gap-2">
                        <ActivityIcon size={16} /> Recent External Activity
                    </h3>
                    <Link to="/activity" className="text-xs font-mono text-brand-primary hover:underline">View All →</Link>
                </div>

                {recentActivities.length > 0 ? (
                    <div className="space-y-3">
                        {recentActivities.map(act => (
                            <div key={act.id} className="flex justify-between items-center bg-brand-bg/50 border border-brand-border/30 p-3 rounded">
                                <div className="flex items-center gap-3">
                                    <span className={`w-2 h-2 rounded-full ${act.platform === 'LeetCode' ? 'bg-orange-500' : act.platform === 'Codeforces' ? 'bg-cyan-500' : 'bg-brand-secondary'}`} />
                                    <span className="text-xs font-mono text-brand-primary line-clamp-1">
                                        {act.activity_title}
                                    </span>
                                </div>
                                <span className="text-[10px] whitespace-nowrap font-mono text-brand-secondary">
                                    {new Date(act.activity_timestamp).toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 text-brand-secondary/50 font-mono text-xs">
                        No external telemetry detected. Sync handles in profile.
                    </div>
                )}
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
