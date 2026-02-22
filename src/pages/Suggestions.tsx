import React, { useEffect, useState } from 'react';
import { Brain, Zap, Terminal, LayoutTemplate, Github, FolderGit2, MessageSquareText, ExternalLink, CheckCircle, RefreshCw, Code2, Trophy } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getSupabaseClient } from '../backend/supabaseClient';
import problemBank from '../data/problemBank.json';
import { fetchCodeforcesStats } from '../api/codeforcesApi';

type TabType = 'dsa' | 'opensource' | 'webdev';

// ── Open Source recs ─────────────────────────────────────────────────────────
const OS_BEGINNER = [
    { name: 'First Contributions', description: 'Make your very first open-source PR. Step-by-step guide for beginners.', link: 'https://github.com/firstcontributions/first-contributions', topic: 'Git & GitHub', difficulty: 'Easy' },
    { name: 'Hacktoberfest', description: 'October event — 4 PRs = shirt + badge. Best starting point for real open-source.', link: 'https://hacktoberfest.com', topic: 'Open Source', difficulty: 'Easy' },
    { name: 'Good First Issues', description: 'Browse beginner-friendly labeled issues across thousands of repos.', link: 'https://goodfirstissues.com', topic: 'Open Source', difficulty: 'Easy' },
    { name: 'GSSoC (GirlScript)', description: "India's largest open source program. Perfect for students. Apply in Feb-Mar.", link: 'https://gssoc.girlscript.tech', topic: 'Mentored', difficulty: 'Easy' },
    { name: 'KWoC (IIT-KGP)', description: 'Winter open source event by IIT Kharagpur. Earn certificate + experience.', link: 'https://kwoc.kossiitkgp.org', topic: 'Mentored', difficulty: 'Easy' },
];
const OS_INTERMEDIATE = [
    { name: 'GSoC (Google)', description: 'Prestigious 3-month program. $1500–$6600 stipend. Apply Feb–Mar each year.', link: 'https://summerofcode.withgoogle.com', topic: 'GSoC', difficulty: 'Hard' },
    { name: 'LFX Mentorship', description: 'Linux Foundation paid mentorship with Kubernetes, CNCF projects. Apply rolling.', link: 'https://mentorship.lfx.linuxfoundation.org', topic: 'Cloud Native', difficulty: 'Medium' },
    { name: 'Outreachy', description: 'Paid remote internships for underrepresented contributors. $7000 stipend.', link: 'https://www.outreachy.org', topic: 'Paid', difficulty: 'Medium' },
];

// ── Web Project recs ──────────────────────────────────────────────────────────
const WEB_BEGINNER = [
    { name: 'Portfolio Website', description: 'Build your personal portfolio — the #1 thing recruiters check. HTML + CSS + JS.', link: 'https://github.com/topics/portfolio', topic: 'HTML/CSS', difficulty: 'Easy' },
    { name: 'Todo App', description: 'Master DOM manipulation. Add, delete, complete tasks with localStorage.', link: 'https://github.com/topics/todo-app', topic: 'DOM', difficulty: 'Easy' },
    { name: 'Weather App', description: 'Learn Fetch API by building a city weather dashboard with OpenWeather API.', link: 'https://openweathermap.org/api', topic: 'APIs', difficulty: 'Medium' },
];
const WEB_REACT = [
    { name: 'Blog App with React', description: 'Full blog with routing, state, and CRUD. Best React practice project.', link: 'https://github.com/topics/react-blog', topic: 'React', difficulty: 'Medium' },
    { name: 'E-Commerce Cart', description: 'Product listing, cart management, filtering. Hooks + Context API.', link: 'https://github.com/topics/react-ecommerce', topic: 'React', difficulty: 'Hard' },
    { name: 'Real-time Chat App', description: 'WebSockets, Firebase/Supabase. Build a working chat with rooms.', link: 'https://github.com/topics/chat-app', topic: 'Full Stack', difficulty: 'Hard' },
];
const WEB_BACKEND = [
    { name: 'REST API (Node.js)', description: 'Build a full CRUD REST API with Express + MongoDB or PostgreSQL.', link: 'https://github.com/topics/rest-api', topic: 'Node.js', difficulty: 'Medium' },
    { name: 'Auth System', description: 'JWT + bcrypt authentication system. Refresh tokens, protected routes.', link: 'https://github.com/topics/jwt-authentication', topic: 'Backend', difficulty: 'Hard' },
    { name: 'URL Shortener', description: 'Redis caching, database, redirect service. Classic backend project.', link: 'https://github.com/topics/url-shortener', topic: 'Backend', difficulty: 'Medium' },
];

