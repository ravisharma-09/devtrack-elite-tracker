import React, { useEffect, useState } from 'react';
import { Brain, Zap, Terminal, LayoutTemplate, Github, ExternalLink, RefreshCw, Code2, Trophy, TrendingUp, BookOpen, ChevronRight, AlertCircle, CheckCircle, Target } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getSupabaseClient } from '../backend/supabaseClient';
import { runDSASuggestionEngine, type DSASuggestionResult, type DSAProblem } from '../core/dsaSuggestionEngine';
import { RetroLoader } from '../components/RetroLoader';

type TabType = 'dsa' | 'opensource' | 'webdev';

// ── Open Source (state-based) ─────────────────────────────────────────────────
const OS_BEGINNER = [
    { name: 'First Contributions', description: 'Make your very first open-source PR. Step-by-step guide for beginners.', link: 'https://github.com/firstcontributions/first-contributions', topic: 'Git & GitHub', difficulty: 'Easy' },
    { name: 'Hacktoberfest', description: "October event — 4 PRs = shirt + badge. Best starting point for open-source.", link: 'https://hacktoberfest.com', topic: 'Open Source', difficulty: 'Easy' },
    { name: 'Good First Issues', description: 'Browse beginner-friendly labeled issues across thousands of repos.', link: 'https://goodfirstissues.com', topic: 'Open Source', difficulty: 'Easy' },
    { name: 'GSSoC (GirlScript)', description: "India's largest open source program. Perfect for students. Apply Feb-Mar.", link: 'https://gssoc.girlscript.tech', topic: 'Mentored', difficulty: 'Easy' },
    { name: 'KWoC (IIT-KGP)', description: 'Winter open source event by IIT Kharagpur. Earn certificate + experience.', link: 'https://kwoc.kossiitkgp.org', topic: 'Mentored', difficulty: 'Easy' },
];
const OS_INTERMEDIATE = [
    { name: 'GSoC (Google)', description: 'Prestigious 3-month program. $1500–$6600 stipend. Apply Feb–Mar each year.', link: 'https://summerofcode.withgoogle.com', topic: 'GSoC', difficulty: 'Hard' },
    { name: 'LFX Mentorship', description: 'Linux Foundation paid mentorship with Kubernetes, CNCF projects.', link: 'https://mentorship.lfx.linuxfoundation.org', topic: 'Cloud Native', difficulty: 'Medium' },
    { name: 'Outreachy', description: 'Paid remote internships for underrepresented contributors. $7000 stipend.', link: 'https://www.outreachy.org', topic: 'Paid', difficulty: 'Medium' },
];

const WEB_BEGINNER = [
    { name: 'Portfolio Website', description: 'Build your personal portfolio — #1 thing recruiters check.', link: 'https://github.com/topics/portfolio', topic: 'HTML/CSS', difficulty: 'Easy' },
    { name: 'Todo App', description: 'Master DOM manipulation. Add, delete, complete tasks with localStorage.', link: 'https://github.com/topics/todo-app', topic: 'DOM', difficulty: 'Easy' },
    { name: 'Weather App', description: 'Learn Fetch API by building a city weather dashboard.', link: 'https://openweathermap.org/api', topic: 'APIs', difficulty: 'Medium' },
];
const WEB_ADVANCED = [
    { name: 'Blog App with React', description: 'Full blog with routing, state, and CRUD. Best React practice project.', link: 'https://github.com/topics/react-blog', topic: 'React', difficulty: 'Medium' },
    { name: 'REST API (Node.js)', description: 'Full CRUD REST API with Express + PostgreSQL.', link: 'https://github.com/topics/rest-api', topic: 'Node.js', difficulty: 'Medium' },
    { name: 'Auth System', description: 'JWT + bcrypt authentication. Refresh tokens, protected routes.', link: 'https://github.com/topics/jwt-authentication', topic: 'Backend', difficulty: 'Hard' },
];

