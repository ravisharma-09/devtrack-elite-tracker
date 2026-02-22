import React, { useEffect, useState } from 'react';
import { Brain, Zap, Terminal, LayoutTemplate, Github, FolderGit2, MessageSquareText, ExternalLink, CheckCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getSupabaseClient } from '../backend/supabaseClient';
import problemBank from '../data/problemBank.json';
import { fetchCodeforcesStats } from '../api/codeforcesApi';

type TabType = 'dsa' | 'opensource' | 'webdev';

// ── Starter packs (used ONLY as final fallback if no CF data found) ────────────
const STARTER_DSA = [
    { name: 'Watermelon', link: 'https://codeforces.com/problemset/problem/4/A', topic: 'Math', rating: 800 },
    { name: 'Way Too Long Words', link: 'https://codeforces.com/problemset/problem/71/A', topic: 'Strings', rating: 800 },
    { name: 'Team', link: 'https://codeforces.com/problemset/problem/231/A', topic: 'Greedy', rating: 800 },
    { name: 'Next Round', link: 'https://codeforces.com/problemset/problem/158/A', topic: 'Implementation', rating: 800 },
    { name: 'Twins', link: 'https://codeforces.com/problemset/problem/160/A', topic: 'Sorting', rating: 900 },
];
const STARTER_OPENSOURCE = [
    { name: 'First Contributions', description: 'Make your first open-source PR. Perfect for beginners.', link: 'https://github.com/firstcontributions/first-contributions', topic: 'Git', difficulty: 'Easy' },
    { name: 'Good First Issues', description: 'Browse beginner-friendly issues across GitHub.', link: 'https://goodfirstissues.com', topic: 'Open Source', difficulty: 'Easy' },
    { name: 'Up For Grabs', description: 'A list of open source projects with curated tasks for new contributors.', link: 'https://up-for-grabs.net', topic: 'Open Source', difficulty: 'Easy' },
];
const STARTER_WEBDEV = [
    { name: 'Portfolio Website', description: 'Build your personal portfolio with HTML, CSS and JS.', link: 'https://github.com/topics/portfolio', topic: 'HTML/CSS', difficulty: 'Easy' },
    { name: 'Todo App', description: 'Master DOM manipulation by building a functional todo app.', link: 'https://github.com/topics/todo-app', topic: 'DOM', difficulty: 'Medium' },
    { name: 'Weather App', description: 'Learn to use APIs by building a weather dashboard.', link: 'https://github.com/topics/weather-app', topic: 'Fetch API', difficulty: 'Medium' },
];

// ── Build recs from real user data ────────────────────────────────────────────
function buildPersonalizedRecs(cfStats: any, weakTopics: string[], roadmapTopics: string[]): any[] {
    const cfRating: number = cfStats?.rating || 800;

    // DSA — pick problems near user's real CF rating
    let pool = (problemBank as any[]).filter(p => p.rating >= cfRating - 150 && p.rating <= cfRating + 300);
    if (pool.length < 3) pool = (problemBank as any[]).filter(p => p.rating >= cfRating - 300 && p.rating <= cfRating + 400);
    if (pool.length < 3) pool = (problemBank as any[]).filter(p => p.rating <= 900);
    if (pool.length === 0) pool = STARTER_DSA;

    // Prioritise weak topics
    const byWeak = pool.filter(p => weakTopics.some(wt => wt.toLowerCase().includes(p.topic.toLowerCase()) || p.topic.toLowerCase().includes(wt.toLowerCase())));
    const byGeneral = pool.filter(p => !byWeak.includes(p));
    const dsaSelected = [...byWeak.slice(0, 3), ...byGeneral.slice(0, 3 - Math.min(3, byWeak.length))];
    while (dsaSelected.length < 3) dsaSelected.push(STARTER_DSA[dsaSelected.length % STARTER_DSA.length]);

    const dsaRecs = dsaSelected.map(p => ({
        type: 'dsa',
        content: {
            title: p.name,
            description: 'Codeforces problem at rating ' + p.rating + '. Topic: ' + p.topic + '.',
            link: p.link, topic: p.topic,
            difficulty: p.rating > 1600 ? 'Hard' : p.rating > 1200 ? 'Medium' : 'Easy',
        }
    }));

    // Open Source
    const osRecs = STARTER_OPENSOURCE.map(o => ({ type: 'opensource', content: o }));

    // Web Projects — personalise based on roadmap topics if available
    const webRecs: any[] = [];
    const rtLower = roadmapTopics.map(t => t.toLowerCase());
    if (rtLower.some(t => t.includes('react'))) webRecs.push({ type: 'webdev', content: { name: 'Blog App', description: 'Master React State and Props by building a full blog.', link: 'https://github.com/topics/react-blog', topic: 'React', difficulty: 'Hard' } });
    if (rtLower.some(t => t.includes('node') || t.includes('backend'))) webRecs.push({ type: 'webdev', content: { name: 'REST API', description: 'Build a full CRUD REST API with Node.js and Express.', link: 'https://github.com/topics/rest-api', topic: 'Node.js', difficulty: 'Medium' } });
    if (rtLower.some(t => t.includes('dom') || t.includes('javascript'))) webRecs.push({ type: 'webdev', content: { name: 'Todo App', description: 'Master DOM manipulation by building a functional todo app.', link: 'https://github.com/topics/todo-app', topic: 'DOM', difficulty: 'Medium' } });
    if (webRecs.length === 0) webRecs.push(...STARTER_WEBDEV.map(w => ({ type: 'webdev', content: w })));

    return [...dsaRecs, ...osRecs, ...webRecs];
}