// ── LeetCode topic recs ───────────────────────────────────────────────────────
const LC_TOPICS: Record<string, { easy: any; medium: any }> = {
    arrays: {
        easy: { name: 'Two Sum', link: 'https://leetcode.com/problems/two-sum/', difficulty: 'Easy', topic: 'Arrays' },
        medium: { name: '3Sum', link: 'https://leetcode.com/problems/3sum/', difficulty: 'Medium', topic: 'Arrays' },
    },
    strings: {
        easy: { name: 'Valid Anagram', link: 'https://leetcode.com/problems/valid-anagram/', difficulty: 'Easy', topic: 'Strings' },
        medium: { name: 'Longest Substring Without Repeating Characters', link: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/', difficulty: 'Medium', topic: 'Strings' },
    },
    trees: {
        easy: { name: 'Maximum Depth of Binary Tree', link: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/', difficulty: 'Easy', topic: 'Trees' },
        medium: { name: 'Binary Tree Level Order Traversal', link: 'https://leetcode.com/problems/binary-tree-level-order-traversal/', difficulty: 'Medium', topic: 'Trees' },
    },
    dp: {
        easy: { name: 'Climbing Stairs', link: 'https://leetcode.com/problems/climbing-stairs/', difficulty: 'Easy', topic: 'DP' },
        medium: { name: 'Coin Change', link: 'https://leetcode.com/problems/coin-change/', difficulty: 'Medium', topic: 'DP' },
    },
    graphs: {
        easy: { name: 'Flood Fill', link: 'https://leetcode.com/problems/flood-fill/', difficulty: 'Easy', topic: 'Graphs' },
        medium: { name: 'Number of Islands', link: 'https://leetcode.com/problems/number-of-islands/', difficulty: 'Medium', topic: 'Graphs' },
    },
};

function buildPersonalizedRecs(
    cfStats: any,
    weakTopics: string[],
    lcStats: any,
    lcUsername: string,
    ghUsername: string,
    ghStats: any,
) {
    const cfRating: number = cfStats?.rating || 800;

    // ── DSA Recs ──
    let pool = (problemBank as any[]).filter(p => p.rating >= cfRating - 200 && p.rating <= cfRating + 250);
    if (pool.length < 5) pool = (problemBank as any[]).filter(p => Math.abs(p.rating - cfRating) <= 400);
    if (pool.length === 0) pool = problemBank as any[];

    const byWeak = pool.filter(p => weakTopics.some(wt =>
        wt.toLowerCase().includes(p.topic.toLowerCase()) || p.topic.toLowerCase().includes(wt.toLowerCase())
    ));
    const byGeneral = pool.filter(p => !byWeak.includes(p));
    const dsaSelected: any[] = [...byWeak.slice(0, 3)];
    for (const p of byGeneral) { if (dsaSelected.length >= 6) break; dsaSelected.push(p); }

    const dsaRecs = dsaSelected.map(p => ({
        id: 'dsa_' + p.name,
        type: 'dsa' as const,
        content: {
            title: p.name,
            description: `Rating ${p.rating} · ${p.topic}${weakTopics.includes(p.topic) ? ' · ⚠ Weak Area' : ''}`,
            link: p.link, topic: p.topic,
            difficulty: p.rating >= 1500 ? 'Hard' : p.rating >= 1200 ? 'Medium' : 'Easy',
        },
    }));

    // ── LeetCode recs (if connected) ──
    const lcRecs: any[] = [];
    if (lcUsername) {
        const lcSolved = lcStats?.totalSolved || 0;
        const level = lcSolved < 30 ? 'easy' : 'medium';
        Object.values(LC_TOPICS).forEach(t => {
            lcRecs.push({ id: 'lc_' + t[level].name, type: 'dsa', content: { ...t[level], description: `LeetCode · ${t[level].difficulty} · ${t[level].topic}` } });
        });
    }

    // ── Open Source ──
    const ghContribs = ghStats?.publicRepos || 0;
    const osRecs = ghContribs < 5 || cfRating < 1200
        ? OS_BEGINNER.map(o => ({ id: 'os_' + o.name, type: 'opensource' as const, content: o }))
        : [...OS_BEGINNER.slice(0, 2), ...OS_INTERMEDIATE].map(o => ({ id: 'os_' + o.name, type: 'opensource' as const, content: o }));

    // ── Web Projects ──
    let webBase = WEB_BEGINNER;
    if (cfRating >= 1200 || (lcStats?.totalSolved || 0) > 50) webBase = [...WEB_BEGINNER, ...WEB_REACT];
    if (cfRating >= 1500 || (lcStats?.totalSolved || 0) > 100) webBase = [...WEB_REACT, ...WEB_BACKEND];
    const webRecs = webBase.map(w => ({ id: 'web_' + w.name, type: 'webdev' as const, content: w }));

    return [...dsaRecs, ...lcRecs, ...osRecs, ...webRecs];
}

export const Suggestions: React.FC = () => {
    const { user } = useAuth();
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [cfStats, setCfStats] = useState<any>(null);
    const [lcStats, setLcStats] = useState<any>(null);
    const [handles, setHandles] = useState({ cf: '', lc: '', gh: '' });
    const [analysis, setAnalysis] = useState<{ dsa: string; opensource: string; webdev: string }>({
        dsa: 'Loading your profile...', opensource: '', webdev: '',
    });
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('dsa');

    const loadData = async (force = false) => {
        if (!user) return;
        setLoading(true);
        try {
            const supabase = await getSupabaseClient();
            if (!supabase) return;

            // Load handles
            const { data: userRow } = await supabase
                .from('users').select('codeforces_handle, leetcode_username, github_username').eq('id', user.id).single();
            const cfHandle = userRow?.codeforces_handle || '';
            const lcUsername = userRow?.leetcode_username || '';
            const ghUsername = userRow?.github_username || '';
            setHandles({ cf: cfHandle, lc: lcUsername, gh: ghUsername });

            // Load external_stats
            let { data: extRow } = await supabase
                .from('external_stats').select('cf, lc, gh').eq('user_id', user.id).single();

            // Auto-fetch CF stats if missing or forced
            if (cfHandle && (force || !extRow?.cf?.rating)) {
                setSyncing(true);
                const fresh = await fetchCodeforcesStats(cfHandle);
                if (fresh) {
                    await supabase.from('external_stats').upsert({
                        user_id: user.id, cf: fresh, last_synced: new Date().toISOString()
                    }).catch(() => { });
                    extRow = { ...extRow, cf: fresh };
                }
                setSyncing(false);
            }

            const cf = extRow?.cf || null;
            const lc = extRow?.lc || null;
            const gh = extRow?.gh || null;
            const weakTopics: string[] = cf?.weakTopics || [];
            setCfStats(cf);
            setLcStats(lc);

            const recs = buildPersonalizedRecs(cf, weakTopics, lc, lcUsername, ghUsername, gh);
            setRecommendations(recs);

            // Build contextual analysis text
            const cfRating = cf?.rating || 800;
            const cfSolved = cf?.problemsSolved || 0;
            const lcSolved = lc?.totalSolved || 0;
            setAnalysis({
                dsa: cfHandle
                    ? `CF: ${cfHandle} · Rating ${cfRating} (${cf?.rank || 'unrated'}) · ${cfSolved} solved${lcUsername ? ` · LC: ${lcSolved} solved` : ''}${weakTopics.length ? ' · Weak: ' + weakTopics.slice(0, 3).join(', ') : ''}`
                    : 'No Codeforces handle linked. Add it in Profile to get personalized DSA targets.',
                opensource: gh
                    ? `${ghUsername} · ${gh.publicRepos || 0} public repos · Showing ${gh.publicRepos < 5 || cfRating < 1200 ? 'beginner' : 'intermediate'} open source programs based on your level.`
                    : 'Link your GitHub in Profile to get programs matched to your contribution level.',
                webdev: cfRating >= 1500 || lcSolved > 100
                    ? 'You have strong foundation. Showing full-stack and backend projects.'
                    : cfRating >= 1200 || lcSolved > 50
                        ? 'Solid progress! Showing React + intermediate web projects.'
                        : 'Beginner-to-intermediate projects to build your portfolio.',
            });

        } catch (e) {
            console.error('Suggestions load error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(false); }, [user]);

    const handleRefresh = () => loadData(true);

    const activeRecs = recommendations.filter(r =>
        activeTab === 'dsa' ? (r.type === 'dsa')
            : activeTab === 'opensource' ? r.type === 'opensource'
                : r.type === 'webdev' || r.type === 'project'
    );

    const TabIcon = activeTab === 'dsa' ? Terminal : activeTab === 'opensource' ? Github : LayoutTemplate;
    const tabColor = activeTab === 'dsa' ? 'text-brand-accent' : activeTab === 'opensource' ? 'text-green-400' : 'text-brand-primary';

    if (loading) return (
        <div className="retro-panel p-12 text-center mt-8 animate-fade-in">
            <Brain className="w-16 h-16 mx-auto text-brand-secondary/30 mb-4 animate-pulse" />
            <h3 className="text-brand-secondary font-mono tracking-widest uppercase mb-2">Scanning Your Profile...</h3>
            {syncing && <p className="text-xs font-mono text-brand-accent animate-pulse">Fetching live CF stats...</p>}
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-6 border-b border-brand-border pb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-1 flex items-center gap-3">
                        <Zap className="text-brand-accent" /> Targeted Practice
                    </h2>
                    <p className="retro-text-sub">
                        Personalized targets based on your current state
                        {cfStats && <span className="text-green-400 ml-2">· CF Rating: {cfStats.rating} · {cfStats.problemsSolved} solved</span>}
                    </p>
                </div>
                <button onClick={handleRefresh} disabled={syncing || loading}
                    className="flex items-center gap-2 px-3 py-1.5 border border-brand-primary/30 text-brand-primary font-mono text-xs rounded hover:bg-brand-primary/10 transition-colors disabled:opacity-40">
                    <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Syncing CF...' : 'Refresh'}
                </button>
            </header>

            {/* Stats bar */}
            {(cfStats || lcStats) && (
                <div className="flex flex-wrap gap-3">
                    {cfStats && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-yellow-400/20 bg-yellow-400/5 text-xs font-mono text-yellow-400">
                            <Trophy size={12} /> CF: {cfStats.rating} · {cfStats.rank} · {cfStats.problemsSolved} solved
                        </div>
                    )}
                    {lcStats && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-orange-400/20 bg-orange-400/5 text-xs font-mono text-orange-400">
                            <Code2 size={12} /> LeetCode: {lcStats.totalSolved} solved
                        </div>
                    )}
                    {!handles.cf && !handles.lc && (
                        <a href="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded border border-brand-accent/30 bg-brand-accent/5 text-xs font-mono text-brand-accent hover:underline">
                            <CheckCircle size={12} /> Link CF / LeetCode in Profile →
                        </a>
                    )}
                </div>
            )}

            {/* TABS */}
            <div className="flex border-b border-brand-border/50 gap-6">
                {([['dsa', 'Algorithmic (DSA)', Terminal], ['opensource', 'Open Source', Github], ['webdev', 'Web Projects', LayoutTemplate]] as const).map(([t, label, Icon]) => (
                    <button key={t} onClick={() => setActiveTab(t)}
                        className={`pb-3 font-mono text-sm tracking-wide uppercase transition-colors relative flex items-center gap-2 ${activeTab === t ? (t === 'dsa' ? 'text-brand-accent font-bold' : t === 'opensource' ? 'text-green-400 font-bold' : 'text-brand-primary font-bold') : 'text-brand-secondary hover:text-brand-primary'}`}>
                        <Icon size={15} /> {label}
                        {activeTab === t && <span className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-t-md ${t === 'dsa' ? 'bg-brand-accent' : t === 'opensource' ? 'bg-green-400' : 'bg-brand-primary'}`} />}
                    </button>
                ))}
            </div>

            <div className="animate-fade-in">
                {/* Analysis Banner */}
                <div className="retro-panel p-5 border-brand-accent/30 bg-brand-accent/5 mb-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-accent/60 to-transparent" />
                    <h3 className="text-xs font-mono uppercase text-brand-accent tracking-widest mb-2 flex items-center gap-2">
                        <MessageSquareText size={13} /> Targeted AI Intelligence
                    </h3>
                    <p className="text-brand-primary text-sm font-mono leading-relaxed">{analysis[activeTab]}</p>
                </div>

                {activeRecs.length === 0 ? (
                    <div className="retro-panel p-12 text-center">
                        <FolderGit2 className="w-12 h-12 mx-auto text-brand-secondary/30 mb-4" />
                        <p className="text-brand-secondary font-mono text-sm">No targets found. Link your handles in Profile.</p>
                        <a href="/profile" className="mt-3 inline-flex items-center gap-1 text-xs text-brand-accent font-mono hover:underline">
                            Go to Profile →
                        </a>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {activeRecs.map((q) => {
                            const isWeak = q.content?.description?.includes('Weak Area');
                            const borderClass = activeTab === 'dsa' ? 'border-brand-accent/20 hover:border-brand-accent'
                                : activeTab === 'opensource' ? 'border-green-500/20 hover:border-green-500'
                                    : 'border-brand-primary/20 hover:border-brand-primary';
                            return (
                                <a key={q.id} href={q.content?.link || '#'} target="_blank" rel="noreferrer"
                                    className={`retro-panel p-5 block group transition-all duration-300 relative overflow-hidden ${borderClass} ${isWeak ? 'ring-1 ring-yellow-400/30' : ''}`}>
                                    {isWeak && (
                                        <div className="absolute top-2 right-2 text-[9px] font-mono text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded">⚠ WEAK</div>
                                    )}
                                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ExternalLink size={12} className={tabColor} />
                                    </div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <TabIcon size={13} className={tabColor} />
                                        <span className="text-[10px] font-mono uppercase tracking-widest text-brand-secondary">{q.content?.topic}</span>
                                    </div>
                                    <h4 className={`font-bold font-mono text-sm leading-snug mb-2 transition-colors ${tabColor}`}>{q.content?.title || q.content?.name}</h4>
                                    <p className="text-brand-secondary/80 text-xs mb-4 line-clamp-3 leading-relaxed">{q.content?.description}</p>
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${q.content?.difficulty === 'Hard' ? 'text-red-400 bg-red-400/10 border-red-400/20' : q.content?.difficulty === 'Medium' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' : 'text-green-400 bg-green-400/10 border-green-400/20'}`}>
                                        {q.content?.difficulty || 'Easy'}
                                    </span>
                                </a>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