// ── Problem card ──────────────────────────────────────────────────────────────
const ProblemCard: React.FC<{ prob: DSAProblem }> = ({ prob }) => (
    <a href={prob.link} target="_blank" rel="noreferrer"
        className="retro-panel p-4 block group transition-all duration-300 border-brand-border/30 hover:border-brand-accent bg-brand-bg/40">
        <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink size={11} className="text-brand-accent" />
        </div>
        <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-secondary">{prob.topic}</span>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${prob.difficulty === 'Hard' ? 'text-red-400 border-red-400/30 bg-red-400/5' : prob.difficulty === 'Medium' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5' : 'text-green-400 border-green-400/30 bg-green-400/5'}`}>
                {prob.difficulty} · {prob.rating}
            </span>
        </div>
        <p className="font-bold font-mono text-sm text-brand-primary group-hover:text-brand-accent transition-colors line-clamp-1">{prob.name}</p>
    </a>
);

export const Suggestions: React.FC = () => {
    const { user } = useAuth();
    const [dsaResult, setDsaResult] = useState<DSASuggestionResult | null>(null);
    const [cfStats, setCfStats] = useState<any>(null);
    const [lcStats, setLcStats] = useState<any>(null);
    const [ghStats, setGhStats] = useState<any>(null);
    const [cfRating, setCfRating] = useState(0);
    const [lcSolved, setLcSolved] = useState(0);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('dsa');

    const loadData = async (force = false) => {
        if (!user) return;
        setLoading(true);
        try {
            const supabase = await getSupabaseClient();
            if (!supabase) return;

            // Load external stats
            const { data: extRow } = await supabase
                .from('external_stats')
                .select('cf, lc, gh')
                .eq('user_id', user.id)
                .single();

            const cf = extRow?.cf || null;
            const lc = extRow?.lc || null;
            const gh = extRow?.gh || null;

            setCfStats(cf);
            setLcStats(lc);
            setGhStats(gh);
            setCfRating(cf?.rating || 0);
            setLcSolved(lc?.totalSolved || 0);

            // Auto-fetch CF stats if handle exists but no rating yet or forced
            if (force || !cf?.rating) {
                const { data: userRow } = await supabase
                    .from('users').select('codeforces_handle').eq('id', user.id).single();
                const cfHandle = userRow?.codeforces_handle?.trim();
                if (cfHandle) {
                    setSyncing(true);
                    const { fetchCodeforcesStats } = await import('../api/codeforcesApi');
                    const freshCF = await fetchCodeforcesStats(cfHandle);
                    if (freshCF) {
                        await supabase.from('external_stats').upsert({
                            user_id: user.id, cf: freshCF, last_synced: new Date().toISOString()
                        }).catch(() => { });
                        setCfStats(freshCF);
                        setCfRating(freshCF.rating || 0);
                    }
                    setSyncing(false);
                }
            }

            // Run the two-track DSA engine
            const result = await runDSASuggestionEngine(user.id);
            setDsaResult(result);
        } catch (e) {
            console.error('Suggestions load error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(false); }, [user]);

    // ── Render ──────────────────────────────────────────────────────────────
    const ghContribs = ghStats?.publicRepos || 0;
    const osRecs = ghContribs < 5 || cfRating < 1200 ? OS_BEGINNER : [...OS_BEGINNER.slice(0, 2), ...OS_INTERMEDIATE];
    const webRecs = cfRating >= 1200 || lcSolved > 50 ? [...WEB_BEGINNER, ...WEB_ADVANCED] : WEB_BEGINNER;

    if (loading) return (
        <div className="h-64 mt-8 relative">
            <RetroLoader title="Building Practice Plan" subtitle={syncing ? "Fetching external telemetry..." : "Analyzing DSA mastery..."} />
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header */}
            <header className="mb-6 border-b border-brand-border pb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-1 flex items-center gap-3">
                        <Zap className="text-brand-accent" /> Targeted Practice
                    </h2>
                    <p className="retro-text-sub">Structured, personalized practice — no random mixing</p>
                </div>
                <button onClick={() => loadData(true)} disabled={syncing || loading}
                    className="flex items-center gap-2 px-3 py-1.5 border border-brand-primary/30 text-brand-primary font-mono text-xs rounded hover:bg-brand-primary/10 transition-colors disabled:opacity-40">
                    <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} /> Refresh
                </button>
            </header>

            {/* Stats row */}
            <div className="flex flex-wrap gap-3">
                {cfStats ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-yellow-400/30 bg-yellow-400/5 text-xs font-mono text-yellow-400">
                        <Trophy size={12} /> CF: {cfStats.rating} · {cfStats.rank} · {cfStats.problemsSolved} solved
                        <CheckCircle size={11} className="text-green-400 ml-1" />
                    </div>
                ) : (
                    <a href="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded border border-red-400/30 bg-red-400/5 text-xs font-mono text-red-400 hover:underline">
                        <AlertCircle size={12} /> CF not connected — Go to Profile
                    </a>
                )}
                {lcStats && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-orange-400/20 bg-orange-400/5 text-xs font-mono text-orange-400">
                        <Code2 size={12} /> LeetCode: {lcStats.totalSolved} solved
                    </div>
                )}
            </div>

            {/* TABS */}
            <div className="flex border-b border-brand-border/50 gap-6">
                {([['dsa', 'Algorithmic (DSA)', Terminal] as const, ['opensource', 'Open Source', Github] as const, ['webdev', 'Web Projects', LayoutTemplate] as const]).map(([t, label, Icon]) => (
                    <button key={t} onClick={() => setActiveTab(t as TabType)}
                        className={`pb-3 font-mono text-sm tracking-wide uppercase transition-colors relative flex items-center gap-2
                            ${activeTab === t ? (t === 'dsa' ? 'text-brand-accent font-bold' : t === 'opensource' ? 'text-green-400 font-bold' : 'text-brand-primary font-bold') : 'text-brand-secondary hover:text-brand-primary'}`}>
                        <Icon size={15} /> {label}
                        {activeTab === t && <span className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-t-md ${t === 'dsa' ? 'bg-brand-accent' : t === 'opensource' ? 'bg-green-400' : 'bg-brand-primary'}`} />}
                    </button>
                ))}
            </div>

            {/* ── DSA Tab ─────────────────────────────────────────────────── */}
            {activeTab === 'dsa' && (
                <div className="space-y-8 animate-fade-in">
                    {dsaResult?.error ? (
                        /* Not enough data — show guidance message */
                        <div className="retro-panel p-10 text-center border-brand-border/30">
                            <AlertCircle className="w-12 h-12 mx-auto text-brand-accent/40 mb-4" />
                            <h3 className="text-brand-accent font-mono uppercase tracking-widest mb-2">Sync Required</h3>
                            <p className="text-sm text-brand-secondary font-mono mb-4 leading-relaxed">{dsaResult.error}</p>
                            <a href="/profile" className="inline-flex items-center gap-2 px-5 py-2 border border-brand-primary/40 text-brand-primary font-mono text-xs rounded hover:bg-brand-primary/10">
                                Go to Profile <ChevronRight size={13} />
                            </a>
                        </div>
                    ) : (
                        <>
                            {/* ── SECTION A: Rating Progression ─── */}
                            {dsaResult?.ratingProgression && (
                                <section>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center">
                                            <TrendingUp size={15} className="text-brand-accent" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold font-mono text-brand-accent uppercase tracking-wide">🔥 Rating Progression</h3>
                                            <p className="text-xs font-mono text-brand-secondary">
                                                Target range: {dsaResult.ratingProgression.targetRange} · Current: {dsaResult.ratingProgression.currentRating} ({dsaResult.ratingProgression.rank})
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative">
                                        {dsaResult.ratingProgression.problems.map((p, i) => (
                                            <ProblemCard key={i} prob={p} />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ── SECTION B: Topic Mastery ─── */}
                            {dsaResult?.topicMastery && (
                                <section>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                                            <BookOpen size={15} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold font-mono text-blue-400 uppercase tracking-wide">
                                                📘 Topic Mastery — {dsaResult.topicMastery.currentTopic}
                                            </h3>
                                            <p className="text-xs font-mono text-brand-secondary">
                                                Roadmap progress: {dsaResult.topicMastery.roadmapProgress}% ·
                                                Success rate: {dsaResult.topicMastery.successRate}%
                                            </p>
                                        </div>
                                    </div>

                                    {/* Pattern focus badges */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        <span className="text-[10px] font-mono text-brand-secondary uppercase tracking-widest mt-1">Focus:</span>
                                        {dsaResult.topicMastery.patternFocus.map(p => (
                                            <span key={p} className="text-[10px] font-mono px-2 py-1 rounded border border-blue-400/20 text-blue-400 bg-blue-400/5">
                                                {p}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {dsaResult.topicMastery.problems.map((p, i) => (
                                            <ProblemCard key={i} prob={p} />
                                        ))}
                                    </div>

                                    {/* Next topic suggestion */}
                                    {dsaResult.topicMastery.nextTopicSuggestion && (
                                        <div className="mt-4 retro-panel p-4 border-green-400/20 bg-green-400/5 flex items-center gap-3">
                                            <Target size={16} className="text-green-400 flex-shrink-0" />
                                            <p className="text-sm font-mono text-green-400">
                                                🎉 {dsaResult.topicMastery.currentTopic} is {dsaResult.topicMastery.roadmapProgress}% complete!
                                                <span className="text-brand-secondary ml-2">Start next: <strong>{dsaResult.topicMastery.nextTopicSuggestion}</strong></span>
                                            </p>
                                        </div>
                                    )}
                                </section>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ── Open Source Tab ──────────────────────────────────────────── */}
            {activeTab === 'opensource' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fade-in">
                    {osRecs.map((o) => (
                        <a key={o.name} href={o.link} target="_blank" rel="noreferrer"
                            className="retro-panel p-5 block group border-green-500/20 hover:border-green-500 bg-brand-bg/40 transition-all">
                            <div className="flex items-center gap-2 mb-3">
                                <Github size={13} className="text-green-400" />
                                <span className="text-[10px] font-mono uppercase tracking-widest text-brand-secondary">{o.topic}</span>
                            </div>
                            <h4 className="font-bold font-mono text-sm text-green-400 group-hover:text-green-300 transition-colors mb-2">{o.name}</h4>
                            <p className="text-xs text-brand-secondary/80 mb-4 leading-relaxed">{o.description}</p>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${o.difficulty === 'Hard' ? 'text-red-400 border-red-400/20' : o.difficulty === 'Medium' ? 'text-yellow-400 border-yellow-400/20' : 'text-green-400 border-green-400/20'}`}>
                                {o.difficulty}
                            </span>
                        </a>
                    ))}
                </div>
            )}

            {/* ── Web Projects Tab ─────────────────────────────────────────── */}
            {activeTab === 'webdev' && (
                <div className="space-y-4 animate-fade-in">
                    <p className="text-xs font-mono text-brand-secondary/60 border border-brand-border/30 rounded px-3 py-2">
                        {cfRating >= 1200 || lcSolved > 50 ? 'Intermediate + Advanced projects matched to your level.' : 'Starter projects to build your portfolio. Unlock advanced at CF 1200+ or 50 LC solved.'}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {webRecs.map((w) => (
                            <a key={w.name} href={w.link} target="_blank" rel="noreferrer"
                                className="retro-panel p-5 block group border-brand-primary/20 hover:border-brand-primary bg-brand-bg/40 transition-all">
                                <div className="flex items-center gap-2 mb-3">
                                    <LayoutTemplate size={13} className="text-brand-primary" />
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-brand-secondary">{w.topic}</span>
                                </div>
                                <h4 className="font-bold font-mono text-sm text-brand-accent group-hover:text-brand-primary transition-colors mb-2">{w.name}</h4>
                                <p className="text-xs text-brand-secondary/80 mb-4 leading-relaxed">{w.description}</p>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${w.difficulty === 'Hard' ? 'text-red-400 border-red-400/20' : w.difficulty === 'Medium' ? 'text-yellow-400 border-yellow-400/20' : 'text-green-400 border-green-400/20'}`}>
                                    {w.difficulty}
                                </span>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
