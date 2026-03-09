import React, { useEffect, useState, useMemo } from 'react';
import { Zap, Terminal, LayoutTemplate, Github, ExternalLink, RefreshCw, Code2, Trophy, ChevronRight, AlertCircle, CheckCircle, Circle, Map } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getSupabaseClient } from '../backend/supabaseClient';
import { RetroLoader } from '../components/RetroLoader';
import { useLocalStorage } from '../hooks/useLocalStorage';
import dsaDatasetRaw from '../data/dsa_dataset.json';

export interface DSAPracticeProblem {
    id: number;
    title: string;
    topic: string;
    platform: "leetcode" | "codeforces";
    difficulty: "easy" | "medium" | "hard";
    cf_rating: number | null;
    link: string;
    pattern: string;
    companyTags: string[];
}

const dsaDataset = dsaDatasetRaw as DSAPracticeProblem[];

type TabType = 'dsa' | 'opensource' | 'webdev';

// ── Open Source & Web Dev Configs ─────────────────────────────────────────────
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

export const Suggestions: React.FC = () => {
    const { user } = useAuth();
    
    // Core State
    const [cfStats, setCfStats] = useState<any>(null);
    const [lcStats, setLcStats] = useState<any>(null);
    const [ghStats, setGhStats] = useState<any>(null);
    const [cfRating, setCfRating] = useState(0);
    const [lcSolved, setLcSolved] = useState(0);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    
    // UI State
    const [activeTab, setActiveTab] = useState<TabType>('dsa');
    const [activeTopic, setActiveTopic] = useState<string>('Basics');
    
    // Progress Checklist State
    const [progressMap, setProgressMap] = useLocalStorage<Record<number, boolean>>('dsa_progression_map', {});

    const orderedTopics = useMemo(() => [
        "Basics", "Math / Number Theory", "Arrays", "Strings", "Hashing", 
        "Two Pointers", "Sliding Window", "Binary Search", "Stack", "Queue", 
        "Linked List", "Trees", "Heap / Priority Queue", "Backtracking", 
        "Graphs", "Dynamic Programming"
    ], []);

    const currentProblems = useMemo(() => {
        return dsaDataset.filter(p => p.topic === activeTopic);
    }, [activeTopic]);

    const performAutoSync = (cfData: any, lcData: any) => {
        if (!cfData?.solvedProblemList && !lcData?.solvedProblemList) return;

        let updatedProgress = { ...progressMap };
        let hasChanges = false;

        const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (cfData?.solvedProblemList) {
            cfData.solvedProblemList.forEach((solvedName: string) => {
                const nt = normalize(solvedName);
                const match = dsaDataset.find(p => p.platform === 'codeforces' && normalize(p.title) === nt);
                if (match && !updatedProgress[match.id]) {
                    updatedProgress[match.id] = true;
                    hasChanges = true;
                }
            });
        }

        if (lcData?.solvedProblemList) {
            lcData.solvedProblemList.forEach((solvedName: string) => {
                const nt = normalize(solvedName);
                const match = dsaDataset.find(p => p.platform === 'leetcode' && normalize(p.title) === nt);
                if (match && !updatedProgress[match.id]) {
                    updatedProgress[match.id] = true;
                    hasChanges = true;
                }
            });
        }

        if (hasChanges) {
            setProgressMap(updatedProgress);
        }
    };

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

            let cf = extRow?.cf || null;
            let lc = extRow?.lc || null;
            let gh = extRow?.gh || null;

            setGhStats(gh);

            if (force) {
                setSyncing(true);
                const { data: userRow } = await supabase.from('users').select('codeforces_handle, leetcode_username').eq('id', user.id).single();
                
                const cfHandle = userRow?.codeforces_handle?.trim();
                if (cfHandle) {
                    const { fetchCodeforcesStats } = await import('../api/codeforcesApi');
                    const freshCF = await fetchCodeforcesStats(cfHandle);
                    if (freshCF) {
                        cf = freshCF;
                        await supabase.from('external_stats').upsert({ user_id: user.id, cf: freshCF, last_synced: new Date().toISOString() }).catch(() => { });
                    }
                }

                const lcUser = userRow?.leetcode_username?.trim();
                if (lcUser) {
                    const { fetchLeetCodeStats } = await import('../api/leetcodeApi');
                    const freshLC = await fetchLeetCodeStats(lcUser);
                    if (freshLC) {
                        lc = freshLC;
                        await supabase.from('external_stats').upsert({ user_id: user.id, lc: freshLC, last_synced: new Date().toISOString() }).catch(() => { });
                    }
                }
                setSyncing(false);
            }

            setCfStats(cf);
            setLcStats(lc);
            setCfRating(cf?.rating || 0);
            setLcSolved(lc?.totalSolved || 0);

            // Auto-sync completed problems from fetched external data into the checklist
            if (cf || lc) {
                performAutoSync(cf, lc);
            }

        } catch (e) {
            console.error('Suggestions load error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(false); }, [user]);

    const toggleProblemComplete = (pid: number) => {
        setProgressMap(prev => ({
            ...prev,
            [pid]: !prev[pid]
        }));
    };

    const ghContribs = ghStats?.publicRepos || 0;
    const osRecs = ghContribs < 5 || cfRating < 1200 ? OS_BEGINNER : [...OS_BEGINNER.slice(0, 2), ...OS_INTERMEDIATE];
    const webRecs = cfRating >= 1200 || lcSolved > 50 ? [...WEB_BEGINNER, ...WEB_ADVANCED] : WEB_BEGINNER;

    if (loading) return (
        <div className="h-64 mt-8 relative">
            <RetroLoader title="Booting Practice Array" subtitle="Loading 770 DSA problems..." />
        </div>
    );

    // Calculate completion percentages for sidebar
    const topicProgress = orderedTopics.map(topic => {
        const probs = dsaDataset.filter(p => p.topic === topic);
        const solvedCount = probs.filter(p => progressMap[p.id]).length;
        const total = probs.length;
        return { topic, solvedCount, total, pct: total ? Math.round((solvedCount / total) * 100) : 0 };
    });

    const totalSolved = Object.values(progressMap).filter(Boolean).length;
    const totalProblems = dsaDataset.length;

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Header */}
            <header className="mb-6 border-b border-brand-border pb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-1 flex items-center gap-3">
                        <Map className="text-brand-accent" /> Sequential Practice
                    </h2>
                    <p className="retro-text-sub">Follow the chronological roadmap. Track what you've conquered.</p>
                </div>
                <button onClick={() => loadData(true)} disabled={syncing || loading}
                    className="flex items-center gap-2 px-3 py-1.5 border border-brand-primary/30 text-brand-primary font-mono text-xs rounded hover:bg-brand-primary/10 transition-colors disabled:opacity-40">
                    <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing...' : 'Auto-Sync CF/LC'}
                </button>
            </header>

            {/* Stats row */}
            <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-brand-accent/30 bg-brand-accent/5 text-xs font-mono text-brand-accent">
                    <CheckCircle size={12} /> Master Progress: {totalSolved} / {totalProblems} ({Math.round(totalSolved / totalProblems * 100)}%)
                </div>
                {cfStats ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-yellow-400/30 bg-yellow-400/5 text-xs font-mono text-yellow-400">
                        <Trophy size={12} /> CF: {cfStats.rating} · {cfStats.rank}
                        <CheckCircle size={11} className="text-green-400 ml-1" />
                    </div>
                ) : (
                    <a href="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded border border-red-400/30 bg-red-400/5 text-xs font-mono text-red-400 hover:underline">
                        <AlertCircle size={12} /> CF not connected
                    </a>
                )}
                {lcStats && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-orange-400/20 bg-orange-400/5 text-xs font-mono text-orange-400">
                        <Code2 size={12} /> LeetCode: {lcStats.totalSolved} AC
                    </div>
                )}
            </div>

            {/* TABS */}
            <div className="flex flex-wrap border-b border-brand-border/50 gap-6">
                {([['dsa', 'Master Roadmap (DSA)', Terminal] as const, ['opensource', 'Open Source', Github] as const, ['webdev', 'Web Projects', LayoutTemplate] as const]).map(([t, label, Icon]) => (
                    <button key={t} onClick={() => setActiveTab(t as TabType)}
                        className={`pb-3 font-mono text-sm tracking-wide uppercase transition-colors relative flex items-center gap-2
                            ${activeTab === t ? (t === 'dsa' ? 'text-brand-accent font-bold' : t === 'opensource' ? 'text-green-400 font-bold' : 'text-brand-primary font-bold') : 'text-brand-secondary hover:text-brand-primary'}`}>
                        <Icon size={15} /> {label}
                        {activeTab === t && <span className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-t-md ${t === 'dsa' ? 'bg-brand-accent' : t === 'opensource' ? 'bg-green-400' : 'bg-brand-primary'}`} />}
                    </button>
                ))}
            </div>

            {/* ── DSA Tab (Sequential UI) ─────────────────────────────────────────────────── */}
            {activeTab === 'dsa' && (
                <div className="flex flex-col md:flex-row gap-8 animate-fade-in items-start">
                    {/* Lateral Topic Menu */}
                    <div className="w-full md:w-64 shrink-0 space-y-1">
                        {topicProgress.map(tp => (
                            <button key={tp.topic} onClick={() => setActiveTopic(tp.topic)}
                                className={`w-full text-left px-3 py-2.5 rounded font-mono text-xs flex items-center justify-between transition-colors
                                ${activeTopic === tp.topic ? 'bg-brand-accent/15 border border-brand-accent/30 text-brand-accent' : 'border border-transparent text-brand-secondary hover:bg-brand-bg/60 hover:text-brand-primary'}
                                `}>
                                <div className="flex items-center gap-2 truncate">
                                    <span className="truncate">{tp.topic}</span>
                                </div>
                                <div className="shrink-0 flex items-center gap-2">
                                    <span className={tp.pct === 100 ? 'text-green-400' : 'text-brand-secondary/60'}>
                                        {tp.solvedCount}/{tp.total}
                                    </span>
                                    {tp.pct === 100 && <CheckCircle size={10} className="text-green-400" />}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Timeline Question List */}
                    <div className="flex-1 min-w-0">
                        <div className="mb-4 pb-2 border-b border-brand-border/30">
                            <h3 className="font-bold font-mono text-lg text-brand-primary uppercase">{activeTopic} — Learning Sequence</h3>
                            <p className="text-xs text-brand-secondary font-mono mt-1">Beginner to Advanced. Click the checkbox when you solve it.</p>
                        </div>
                        
                        <div className="space-y-3">
                            {currentProblems.map((p, idx) => {
                                const isDone = !!progressMap[p.id];
                                return (
                                    <div key={p.id} className={`group relative flex items-center gap-4 p-3 rounded-lg border transition-all duration-300
                                        ${isDone ? 'border-green-500/20 bg-green-500/5' : 'border-brand-border/30 bg-brand-bg/40 hover:border-brand-accent/40'}
                                    `}>
                                        <div className="font-mono text-[10px] text-brand-secondary/40 w-4 text-center shrink-0">
                                            {idx + 1}
                                        </div>
                                        
                                        <button onClick={() => toggleProblemComplete(p.id)} 
                                            className={`shrink-0 transition-colors ${isDone ? 'text-green-400' : 'text-brand-secondary hover:text-brand-accent'}`}>
                                            {isDone ? <CheckCircle size={20} /> : <Circle size={20} />}
                                        </button>

                                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                            <div className="flex flex-col items-start min-w-0">
                                                <a href={p.link} target="_blank" rel="noreferrer" 
                                                    className={`font-semibold font-mono text-sm tracking-wide truncate transition-colors flex items-center gap-1.5 w-full hover:underline
                                                    ${isDone ? 'text-green-400/80' : 'text-brand-primary'}
                                                `}>
                                                    {p.title}
                                                </a>
                                                <div className="flex items-center gap-3 mt-1 text-[10px] font-mono uppercase">
                                                    <span className={`${p.platform === 'leetcode' ? 'text-orange-400' : 'text-purple-400'} flex items-center gap-1`}>
                                                        {p.platform === 'leetcode' ? <Code2 size={10} /> : <Trophy size={10} />}
                                                        {p.platform}
                                                    </span>
                                                    <span className="text-brand-secondary">Pattern: {p.pattern}</span>
                                                </div>
                                            </div>

                                            <div className="shrink-0 flex items-center gap-2">
                                                <span className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase flex items-center justify-center min-w-[50px]
                                                    ${p.difficulty === 'hard' ? 'text-red-400 border-red-400/30' : p.difficulty === 'medium' ? 'text-yellow-400 border-yellow-400/30' : 'text-green-400 border-green-400/30'}`}>
                                                    {p.difficulty}
                                                </span>
                                                {p.cf_rating && (
                                                    <span className="text-[9px] font-mono px-2 py-0.5 rounded border text-purple-400 border-purple-400/30 flex items-center justify-center min-w-[50px]">
                                                        *{p.cf_rating}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
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
