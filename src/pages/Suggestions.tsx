import React, { useEffect, useState } from 'react';
import { Brain, Code2, Target, ExternalLink, Zap, Terminal, LayoutTemplate, Github, FolderGit2, MessageSquareText } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getSupabaseClient } from '../backend/supabaseClient';

type TabType = 'dsa' | 'opensource' | 'webdev';

export const Suggestions: React.FC = () => {
    const { user } = useAuth();
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [analysis, setAnalysis] = useState<{ dsa?: string; github?: string; webdev?: string }>({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('dsa');

    useEffect(() => {
        if (!user) return;
        let mounted = true;
        let isGenerating = false;

        const fetchRecs = async () => {
            if (isGenerating) return;
            setLoading(true);
            const supabase = await getSupabaseClient();
            if (!supabase) {
                if (mounted) setLoading(false);
                return;
            }

            // Fetch actionable cards
            const { data: recData, error: recError } = await supabase
                .from('recommendations')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            // Fetch AI textual analysis
            const { data: cacheData, error: cacheError } = await supabase
                .from('ai_analytics_cache')
                .select('suggestions')
                .eq('user_id', user.id)
                .single();

            if (mounted) {
                if (recError) {
                    console.error('Error fetching recommendations:', recError);
                    setRecommendations([]);
                } else {
                    setRecommendations(recData || []);
                }

                if (!cacheError && cacheData?.suggestions?.targeted_practice_analysis) {
                    setAnalysis(cacheData.suggestions.targeted_practice_analysis);
                }
                setLoading(false);
            }
        };

        const load = async () => {
            await fetchRecs();
        };

        load();

        getSupabaseClient().then(supabase => {
            if (!supabase) return;
            // Listen for card inserts
            const subRecs = supabase.channel('recs-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'recommendations', filter: `user_id=eq.${user.id}` }, () => {
                    if (mounted) fetchRecs();
                }).subscribe();

            // Listen for AI text updates
            const subCache = supabase.channel('cache-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_analytics_cache', filter: `user_id=eq.${user.id}` }, () => {
                    if (mounted) fetchRecs();
                }).subscribe();

            return () => {
                supabase.removeChannel(subRecs);
                supabase.removeChannel(subCache);
            };
        });

        return () => { mounted = false; };
    }, [user]);

    const activeRecs = activeTab === 'dsa' ? recommendations.filter(r => r.type === 'dsa') :
        activeTab === 'opensource' ? recommendations.filter(r => r.type === 'opensource') :
            recommendations.filter(r => r.type === 'project' || r.type === 'webdev');

    const renderAiAnalysisBox = () => {
        let text = '';
        if (activeTab === 'dsa') text = analysis.dsa || "No DSA analysis telemetry available yet. Keep solving problems and sync your profile.";
        if (activeTab === 'opensource') text = analysis.github || "No GitHub analysis telemetry available yet. Connect your GitHub handle in your profile.";
        if (activeTab === 'webdev') text = analysis.webdev || "No Web Development roadmap analysis available yet. Update your roadmap to track progress.";

        return (
            <div className="retro-panel p-6 border-brand-accent/40 bg-brand-accent/5 mb-8 relative overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-accent/60 to-transparent" />
                <h3 className="text-sm font-mono uppercase text-brand-accent tracking-widest mb-3 flex items-center gap-2">
                    <MessageSquareText size={16} /> Targeted AI Intelligence
                </h3>
                <p className="text-brand-primary leading-relaxed text-sm font-mono opacity-90 relative z-10 transition-opacity">
                    {text}
                </p>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="retro-panel p-12 text-center border-brand-primary/20 bg-brand-bg/50 mt-8 animate-fade-in">
                <Brain className="w-16 h-16 mx-auto text-brand-secondary/30 mb-4 animate-pulse" />
                <h3 className="text-brand-secondary font-mono tracking-widest uppercase mb-2">Scanning Global Telemetry...</h3>
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
                <button
                    onClick={() => setActiveTab('dsa')}
                    className={`pb-3 font-mono text-sm tracking-wide uppercase transition-colors relative ${activeTab === 'dsa' ? 'text-brand-accent font-bold' : 'text-brand-secondary hover:text-brand-primary'}`}
                >
                    <div className="flex items-center gap-2"><Terminal size={16} /> Algorithmic (DSA)</div>
                    {activeTab === 'dsa' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-accent rounded-t-md shadow-[0_0_8px_rgba(var(--brand-accent-rgb),0.8)]" />}
                </button>
                <button
                    onClick={() => setActiveTab('opensource')}
                    className={`pb-3 font-mono text-sm tracking-wide uppercase transition-colors relative ${activeTab === 'opensource' ? 'text-green-400 font-bold' : 'text-brand-secondary hover:text-brand-primary'}`}
                >
                    <div className="flex items-center gap-2"><Github size={16} /> Open Source</div>
                    {activeTab === 'opensource' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-green-400 rounded-t-md shadow-[0_0_8px_rgba(7ade80,0.8)]" />}
                </button>
                <button
                    onClick={() => setActiveTab('webdev')}
                    className={`pb-3 font-mono text-sm tracking-wide uppercase transition-colors relative ${activeTab === 'webdev' ? 'text-brand-primary font-bold' : 'text-brand-secondary hover:text-brand-primary'}`}
                >
                    <div className="flex items-center gap-2"><LayoutTemplate size={16} /> Web Projects</div>
                    {activeTab === 'webdev' && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-primary rounded-t-md shadow-[0_0_8px_rgba(var(--brand-primary-rgb),0.8)]" />}
                </button>
            </div>

            <div className="animate-fade-in mt-6">
                {/* Render AI Paragraph */}
                {renderAiAnalysisBox()}

                {/* Mapped Actionable Cards */}
                {activeRecs.length === 0 ? (
                    <div className="retro-panel p-12 text-center border-brand-primary/20 bg-brand-bg/50">
                        <FolderGit2 className="w-16 h-16 mx-auto text-brand-secondary/30 mb-4" />
                        <h3 className="text-brand-secondary font-mono tracking-widest uppercase mb-2">No Active Targets</h3>
                        <p className="text-sm text-brand-secondary/60 font-mono">
                            The engine is hunting for optimal pathing. Please wait.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {activeRecs.map((q, i) => (
                            <a
                                key={i}
                                href={q.content?.link || q.link || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className={`retro-panel p-5 block group transition-all duration-300 relative overflow-hidden ${activeTab === 'dsa' ? 'border-brand-accent/20 hover:border-brand-accent bg-brand-bg/40' :
                                    activeTab === 'opensource' ? 'border-green-500/20 hover:border-green-500 bg-brand-bg/40' :
                                        'border-brand-primary/20 hover:border-brand-primary bg-brand-bg/40'
                                    }`}
                            >
                                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                                    <ExternalLink size={16} className={activeTab === 'dsa' ? 'text-brand-accent' : activeTab === 'opensource' ? 'text-green-500' : 'text-brand-primary'} />
                                </div>

                                <div className="flex items-center gap-2 mb-3">
                                    {activeTab === 'dsa' && q.link?.includes('leetcode') && <Code2 size={16} className="text-orange-400" />}
                                    {activeTab === 'dsa' && !q.link?.includes('leetcode') && <Zap size={16} className="text-brand-accent" />}
                                    {activeTab === 'opensource' && <Github size={16} className="text-green-400" />}
                                    {activeTab === 'webdev' && <LayoutTemplate size={16} className="text-brand-primary" />}

                                    <span className="text-[10px] font-mono uppercase tracking-widest text-brand-secondary line-clamp-1">
                                        {q.content?.topic || q.topic || 'Target Area'}
                                    </span>
                                </div>

                                <h4 className={`font-bold font-mono text-sm leading-snug mb-3 transition-colors ${activeTab === 'dsa' ? 'text-brand-primary group-hover:text-brand-accent' :
                                    activeTab === 'opensource' ? 'text-green-500 group-hover:text-green-400' :
                                        'text-brand-accent group-hover:text-brand-primary'
                                    }`}>
                                    {q.content?.title || q.title}
                                </h4>

                                <p className="text-brand-secondary/80 text-xs mb-4 line-clamp-3 leading-relaxed">
                                    {q.content?.description || q.description}
                                </p>

                                <div className="flex items-center gap-2 mt-auto">
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${q.content?.difficulty === 'Hard' || q.difficulty === 'Hard' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                                        q.content?.difficulty === 'Medium' || q.difficulty === 'Medium' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                                            q.content?.difficulty === 'Easy' || q.difficulty === 'Easy' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                                                'text-brand-secondary bg-brand-primary/5 border-brand-border/30'
                                        }`}>
                                        {q.content?.difficulty || q.difficulty || 'Normal'}
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
