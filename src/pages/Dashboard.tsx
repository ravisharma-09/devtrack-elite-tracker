import React, { useEffect, useState } from 'react';
import { useStore } from '../engine/learningStore';
import { useAuth } from '../auth/AuthContext';
import { AddStudySessionModal } from '../components/AddStudySessionModal';
import { ConsistencyGraph } from '../components/ConsistencyGraph';
import { getSupabaseClient } from '../backend/supabaseClient';
import { Link } from 'react-router-dom';
import { Brain, Clock, PlusCircle, Target, Flame, TrendingUp, Zap, Activity as ActivityIcon } from 'lucide-react';
export const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const {
        roadmap, activityHistory, aiAnalytics, timetable, addStudySession, setAiAnalytics
    } = useStore();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [recentActivities, setRecentActivities] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [todayStudyMinutes, setTodayStudyMinutes] = useState(0);

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
                // Calculate today's manual study minutes
                const today = new Date().toISOString().split('T')[0];
                const todayMins = intRes.data
                    .filter((a: any) => a.type === 'study' && a.created_at.startsWith(today))
                    .reduce((acc: any, curr: any) => acc + (curr.score || 0), 0);
                setTodayStudyMinutes(todayMins);
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
    const consistencyScore = profile ? Math.min(100, Math.round((profile.consistency_score / 30) * 100)) : 0;

    // Calculate Level
    const skillScore = profile?.skill_score || 0;
    const level = skillScore < 50 ? 'Beginner' : skillScore < 200 ? 'Intermediate' : 'Advanced';
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
                        { label: 'Study Streak', value: `${streak}d`, icon: <Flame size={18} className="text-red-400" />, color: 'text-red-400' },
                        { label: 'Today Minutes', value: `${todayStudyMinutes}m`, icon: <Clock size={18} className="text-blue-400" />, color: 'text-blue-400' },
                        { label: 'Consistency', value: `${consistencyScore}%`, icon: <TrendingUp size={18} className="text-brand-primary" />, color: 'text-brand-primary' },
                        { label: 'Skill Score', value: `${skillScore} (${level})`, icon: <Target size={18} className="text-brand-accent" />, color: 'text-brand-accent' },
                    ].map(stat => (
                        <div key={stat.label} className="retro-panel p-4 flex items-center gap-3">
                            <div className="p-2 bg-brand-bg rounded-lg border border-brand-border">{stat.icon}</div>
                            <div>
                                <div className="text-xs font-mono text-brand-secondary uppercase tracking-widest">{stat.label}</div>
                                <div className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
                            </div>
                        </div>
                    ))
                }
            </div >

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

                    {aiAnalytics?.plan ? (
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
                        <div className="h-full flex flex-col justify-center items-center text-center opacity-70 py-12">
                            <Zap size={28} className="mb-4 text-brand-primary animate-pulse" />
                            <div className="text-sm font-mono text-brand-primary tracking-widest uppercase">Initializing AI Core</div>
                            <div className="text-xs font-mono text-brand-secondary mt-2">Syncing telemetry data...</div>
                        </div>
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
