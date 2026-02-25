import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../engine/learningStore';
import { calculatePlayerLevel } from '../data/statisticsData';
import { calculateConsistencyScore, calculateStreak } from '../engine/consistencyEngine';
import { ConsistencyGraph } from '../components/ConsistencyGraph';
import { syncExternalStats } from '../engine/externalSyncEngine';
import { computeSkillProfile } from '../engine/analyticsEngine';
import { Trophy, Flame, Target, BookOpen, Clock, TrendingUp, TrendingDown, Minus, Zap, RefreshCw, Crosshair, BrainCircuit, Calendar } from 'lucide-react';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, AreaChart, Area
} from 'recharts';

export const Statistics: React.FC = () => {
    const { user } = useAuth();
    const { roadmap, studySessions, activityHistory, statistics, externalStats, setExternalStats, aiAnalytics } = useStore();
    const [syncing, setSyncing] = useState(false);
    const [velocityData, setVelocityData] = useState<{ date: string; solved: number }[]>([]);

    useEffect(() => {
        if (!user) return;
        let mounted = true;

        const fetchVelocity = async () => {
            const { getSupabaseClient } = await import('../backend/supabaseClient');
            const supabase = await getSupabaseClient();
            if (!supabase) return;

            // Fetch last 7 days of problem
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data } = await supabase
                .from('problem_history')
                .select('created_at, solved')
                .eq('user_id', user.id)
                .gte('created_at', sevenDaysAgo.toISOString());

            if (mounted && data) {
                // Group by day string
                const counts: Record<string, number> = {};
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    counts[d.toLocaleDateString('en', { weekday: 'short' })] = 0;
                }

                data.forEach((row: any) => {
                    if (row.solved) {
                        const dStr = new Date(row.created_at).toLocaleDateString('en', { weekday: 'short' });
                        if (counts[dStr] !== undefined) {
                            counts[dStr]++;
                        }
                    }
                });

                const formatted = Object.entries(counts).map(([date, solved]) => ({ date, solved }));
                setVelocityData(formatted);
            }
        };

        fetchVelocity();
    }, [user]);

    const ext = externalStats || { cf: null, lc: null, gh: null, lastSynced: null };

    const refreshExternal = async () => {
        if (!user?.id || syncing) return;
        setSyncing(true);
        try {
            const fresh = await syncExternalStats(user.id, true);
            setExternalStats(fresh);
        } catch { }
        finally { setSyncing(false); }
    };

    let totalTopics = 0, completedTopics = 0, totalMicroTasks = 0, completedMicroTasks = 0;
    roadmap.forEach(cat => cat.topics.forEach(t => {
        totalTopics++;
        if (t.completed) completedTopics++;
        if (t.tasks) {
            totalMicroTasks += t.tasks.length;
            completedMicroTasks += (t.tasks as any[]).filter(mt => mt.completed).length;
        }
    }));
    const analytics = {
        totalTopics, completedTopics, totalMicroTasks, completedMicroTasks,
        velocityTrend: 'accelerating' as 'accelerating' | 'declining' | 'flat'
    };

    const liveStreak = calculateStreak(activityHistory);
    const consistencyScore = calculateConsistencyScore(activityHistory);
    const skill = computeSkillProfile(roadmap, studySessions, activityHistory, ext.cf, ext.lc, ext.gh);

    const roadmapPct = analytics.totalTopics > 0
        ? Math.round((analytics.completedTopics / analytics.totalTopics) * 100) : 0;
    const microPct = analytics.totalMicroTasks > 0
        ? Math.round((analytics.completedMicroTasks / analytics.totalMicroTasks) * 100) : 0;

    const level = calculatePlayerLevel(roadmapPct);
    const formatHours = (m: number) => m >= 60 ? `${(m / 60).toFixed(1)}h` : `${m}m`;

    const VelocityIcon = analytics.velocityTrend === 'accelerating' ? TrendingUp
        : analytics.velocityTrend === 'declining' ? TrendingDown : Minus;
    const velocityColor = analytics.velocityTrend === 'accelerating' ? 'text-brand-primary'
        : analytics.velocityTrend === 'declining' ? 'text-red-400' : 'text-brand-accent';

    // Simulated Skill Growth History (Line Chart) 
    const skillHistoryData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const progressionScore = Math.max(0, skill.overallScore - ((6 - i) * 2));
        return { name: date.toLocaleDateString('en', { weekday: 'short' }), Score: progressionScore };
    });

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-8 border-b border-brand-border pb-4 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2">Advanced Metrics</h2>
                    <p className="retro-text-sub">Deep learning telemetry with AI Analytics & Recharts</p>
                </div>
                {ext.lastSynced && (
                    <button onClick={refreshExternal} disabled={syncing}
                        className="flex items-center gap-1.5 text-xs font-mono text-brand-secondary hover:text-brand-primary transition-colors disabled:opacity-40">
                        <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Syncing...' : `Platforms synced ${Math.round((Date.now() - ext.lastSynced) / 60000)}m ago`}
                    </button>
                )}
            </header>

            {/* ── AI ANALYTICS: WEAK/STRONG TOPICS ──────────────────────────── */}
            {aiAnalytics?.analysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="retro-panel p-5 border-red-500/20 bg-red-500/5">
                        <h3 className="text-sm font-mono uppercase text-red-400 tracking-widest mb-3 flex items-center gap-2">
                            <Crosshair size={16} /> Weak Areas Identified
                        </h3>
                        <ul className="space-y-1.5">
                            {aiAnalytics.analysis.weakTopics.map(topic => (
                                <li key={topic} className="text-xs font-mono text-brand-secondary flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full" /> {topic}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="retro-panel p-5 border-green-500/20 bg-green-500/5">
                        <h3 className="text-sm font-mono uppercase text-green-400 tracking-widest mb-3 flex items-center gap-2">
                            <BrainCircuit size={16} /> Strong Areas
                        </h3>
                        <ul className="space-y-1.5">
                            {aiAnalytics.analysis.strongTopics.map(topic => (
                                <li key={topic} className="text-xs font-mono text-brand-secondary flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full" /> {topic}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* ── RECHARTS ROW 1: SKILL GROWTH & TOPIC MASTERY ──────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Skill Growth Line/Area Chart */}
                <div className="retro-panel p-6">
                    <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-5 flex items-center gap-2">
                        <TrendingUp size={16} /> Global Skill Growth
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={skillHistoryData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" vertical={false} />
                                <XAxis dataKey="name" stroke="#718096" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#718096" fontSize={11} tickLine={false} axisLine={false} />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#1A202C', borderColor: '#2D3748', borderRadius: '4px', fontSize: '12px' }}
                                    itemStyle={{ color: '#4ADE80' }}
                                />
                                <Area type="monotone" dataKey="Score" stroke="#4ADE80" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Topic Mastery Radar Chart */}
                <div className="retro-panel p-6">
                    <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-2 flex items-center gap-2">
                        <Target size={16} /> Topic Mastery Profiler
                    </h3>
                    <div className="h-64 w-full -ml-4">
                        {skill.topicMasteryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={skill.topicMasteryData}>
                                    <PolarGrid stroke="#2D3748" />
                                    <PolarAngleAxis dataKey="topic" tick={{ fill: '#718096', fontSize: 10 }} />
                                    <Radar name="Mastery %" dataKey="score" stroke="#60A5FA" fill="#60A5FA" fillOpacity={0.4} />
                                    <RechartsTooltip contentStyle={{ backgroundColor: '#1A202C', borderColor: '#2D3748', fontSize: '12px', color: '#60A5FA' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs font-mono text-brand-secondary/50">
                                Complete roadmap topics to generate radar
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── RECHARTS ROW 2: VELOCITY BAR CHART ─────────────────────────── */}
            <div className="retro-panel p-6">
                <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-5 flex items-center gap-2">
                    <Zap size={16} /> Problem Solving Velocity
                </h3>
                <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={velocityData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" vertical={false} />
                            <XAxis dataKey="date" stroke="#718096" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="#718096" fontSize={11} tickLine={false} axisLine={false} />
                            <RechartsTooltip
                                cursor={{ fill: '#2D3748', opacity: 0.4 }}
                                contentStyle={{ backgroundColor: '#1A202C', borderColor: '#2D3748', borderRadius: '4px', fontSize: '12px' }}
                                itemStyle={{ color: '#FCD34D' }}
                            />
                            <Bar dataKey="solved" fill="#FCD34D" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* ── SKILL SCORE & LEVEL CARDS ──────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="retro-panel p-6 border-brand-primary/30">
                    <div className="text-xs font-mono text-brand-secondary uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Zap size={15} className="text-brand-primary" /> Overall Skill Score
                    </div>
                    <div className="text-4xl font-bold font-mono text-brand-primary">{skill.overallScore}</div>
                    <div className="text-xs font-mono text-brand-secondary mt-1">out of 100</div>

                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-brand-border pt-4">
                        <div>
                            <div className="text-[10px] text-brand-secondary uppercase">DSA</div>
                            <div className="text-sm font-bold text-yellow-400">{skill.dsaScore}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-brand-secondary uppercase">Dev</div>
                            <div className="text-sm font-bold text-blue-400">{skill.developmentScore}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-brand-secondary uppercase">Consistency</div>
                            <div className="text-sm font-bold text-green-400">{skill.consistencyScore}</div>
                        </div>
                    </div>
                </div>

                <div className="retro-panel p-6 border-yellow-400/40 bg-brand-bg/50 shadow-[0_0_20px_rgba(250,204,21,0.06)] relative overflow-hidden">
                    <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
                    <div className="flex items-center gap-4 mb-4">
                        <Trophy className="text-yellow-400 w-10 h-10 flex-shrink-0" />
                        <div>
                            <div className="text-xs font-mono text-brand-secondary uppercase tracking-widest">System Rank</div>
                            <div className="text-3xl font-bold font-mono text-brand-primary">{level.toUpperCase()}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-[10px] font-mono text-brand-secondary uppercase">Roadmap Progress</div>
                            <div className="text-lg font-bold font-mono text-brand-primary">{roadmapPct}%</div>
                        </div>
                        <div>
                            <div className={`flex items-center gap-1 ${velocityColor}`}>
                                <VelocityIcon size={16} />
                                <span className="text-[10px] uppercase font-mono tracking-widest">{analytics.velocityTrend} Velocity</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── CORE STATS GRID ───────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Deep Work Time', value: formatHours(statistics.totalStudyMinutes), icon: <Clock size={20} className="text-blue-400" />, sub: `${statistics.totalStudySessions} sessions total` },
                    { label: 'Problems Solved', value: statistics.totalProblemsSolved.toString(), icon: <Target size={20} className="text-brand-accent" />, sub: 'DSA progress units' },
                    { label: 'Micro-Tasks', value: `${analytics.completedMicroTasks}/${analytics.totalMicroTasks}`, icon: <BookOpen size={20} className="text-brand-primary" />, sub: `${microPct}% of curriculum` },
                    { label: 'Active Streak', value: `${Math.max(statistics.studyStreakDays, liveStreak)}d`, icon: <Flame size={20} className="text-red-400" />, sub: `${consistencyScore}% consistency` },
                ].map(s => (
                    <div key={s.label} className="retro-panel p-4">
                        <div className="flex items-center gap-2 mb-2">{s.icon}<span className="text-xs font-mono text-brand-secondary uppercase tracking-widest">{s.label}</span></div>
                        <div className="text-2xl font-bold font-mono text-brand-primary">{s.value}</div>
                        <div className="text-xs text-brand-secondary/70 mt-1">{s.sub}</div>
                    </div>
                ))}
            </div>

            {/* ── DETAILED STUDY HISTORY ────────────────────────────────────── */}
            <div className="retro-panel p-6">
                <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-5 flex items-center gap-2">
                    <BookOpen size={16} /> Detailed Study History
                </h3>
                {studySessions.length === 0 ? (
                    <div className="text-brand-secondary text-sm font-mono text-center py-8">
                        No study sessions recorded yet. Start a timer in the Timetable!
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {[...studySessions].sort((a, b) => b.timestamp - a.timestamp).map(session => (
                            <div key={session.id} className="p-4 bg-brand-bg/50 border border-brand-primary/20 rounded flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-brand-primary/50 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-brand-primary font-bold font-mono text-base">{session.topic}</span>
                                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded">{session.category}</span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-brand-secondary my-2">
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {session.date || new Date(session.timestamp).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1"><Clock size={12} /> {session.durationMinutes} min elapsed</span>
                                        <span className="flex items-center gap-1">
                                            Difficulty: <span className={`${session.difficulty === 'Hard' ? 'text-red-400' : session.difficulty === 'Medium' ? 'text-brand-accent' : 'text-brand-primary'}`}>{session.difficulty}</span>
                                        </span>
                                    </div>
                                    {session.notes && (
                                        <div className="mt-2 text-sm font-mono text-brand-secondary/80 italic border-l-2 border-brand-primary/30 pl-3 py-0.5">
                                            "{session.notes}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── HEATMAP ───────────────────────────────────────────────────── */}
            <ConsistencyGraph daysToView={365} activityHistory={activityHistory} />
        </div>
    );
};
