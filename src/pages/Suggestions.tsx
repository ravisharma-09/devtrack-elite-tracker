import React, { useEffect, useState } from 'react';
import { Brain, Code2, Target, ExternalLink, Zap, Terminal, LayoutTemplate, Github, FolderGit2, MessageSquareText } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getSupabaseClient } from '../backend/supabaseClient';
import problemBank from '../data/problemBank.json';

type TabType = 'dsa' | 'opensource' | 'webdev';

// Starter packs — always shown for new users
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

function getInMemoryFallback(profile: any): any[] {
    const cfRating: number = profile?.cf_rating || 800;
    const weakTopics: string[] = profile?.weak_topics || [];
    let pool = (problemBank as any[]).filter(p => p.rating >= cfRating - 100 && p.rating <= cfRating + 300);
    if (pool.length === 0) pool = (problemBank as any[]).filter(p => p.rating <= 900);
    if (pool.length === 0) pool = STARTER_DSA;
    const byWeak = pool.filter(p => weakTopics.includes(p.topic));
    const byGeneral = pool.filter(p => !weakTopics.includes(p.topic));
    const selected = [...byWeak.slice(0, 3), ...byGeneral.slice(0, 3 - byWeak.slice(0, 3).length)];
    while (selected.length < 3) selected.push(STARTER_DSA[selected.length % STARTER_DSA.length]);
    return [
        ...selected.map(p => ({ type: 'dsa', content: { title: p.name, description: 'Practice ' + p.topic + ' at rating ' + p.rating + '.', link: p.link, topic: p.topic, difficulty: p.rating > 1400 ? 'Hard' : p.rating > 1000 ? 'Medium' : 'Easy' } })),
        ...STARTER_OPENSOURCE.map(o => ({ type: 'opensource', content: o })),
        ...STARTER_WEBDEV.map(w => ({ type: 'webdev', content: w })),
    ];
}

async function insertStarterRecs(supabase: any, userId: string, profile: any): Promise<void> {
    const cfRating: number = profile?.cf_rating || 800;
    const weakTopics: string[] = profile?.weak_topics || [];

    // Pick DSA problems near user's rating
    let pool = (problemBank as any[]).filter(p => p.rating >= cfRating - 100 && p.rating <= cfRating + 300);
    if (pool.length === 0) pool = (problemBank as any[]).filter(p => p.rating <= 900);
    if (pool.length === 0) pool = STARTER_DSA;

    // Prefer weak topics
    const byWeak = pool.filter(p => weakTopics.includes(p.topic));
    const byGeneral = pool.filter(p => !weakTopics.includes(p.topic));
    const selected = [...byWeak.slice(0, 3), ...byGeneral.slice(0, 3 - byWeak.slice(0, 3).length)];
    while (selected.length < 3) selected.push(STARTER_DSA[selected.length]);

    const rows: any[] = [
        ...selected.map(p => ({
            user_id: userId, type: 'dsa',
            content: {
                title: p.name,
                description: 'Targeted practice for ' + p.topic + ' at rating ' + p.rating + '.',
                link: p.link, topic: p.topic,
                difficulty: p.rating > 1400 ? 'Hard' : p.rating > 1000 ? 'Medium' : 'Easy'
            }
        })),
        ...STARTER_OPENSOURCE.map(o => ({ user_id: userId, type: 'opensource', content: o })),
        ...STARTER_WEBDEV.map(w => ({ user_id: userId, type: 'webdev', content: w })),
    ];

    for (const row of rows) {
        await supabase.from('recommendations').insert(row).catch(() => { });
    }
}

