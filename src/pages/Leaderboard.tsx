import React, { useEffect, useState } from 'react';
import { fetchLeaderboard, type LeaderboardUser } from '../engine/leaderboardEngine';
import { Trophy, Medal, Search, Activity, Flame } from 'lucide-react';

export const Leaderboard: React.FC = () => {
    // In DevTrack, useAuth gives user. Let's import it directly or assume it's loaded higher up.
    // Actually, let's fetch from localStorage or use dummy ID if not found for now.
    const userId = localStorage.getItem('supabase.auth.token')
        ? JSON.parse(localStorage.getItem('supabase.auth.token') || '{}')?.currentSession?.user?.id
        : null;

    const [players, setPlayers] = useState<LeaderboardUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [myRank, setMyRank] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'global' | 'batch'>('global');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setIsLoading(true);
        // Determine batch if needed. We will use a dummy 'Newton School' or fetch from user metadata
        const batchQuery = activeTab === 'batch' ? 'Newton School' : undefined;

        fetchLeaderboard(100, batchQuery)
            .then(data => setPlayers(data))
            .finally(() => setIsLoading(false));

    }, [activeTab]);

    useEffect(() => {
        // Find my rank if skill is known (rough estimate from top 100 or global query)
        const myPlayer = players.find(p => p.user_id === userId);
        if (myPlayer) {
            setMyRank(myPlayer.rank || null);
        } else {
            // Need a real skill score to fetch from DB if outside top 100
            // Since we compute it natively in Dashboard, we could cache it, or just leave it blank
            setMyRank(null);
        }
    }, [players, userId]);

    const filteredPlayers = players.filter(p => p.username.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-8 border-b border-brand-border pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold retro-text tracking-widest uppercase mb-2 flex items-center gap-3">
                        <Trophy className="text-brand-accent" size={32} /> Elite Rankings
                    </h2>
                    <p className="retro-text-sub">Global telemetry of the top DevTrack operatives.</p>
                </div>

                <div className="flex bg-brand-bg border border-brand-border rounded p-1">
                    <button
                        onClick={() => setActiveTab('global')}
                        className={`px-4 py-2 text-xs font-mono uppercase tracking-widest rounded transition-colors ${activeTab === 'global' ? 'bg-brand-primary text-brand-bg font-bold' : 'text-brand-secondary hover:text-brand-primary'
                            }`}
                    >
                        Global
                    </button>
                    <button
                        onClick={() => setActiveTab('batch')}
                        className={`px-4 py-2 text-xs font-mono uppercase tracking-widest rounded transition-colors ${activeTab === 'batch' ? 'bg-brand-primary text-brand-bg font-bold' : 'text-brand-secondary hover:text-brand-primary'
                            }`}
                    >
                        My Batch
                    </button>
                </div>
            </header>

            {myRank && (
                <div className="retro-panel p-6 border-brand-accent/30 bg-brand-accent/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-brand-accent/20 flex items-center justify-center border border-brand-accent/50 text-brand-accent font-bold text-xl font-mono">
                            #{myRank}
                        </div>
                        <div>
                            <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-1">Your Current Position</h3>
                            <div className="text-xl font-bold font-mono text-brand-primary">Top {Math.ceil(myRank / 10) * 10}% Tier</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="retro-panel overflow-hidden">
                <div className="p-4 border-b border-brand-border flex items-center gap-3 bg-brand-bg/50">
                    <Search size={18} className="text-brand-secondary" />
                    <input
                        type="text"
                        placeholder="Search Operative Command..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none text-brand-primary font-mono text-sm focus:outline-none w-full placeholder-brand-secondary/50"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-sm">
                        <thead className="bg-brand-bg/80 border-b border-brand-border text-brand-secondary text-xs uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-4 font-normal">Rank</th>
                                <th className="px-6 py-4 font-normal">Operative</th>
                                <th className="px-6 py-4 font-normal text-right tracking-widest text-brand-accent">Skill Score</th>
                                <th className="px-6 py-4 font-normal text-center">Problems</th>
                                <th className="px-6 py-4 font-normal text-center">CF Rating</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/30">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-brand-secondary/50">
                                        <Activity className="mx-auto block mb-2 animate-pulse" />
                                        Syncing Global Network...
                                    </td>
                                </tr>
                            ) : filteredPlayers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-brand-secondary">No operatives found in this sector.</td>
                                </tr>
                            ) : (
                                filteredPlayers.map((p) => (
                                    <tr
                                        key={p.id}
                                        className={`transition-colors hover:bg-brand-primary/5 ${p.user_id === userId ? 'bg-brand-primary/10 border-l-2 border-brand-primary' : ''}`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {p.rank === 1 ? <Medal size={18} className="text-yellow-400" /> :
                                                    p.rank === 2 ? <Medal size={18} className="text-gray-300" /> :
                                                        p.rank === 3 ? <Medal size={18} className="text-amber-600" /> :
                                                            <span className="w-[18px] text-center text-brand-secondary">#{p.rank}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-brand-primary">
                                            {p.username}
                                            {p.user_id === userId && <span className="ml-2 text-[10px] text-brand-accent bg-brand-accent/10 px-1 py-0.5 rounded border border-brand-accent/20">YOU</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-brand-accent font-bold text-lg flex items-center justify-end gap-1">
                                                <Flame size={14} /> {p.skill_score}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-brand-secondary">
                                            {p.problems_solved}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-xs border ${p.codeforces_rating > 1400 ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10' :
                                                p.codeforces_rating > 1200 ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                                                    'border-brand-secondary/30 text-brand-secondary bg-brand-secondary/10'
                                                }`}>
                                                {p.codeforces_rating > 0 ? p.codeforces_rating : 'Unrated'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