export const Suggestions: React.FC = () => {
    const { user } = useAuth();
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [profile, setProfile] = useState<{ cfHandle?: string; cfRating?: number; weakTopics?: string[] }>({});
    const [analysis, setAnalysis] = useState<{ dsa?: string; github?: string; webdev?: string }>({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('dsa');

    useEffect(() => {
        if (!user) return;
        let mounted = true;

        const load = async () => {
            setLoading(true);
            try {
                const supabase = await getSupabaseClient();
                if (!supabase) return;

                // 1. Load user handles (CF handle etc.) from `users` table — this is where Profile saves them
                const { data: userRow } = await supabase
                    .from('users')
                    .select('codeforces_handle, leetcode_username, github_username')
                    .eq('id', user.id)
                    .single();

                // 2. Load external stats — or fetch live from CF API if missing/stale
                let { data: extStats } = await supabase
                    .from('external_stats')
                    .select('cf, lc, gh')
                    .eq('user_id', user.id)
                    .single();

                // Auto-sync: if CF handle exists but no real rating yet, fetch from CF API now
                const cfHandle = userRow?.codeforces_handle || '';
                const existingRating = extStats?.cf?.rating;
                const needsSync = cfHandle && (!existingRating || existingRating < 1);
                if (needsSync) {
                    console.log('🔄 Auto-syncing CF stats for:', cfHandle);
                    const freshCF = await fetchCodeforcesStats(cfHandle);
                    if (freshCF) {
                        // Save to external_stats for future loads
                        await supabase.from('external_stats').upsert({
                            user_id: user.id,
                            cf: freshCF,
                            last_synced: new Date().toISOString()
                        }).catch(() => { });
                        extStats = { ...extStats, cf: freshCF };
                        console.log('✅ CF stats saved: rating', freshCF.rating, 'solved', freshCF.problemsSolved);
                    }
                }

                // 3. Load roadmap topics in progress
                const { data: roadmapData } = await supabase
                    .from('roadmap_progress')
                    .select('topic_id')
                    .eq('user_id', user.id)
                    .eq('completed', false);

                const cfStats = extStats?.cf || null;
                const cfRating = cfStats?.rating || 800;
                const hasCFHandle = !!(userRow?.codeforces_handle);
                const weakTopics: string[] = cfStats?.weakTopics || [];
                const roadmapTopics: string[] = roadmapData?.map((r: any) => r.topic_id || '').filter(Boolean) || [];

                if (mounted) {
                    setProfile({
                        cfHandle: userRow?.codeforces_handle || '',
                        cfRating,
                        weakTopics,
                    });
                }

                // 4. Check existing DB recs
                const { data: dbRecs } = await supabase
                    .from('recommendations')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                // 5. If DB has recs AND are recent (< 6h old), show them
                const isRecent = dbRecs && dbRecs.length > 0 &&
                    new Date(dbRecs[0].created_at).getTime() > Date.now() - 6 * 60 * 60 * 1000;

                if (isRecent) {
                    if (mounted) setRecommendations(dbRecs!);
                } else {
                    // 6. Build fresh personalized recs
                    const freshRecs = buildPersonalizedRecs(cfStats, weakTopics, roadmapTopics);

                    // 7. Write to DB (fire-and-forget, don't block UI)
                    supabase.from('recommendations').delete().eq('user_id', user.id).then(() => {
                        freshRecs.forEach(rec =>
                            supabase.from('recommendations').insert({ user_id: user.id, ...rec }).catch(() => { })
                        );
                    }).catch(() => { });

                    if (mounted) setRecommendations(freshRecs);
                }

                // 8. Set contextual AI analysis text
                const analysisText: { dsa: string; github: string; webdev: string } = {
                    dsa: hasCFHandle
                        ? `Showing Codeforces problems at your rating level (${cfRating}). ${weakTopics.length > 0 ? 'Weak topics detected: ' + weakTopics.slice(0, 3).join(', ') + '. Prioritised.' : 'Sync your profile again to detect weak topics.'}`
                        : 'No Codeforces handle linked. Starter problems shown. Add your CF handle in Profile for personalized targets.',
                    github: 'Open source contribution targets. Complete these to build your GitHub reputation.',
                    webdev: roadmapTopics.length > 0
                        ? 'Projects matched to your current roadmap topics: ' + roadmapTopics.slice(0, 3).join(', ') + '.'
                        : 'Starter web projects. Update your Roadmap for personalized project suggestions.',
                };
                if (mounted) setAnalysis(analysisText);

                // AI cache (optional, non-blocking)
                try {
                    const { data: cacheData } = await supabase
                        .from('ai_analytics_cache').select('suggestions').eq('user_id', user.id).single();
                    if (mounted && cacheData?.suggestions?.targeted_practice_analysis) {
                        setAnalysis(prev => ({ ...prev, ...cacheData.suggestions.targeted_practice_analysis }));
                    }
                } catch (_) { }

            } catch (e) {
                console.error('Suggestions load error:', e);
                if (mounted) setRecommendations(buildPersonalizedRecs(null, [], []));
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => { mounted = false; };
    }, [user]);

    const activeRecs = recommendations.filter(r =>
        activeTab === 'dsa' ? r.type === 'dsa'
            : activeTab === 'opensource' ? r.type === 'opensource'
                : r.type === 'webdev' || r.type === 'project'
    );

    const analysisText = activeTab === 'dsa' ? analysis.dsa
        : activeTab === 'opensource' ? analysis.github
            : analysis.webdev;

    if (loading) {
        return (
            <div className="retro-panel p-12 text-center border-brand-primary/20 bg-brand-bg/50 mt-8 animate-fade-in">
                <Brain className="w-16 h-16 mx-auto text-brand-secondary/30 mb-4 animate-pulse" />
                <h3 className="text-brand-secondary font-mono tracking-widest uppercase mb-2">Scanning for Targets...</h3>
                <p className="text-xs font-mono text-brand-secondary/40">Reading your profile data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-6 border-b border-brand-border pb-4">
                <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2 flex items-center gap-3">
                    <Zap className="text-brand-accent" /> Targeted Practice
                </h2>
                <p className="retro-text-sub">
                    AI & Engine curated targets focused on your explicit weaknesses
                    {profile.cfHandle && <span className="ml-2 text-green-400">· CF: {profile.cfHandle} ({profile.cfRating})</span>}
                </p>
            </header>

            {/* TABS */}
            <div className="flex border-b border-brand-border/50 gap-6">
                <button onClick={() => setActiveTab('dsa')}
                    className={`pb-3 font-mono text-sm tracking-wide uppercase transition-colors relative ${activeTab === 'dsa' ? 'text-brand-accent font-bold' : 'text-brand-secondary hover:text-brand-primary'}`}>
                    <div className="flex items-center gap-2"><Terminal size={16} /> Algorithmic (DSA)</div>
                    {activeTab === 'dsa' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-accent rounded-t-md" />}
                </button>
                <button onClick={() => setActiveTab('opensource')}
                    className={`pb-3 font-mono text-sm tracking-wide uppercase transition-colors relative ${activeTab === 'opensource' ? 'text-green-400 font-bold' : 'text-brand-secondary hover:text-brand-primary'}`}>
                    <div className="flex items-center gap-2"><Github size={16} /> Open Source</div>
                    {activeTab === 'opensource' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-green-400 rounded-t-md" />}
                </button>
                <button onClick={() => setActiveTab('webdev')}
                    className={`pb-3 font-mono text-sm tracking-wide uppercase transition-colors relative ${activeTab === 'webdev' ? 'text-brand-primary font-bold' : 'text-brand-secondary hover:text-brand-primary'}`}>
                    <div className="flex items-center gap-2"><LayoutTemplate size={16} /> Web Projects</div>
                    {activeTab === 'webdev' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-primary rounded-t-md" />}
                </button>
            </div>

            <div className="animate-fade-in mt-6">
                {/* AI Intelligence Banner */}
                <div className="retro-panel p-5 border-brand-accent/30 bg-brand-accent/5 mb-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-accent/60 to-transparent" />
                    <h3 className="text-sm font-mono uppercase text-brand-accent tracking-widest mb-2 flex items-center gap-2">
                        <MessageSquareText size={14} /> Targeted AI Intelligence
                    </h3>
                    <p className="text-brand-primary leading-relaxed text-sm font-mono opacity-90">{analysisText}</p>
                    {!profile.cfHandle && (
                        <a href="/profile" className="mt-3 inline-flex items-center gap-1.5 text-xs font-mono text-brand-accent hover:underline">
                            <CheckCircle size={12} /> Link Codeforces handle in Profile for personalised targets →
                        </a>
                    )}
                </div>

                {activeRecs.length === 0 ? (
                    <div className="retro-panel p-12 text-center border-brand-primary/20 bg-brand-bg/50">
                        <FolderGit2 className="w-16 h-16 mx-auto text-brand-secondary/30 mb-4" />
                        <h3 className="text-brand-secondary font-mono tracking-widest uppercase mb-2">No Targets Found</h3>
                        <p className="text-sm text-brand-secondary/60 font-mono">Link your Codeforces handle in Profile to see personalized problems.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {activeRecs.map((q, i) => (
                            <a key={i}
                                href={q.content?.link || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className={`retro-panel p-5 block group transition-all duration-300 relative overflow-hidden ${activeTab === 'dsa' ? 'border-brand-accent/20 hover:border-brand-accent bg-brand-bg/40'
                                    : activeTab === 'opensource' ? 'border-green-500/20 hover:border-green-500 bg-brand-bg/40'
                                        : 'border-brand-primary/20 hover:border-brand-primary bg-brand-bg/40'}`}>

                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                                    <ExternalLink size={14} className={activeTab === 'dsa' ? 'text-brand-accent' : activeTab === 'opensource' ? 'text-green-500' : 'text-brand-primary'} />
                                </div>

                                <div className="flex items-center gap-2 mb-3">
                                    {activeTab === 'dsa' && <Zap size={14} className="text-brand-accent" />}
                                    {activeTab === 'opensource' && <Github size={14} className="text-green-400" />}
                                    {activeTab === 'webdev' && <LayoutTemplate size={14} className="text-brand-primary" />}
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-brand-secondary">
                                        {q.content?.topic || 'Target'}
                                    </span>
                                </div>

                                <h4 className={`font-bold font-mono text-sm leading-snug mb-2 transition-colors ${activeTab === 'dsa' ? 'text-brand-primary group-hover:text-brand-accent'
                                    : activeTab === 'opensource' ? 'text-green-500 group-hover:text-green-400'
                                        : 'text-brand-accent group-hover:text-brand-primary'}`}>
                                    {q.content?.title || q.content?.name || q.title}
                                </h4>

                                <p className="text-brand-secondary/80 text-xs mb-4 line-clamp-3 leading-relaxed">
                                    {q.content?.description}
                                </p>

                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${q.content?.difficulty === 'Hard' ? 'text-red-400 bg-red-400/10 border-red-400/20'
                                    : q.content?.difficulty === 'Medium' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
                                        : 'text-green-400 bg-green-400/10 border-green-400/20'}`}>
                                    {q.content?.difficulty || 'Easy'}
                                </span>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
