import React, { useEffect, useState } from 'react';
import { fetchUnifiedActivityFeed, type ExternalActivity } from '../engine/externalActivityEngine';
import { useAuth } from '../auth/AuthContext';
import { Activity as ActivityIcon, Code2, GitCommit, Zap, ExternalLink } from 'lucide-react';

export const ActivityFeed: React.FC = () => {
    const { user } = useAuth();
    const [activities, setActivities] = useState<ExternalActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user || user.id === 'local') {
            setIsLoading(false);
            return;
        }

        fetchUnifiedActivityFeed(user.id, 50)
            .then(data => setActivities(data))
            .finally(() => setIsLoading(false));
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
                        <ActivityIcon className="mx-auto block mb-2 animate-pulse" />
                        Fetching Time-Stream...
                    </div>
                ) : activities.length === 0 ? (
                    <div className="p-12 text-center text-brand-secondary">
                        <p className="font-mono text-sm">No external activity detected.</p>
                        <p className="text-xs mt-2 opacity-50">Sync your Codeforces, LeetCode, or GitHub handles in your profile.</p>
                    </div>
                ) : (
                    <div className="relative border-l border-brand-border/30 ml-6 mb-6">
                        {activities.map((act) => (
                            <div key={act.id || Math.random()} className="mb-8 ml-6 relative group">
                                <span className={`absolute flex items-center justify-center w-8 h-8 rounded-full -left-10 ring-4 ring-brand-bg
                                    ${act.platform === 'LeetCode' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' :
                                        act.platform === 'Codeforces' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' :
                                            'bg-brand-secondary/20 text-brand-secondary border border-brand-secondary/50'}`}>
                                    {act.platform === 'LeetCode' ? <Code2 size={14} /> :
                                        act.platform === 'Codeforces' ? <ActivityIcon size={14} /> :
                                            <GitCommit size={14} />}
                                </span>

                                <div className="p-4 border border-brand-border/20 rounded bg-brand-bg/30 hover:bg-brand-primary/5 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono uppercase tracking-widest text-brand-secondary">
                                                {act.platform}
                                            </span>
                                            <span className="text-brand-primary font-bold font-mono text-sm">
                                                {act.activity_title}
                                            </span>
                                        </div>
                                        {act.activity_link && (
                                            <a href={act.activity_link} target="_blank" rel="noreferrer" className="text-brand-secondary hover:text-brand-primary transition-colors">
                                                <ExternalLink size={14} />
                                            </a>
                                        )}
                                    </div>
                                    <div className="text-xs font-mono text-brand-secondary/50 mt-2 flex items-center gap-2">
                                        <Zap size={10} className="text-brand-accent" />
                                        {getTimeAgo(act.activity_timestamp)}
                                        <span className="mx-1">•</span>
                                        <span>{new Date(act.activity_timestamp).toLocaleString()}</span>
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