export const Suggestions: React.FC = () => {
    const { user } = useAuth();
    const [recommendations, setRecommendations] = useState<any[]>([]);
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

                // 1. Fetch existing recs
                const { data: recData } = await supabase
                    .from('recommendations')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (recData && recData.length > 0) {
                    if (mounted) setRecommendations(recData);
                } else {
                    // 2. DB is empty — fetch profile for personalisation
                    console.log('⚡ Empty DB — inserting starter recs...');
                    const { data: profile } = await supabase
                        .from('profiles').select('cf_rating, weak_topics').eq('id', user.id).single();

                    // 3. Try to insert to DB, but don't block rendering if it fails
                    try {
                        await insertStarterRecs(supabase, user.id, profile);
                        const { data: fresh } = await supabase
                            .from('recommendations').select('*')
                            .eq('user_id', user.id).order('created_at', { ascending: false });
                        if (mounted && fresh && fresh.length > 0) {
                            setRecommendations(fresh);
                        } else {
                            // DB write failed or still empty — render in-memory fallback
                            if (mounted) setRecommendations(getInMemoryFallback(profile));
                        }
                    } catch (insertErr) {
                        console.warn('DB insert failed, using in-memory fallback:', insertErr);
                        if (mounted) setRecommendations(getInMemoryFallback(profile));
                    }
                }

                // AI analysis text (non-blocking)
                try {
                    const { data: cacheData } = await supabase
                        .from('ai_analytics_cache').select('suggestions')
                        .eq('user_id', user.id).single();
                    if (mounted && cacheData?.suggestions?.targeted_practice_analysis) {
                        setAnalysis(cacheData.suggestions.targeted_practice_analysis);
                    }
                } catch (_) { /* analytics cache missing is fine */ }

            } catch (e) {
                console.error('Suggestions load error:', e);
                // Last resort — show hardcoded in-memory cards so page is never blank
                if (mounted) setRecommendations(getInMemoryFallback(null));
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();

        // Real-time listener — update if engine pushes more recs later
        getSupabaseClient().then(supabase => {
            if (!supabase) return;
            const sub = supabase.channel('recs-live')
                .on('postgres_changes', {
                    event: 'INSERT', schema: 'public', table: 'recommendations',
                    filter: 'user_id=eq.' + user.id
                }, () => { if (mounted) load(); })
                .subscribe();
            return () => supabase.removeChannel(sub);
        });

        return () => { mounted = false; };
    }, [user]);

    const activeRecs = activeTab === 'dsa'
        ? recommendations.filter(r => r.type === 'dsa')
        : activeTab === 'opensource'
            ? recommendations.filter(r => r.type === 'opensource')
            : recommendations.filter(r => r.type === 'webdev' || r.type === 'project');

    const renderAiAnalysisBox = () => {
        let text = '';
        if (activeTab === 'dsa') text = analysis.dsa || 'Starter problems selected based on your skill level. Add your Codeforces handle in Profile for personalised targets.';
        if (activeTab === 'opensource') text = analysis.github || 'Great open-source projects to make your first contribution.';
        if (activeTab === 'webdev') text = analysis.webdev || 'Starter web projects to build your portfolio. Update your roadmap for personalised suggestions.';

        return (
            <div className="retro-panel p-6 border-brand-accent/40 bg-brand-accent/5 mb-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-accent/60 to-transparent" />
                <h3 className="text-sm font-mono uppercase text-brand-accent tracking-widest mb-3 flex items-center gap-2">
                    <MessageSquareText size={16} /> Targeted AI Intelligence
                </h3>
                <p className="text-brand-primary leading-relaxed text-sm font-mono opacity-90">{text}</p>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="retro-panel p-12 text-center border-brand-primary/20 bg-brand-bg/50 mt-8 animate-fade-in">
                <Brain className="w-16 h-16 mx-auto text-brand-secondary/30 mb-4 animate-pulse" />
                <h3 className="text-brand-secondary font-mono tracking-widest uppercase mb-2">Scanning for Targets...</h3>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-6 border-b border-brand-border pb-4">
                <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2 flex items-center gap-3">
                    <Target className="text-brand-accent" /> Targeted Practice
                </h2>
                <p className="retro-text-sub">AI & Engine curated targets focused on your explicit weaknesses</p>
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
                {renderAiAnalysisBox()}

                {activeRecs.length === 0 ? (
                    <div className="retro-panel p-12 text-center border-brand-primary/20 bg-brand-bg/50">
                        <FolderGit2 className="w-16 h-16 mx-auto text-brand-secondary/30 mb-4" />
                        <h3 className="text-brand-secondary font-mono tracking-widest uppercase mb-2">Loading Targets...</h3>
                        <p className="text-sm text-brand-secondary/60 font-mono">Syncing your profile data...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {activeRecs.map((q, i) => (
                            <a key={i}
                                href={q.content?.link || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className={`retro-panel p-5 block group transition-all duration-300 relative overflow-hidden ${activeTab === 'dsa' ? 'border-brand-accent/20 hover:border-brand-accent bg-brand-bg/40' :
                                    activeTab === 'opensource' ? 'border-green-500/20 hover:border-green-500 bg-brand-bg/40' :
                                        'border-brand-primary/20 hover:border-brand-primary bg-brand-bg/40'}`}>

                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                                    <ExternalLink size={16} className={activeTab === 'dsa' ? 'text-brand-accent' : activeTab === 'opensource' ? 'text-green-500' : 'text-brand-primary'} />
                                </div>

                                <div className="flex items-center gap-2 mb-3">
                                    {activeTab === 'dsa' && <Zap size={16} className="text-brand-accent" />}
                                    {activeTab === 'opensource' && <Github size={16} className="text-green-400" />}
                                    {activeTab === 'webdev' && <LayoutTemplate size={16} className="text-brand-primary" />}
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-brand-secondary line-clamp-1">
                                        {q.content?.topic || 'Target Area'}
                                    </span>
                                </div>

                                <h4 className={`font-bold font-mono text-sm leading-snug mb-3 transition-colors ${activeTab === 'dsa' ? 'text-brand-primary group-hover:text-brand-accent' :
                                    activeTab === 'opensource' ? 'text-green-500 group-hover:text-green-400' :
                                        'text-brand-accent group-hover:text-brand-primary'}`}>
                                    {q.content?.title || q.title}
                                </h4>

                                <p className="text-brand-secondary/80 text-xs mb-4 line-clamp-3 leading-relaxed">
                                    {q.content?.description || q.description}
                                </p>

                                <div className="flex items-center gap-2 mt-auto">
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${q.content?.difficulty === 'Hard' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                                        q.content?.difficulty === 'Medium' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                                            'text-green-400 bg-green-400/10 border-green-400/20'}`}>
                                        {q.content?.difficulty || 'Easy'}
                                    </span>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
