import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getSupabaseClient } from '../backend/supabaseClient';
import { Activity as ActivityIcon, Code2, GitCommit, Zap, ExternalLink, BookOpen } from 'lucide-react';

export const ActivityFeed: React.FC = () => {
    const { user } = useAuth();
    const [activities, setActivities] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        let mounted = true;

        const fetchActivities = async () => {
            setIsLoading(true);
            const supabase = await getSupabaseClient();
            if (!supabase) return;

            const { data } = await supabase
                .from('activities')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            let renderData = data || [];
            if (mounted && renderData.length === 0) {
                console.log("⚠️ Activity array empty. Forcing background syncEngine run...");
                const { syncEngine } = await import('../core/syncEngine');
                await syncEngine(user.id);
                // Refetch after forceful sync
                const { data: updatedData } = await supabase
                    .from('activities')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(50);
                renderData = updatedData || [];
            }

            if (mounted) {
                setActivities(renderData);
                setIsLoading(false);
            }
        };

        fetchActivities();

        getSupabaseClient().then(supabase => {
            if (!supabase) return;
            const activitiesSubscription = supabase
                .channel('public:activities')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'activities', filter: `user_id=eq.${user.id}` }, () => {
                    fetchActivities(); // Refresh feed completely on change
                })
                .subscribe();
            return () => { supabase.removeChannel(activitiesSubscription); };
        });

        return () => { mounted = false; };
    }, [user]);

    const getTimeAgo = (timestamp: string) => {
        const diff = Date.now() - new Date(timestamp).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    };

    const getPlatformIcon = (source: string) => {
        switch (source) {
            case 'leetcode': return <Code2 size={14} />;
            case 'codeforces': return <ActivityIcon size={14} />;
            case 'github': return <GitCommit size={14} />;
            default: return <BookOpen size={14} />;
        }
    };

    const getPlatformColor = (source: string) => {
        switch (source) {
            case 'leetcode': return 'bg-orange-500/20 text-orange-400 border border-orange-500/50';
            case 'codeforces': return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50';
            case 'github': return 'bg-brand-secondary/20 text-brand-secondary border border-brand-secondary/50';
            default: return 'bg-green-500/20 text-green-400 border border-green-500/50';
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-8 border-b border-brand-border pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold retro-text tracking-widest uppercase mb-2 flex items-center gap-3">
                        <ActivityIcon className="text-brand-accent" size={32} /> Unified Activity
                    </h2>
                    <p className="retro-text-sub">Real-time timeline of your external engagements.</p>
                </div>
            </header>

            <div className="retro-panel pt-4 pb-0 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center text-brand-secondary/50">
                        <ActivityIcon className="mx-auto block mb-4 animate-pulse" size={32} />
                        <span className="font-mono tracking-widest uppercase">Fetching Time-Stream...</span>
                    </div>
                ) : activities.length === 0 ? (
                    <div className="p-12 text-center text-brand-secondary flex flex-col items-center">
                        <p className="font-mono text-sm mb-4">No external activity detected.</p>
                        <button
                            onClick={async () => {
                                if (!user) return;
                                setIsLoading(true);
                                const { syncEngine } = await import('../core/syncEngine');
                                await syncEngine(user.id);
                                window.location.reload();
                            }}
                            className="px-4 py-2 bg-brand-accent/10 border border-brand-accent/50 text-brand-accent hover:bg-brand-accent hover:text-brand-bg transition-colors font-mono text-xs uppercase"
                        >
                            Run Sync Engine
                        </button>
                    </div>
                ) : (
                    <div className="relative border-l border-brand-border/30 ml-6 mb-6 mt-4">
                        {activities.map((act) => (
                            <div key={act.id} className="mb-8 ml-6 relative group">
                                <span className={`absolute flex items-center justify-center w-8 h-8 rounded-full -left-10 ring-4 ring-brand-bg
                                    ${getPlatformColor(act.source)}`}>
                                    {getPlatformIcon(act.source)}
                                </span>

                                <div className="p-4 border border-brand-border/20 rounded bg-brand-bg/30 hover:bg-brand-primary/5 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono uppercase tracking-widest text-brand-secondary">
                                                {act.source}
                                            </span>
                                            <span className="text-brand-primary font-bold font-mono text-sm">
                                                {act.type === 'solve' && `Solved ${act.metadata?.title || 'a problem'}`}
                                                {act.type === 'commit' && `Committed to ${act.metadata?.repo || 'a repository'}`}
                                                {act.type === 'study' && `Studied ${act.metadata?.topic || 'a topic'}`}
                                                {act.type === 'contest' && `Participated in contest`}
                                            </span>
                                        </div>
                                        {act.metadata?.url && (
                                            <a href={act.metadata.url} target="_blank" rel="noreferrer" className="text-brand-secondary hover:text-brand-primary transition-colors">
                                                <ExternalLink size={14} />
                                            </a>
                                        )}
                                    </div>
                                    <div className="text-xs font-mono text-brand-secondary/50 mt-2 flex items-center gap-2">
                                        <Zap size={10} className="text-brand-accent" />
                                        {getTimeAgo(act.created_at)}
                                        <span className="mx-1">•</span>
                                        <span>{new Date(act.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
