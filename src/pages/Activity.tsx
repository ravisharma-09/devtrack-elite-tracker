import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getSupabaseClient } from '../backend/supabaseClient';
import { syncCodeforcesActivity, syncGitHubActivity, syncLeetCodeActivity } from '../engine/externalActivityEngine';
import { RetroLoader } from '../components/RetroLoader';
import { Activity as ActivityIcon, Code2, GitCommit, ExternalLink, RefreshCw, Github, Zap, Trophy } from 'lucide-react';

interface ActivityItem {
    id: string;
    platform: 'Codeforces' | 'LeetCode' | 'GitHub';
    activity_type: string;
    activity_title: string;
    activity_link?: string;
    activity_timestamp: string;
    metadata?: any;
}

export const ActivityFeed: React.FC = () => {
    const { user } = useAuth();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');

    const fetchActivities = async (triggerSync = false) => {
        if (!user) return;
        const supabase = await getSupabaseClient();
        if (!supabase) return;

        // Read from `external_activity` — the correct table
        const { data } = await supabase
            .from('external_activity')
            .select('*')
            .eq('user_id', user.id)
            .order('activity_timestamp', { ascending: false })
            .limit(60);

        if (data && data.length > 0) {
            setActivities(data);
            setIsLoading(false);
            return;
        }

        // Nothing in DB — auto-trigger sync first time
        if (triggerSync || data?.length === 0) {
            setSyncing(true);
            setSyncMsg('Fetching your activity from CF, LeetCode, GitHub...');
            try {
                const { data: userRow } = await supabase
                    .from('users')
                    .select('codeforces_handle, leetcode_username, github_username')
                    .eq('id', user.id)
                    .single();

                const { cfHandle, lcUsername, ghUsername } = {
                    cfHandle: userRow?.codeforces_handle || '',
                    lcUsername: userRow?.leetcode_username || '',
                    ghUsername: userRow?.github_username || '',
                };

                if (!cfHandle && !lcUsername && !ghUsername) {
                    setSyncMsg('No handles connected. Go to Profile → Platform Connections.');
                    setSyncing(false);
                    setIsLoading(false);
                    return;
                }

                await Promise.all([
                    cfHandle ? syncCodeforcesActivity(user.id, cfHandle) : Promise.resolve(),
                    lcUsername ? syncLeetCodeActivity(user.id, lcUsername) : Promise.resolve(),
                    ghUsername ? syncGitHubActivity(user.id, ghUsername) : Promise.resolve(),
                ]);

                // Refetch
                const { data: fresh } = await supabase
                    .from('external_activity')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('activity_timestamp', { ascending: false })
                    .limit(60);

                setActivities(fresh || []);
                setSyncMsg('');
            } catch (e) {
                console.error('[Activity] Sync failed:', e);
                setSyncMsg('Sync failed. Check your internet connection.');
            } finally {
                setSyncing(false);
                setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!user) return;
        fetchActivities(true);
    }, [user]);

    const handleManualSync = async () => {
        if (syncing || !user) return;
        setSyncing(true);
        setSyncMsg('Syncing...');
        const supabase = await getSupabaseClient();
        if (!supabase) return;
        try {
            const { data: userRow } = await supabase
                .from('users')
                .select('codeforces_handle, leetcode_username, github_username')
                .eq('id', user.id)
                .single();

            await Promise.all([
                userRow?.codeforces_handle ? syncCodeforcesActivity(user.id, userRow.codeforces_handle) : Promise.resolve(),
                userRow?.leetcode_username ? syncLeetCodeActivity(user.id, userRow.leetcode_username) : Promise.resolve(),
                userRow?.github_username ? syncGitHubActivity(user.id, userRow.github_username) : Promise.resolve(),
            ]);

            const { data: fresh } = await supabase
                .from('external_activity')
                .select('*')
                .eq('user_id', user.id)
                .order('activity_timestamp', { ascending: false })
                .limit(60);

            setActivities(fresh || []);
            setSyncMsg('✓ Synced!');
            setTimeout(() => setSyncMsg(''), 3000);
        } catch {
            setSyncMsg('Sync error');
        } finally {
            setSyncing(false);
        }
    };

    const getTimeAgo = (ts: string) => {
        const diff = Date.now() - new Date(ts).getTime();
        const m = Math.floor(diff / 60000);
        const h = Math.floor(m / 60);
        const d = Math.floor(h / 24);
        if (d > 0) return `${d}d ago`;
        if (h > 0) return `${h}h ago`;
        if (m > 0) return `${m}m ago`;
        return 'Just now';
    };

    const getPlatformConfig = (platform: string) => {
        switch (platform) {
            case 'Codeforces': return { icon: <Trophy size={14} />, color: 'text-yellow-400', border: 'border-yellow-400/20', bg: 'bg-yellow-400/5' };
            case 'LeetCode': return { icon: <Code2 size={14} />, color: 'text-orange-400', border: 'border-orange-400/20', bg: 'bg-orange-400/5' };
            case 'GitHub': return { icon: <Github size={14} />, color: 'text-blue-400', border: 'border-blue-400/20', bg: 'bg-blue-400/5' };
            default: return { icon: <ActivityIcon size={14} />, color: 'text-brand-primary', border: 'border-brand-border', bg: 'bg-brand-card/50' };
        }
    };

    const getDifficultyBadge = (metadata: any) => {
        if (!metadata?.rating) return null;
        const r = metadata.rating;
        const diff = r > 1600 ? 'Hard' : r > 1200 ? 'Medium' : 'Easy';
        const cls = r > 1600 ? 'text-red-400 border-red-400/30' : r > 1200 ? 'text-yellow-400 border-yellow-400/30' : 'text-green-400 border-green-400/30';
        return <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${cls}`}>{diff} • {r}</span>;
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <header className="mb-6 border-b border-brand-border pb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-1 flex items-center gap-3">
                        <Zap className="text-brand-accent" /> Unified Activity
                    </h2>
                    <p className="retro-text-sub">Real-time timeline of your external engagements</p>
                </div>
                <button
                    onClick={handleManualSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2 border border-brand-primary/30 text-brand-primary font-mono text-xs rounded hover:bg-brand-primary/10 transition-colors disabled:opacity-40"
                >
                    <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Syncing...' : 'Refresh'}
                </button>
            </header>

            {syncMsg && (
                <div className="retro-panel p-3 border-brand-accent/20 bg-brand-accent/5 text-xs font-mono text-brand-accent">{syncMsg}</div>
            )}

            {isLoading ? (
                <div className="h-64 border border-brand-border/30 bg-brand-bg/50 mt-4 relative">
                    <RetroLoader title="Accessing Telemetry" subtitle="Scanning external activity feeds..." />
                </div>
            ) : activities.length === 0 ? (
                <div className="retro-panel p-12 text-center border-brand-border/30">
                    <Github className="w-12 h-12 mx-auto text-brand-secondary/30 mb-4" />
                    <h3 className="text-brand-secondary font-mono uppercase tracking-widest mb-2">No Activity Found</h3>
                    <p className="text-xs text-brand-secondary/50 font-mono mb-4">
                        Connect your Codeforces, LeetCode, or GitHub handle in Profile first.
                    </p>
                    <a href="/profile" className="inline-flex items-center gap-2 px-4 py-2 border border-brand-primary/30 text-brand-primary font-mono text-xs rounded hover:bg-brand-primary/10 transition-colors">
                        Go to Profile →
                    </a>
                </div>
            ) : (
                <div className="space-y-2">
                    {/* Platform summary bar */}
                    <div className="flex gap-4 mb-4">
                        {(['Codeforces', 'LeetCode', 'GitHub'] as const).map(p => {
                            const count = activities.filter(a => a.platform === p).length;
                            const cfg = getPlatformConfig(p);
                            if (count === 0) return null;
                            return (
                                <div key={p} className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono ${cfg.color} ${cfg.border} ${cfg.bg}`}>
                                    {cfg.icon} {p}: {count} events
                                </div>
                            );
                        })}
                    </div>

                    {/* Activity timeline */}
                    <div className="relative">
                        <div className="absolute left-6 top-0 bottom-0 w-px bg-brand-border/30" />
                        <div className="space-y-2">
                            {activities.map((act, i) => {
                                const cfg = getPlatformConfig(act.platform);
                                return (
                                    <div key={act.id || i} className="relative pl-14">
                                        <div className={`absolute left-4 top-4 w-4 h-4 rounded-full border-2 flex items-center justify-center border-brand-bg ${cfg.color} bg-brand-bg`}
                                            style={{ fontSize: '9px' }}>
                                            {cfg.icon}
                                        </div>
                                        <div className={`retro-panel p-4 border transition-colors group ${cfg.border} hover:brightness-110`}>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${cfg.color}`}>{act.platform}</span>
                                                        {getDifficultyBadge(act.metadata)}
                                                        {act.metadata?.tags?.slice(0, 2).map((t: string) => (
                                                            <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-brand-border/30 text-brand-secondary/60">{t}</span>
                                                        ))}
                                                    </div>
                                                    <p className="text-sm font-mono text-brand-primary font-medium truncate">{act.activity_title}</p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className="text-[10px] font-mono text-brand-secondary/50 whitespace-nowrap">{getTimeAgo(act.activity_timestamp)}</span>
                                                    {act.activity_link && (
                                                        <a href={act.activity_link} target="_blank" rel="noreferrer"
                                                            className="text-brand-secondary/30 hover:text-brand-primary transition-colors">
                                                            <ExternalLink size={12} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
