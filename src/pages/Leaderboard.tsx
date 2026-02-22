import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getSupabaseClient } from '../backend/supabaseClient';
import { Trophy, Medal, Search, Activity, Flame } from 'lucide-react';

export const Leaderboard: React.FC = () => {
    const { user } = useAuth();
    const [players, setPlayers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        let mounted = true;
        const fetchLeaderboard = async () => {
            setIsLoading(true);
            const supabase = await getSupabaseClient();
            if (!supabase) return;

            const { data } = await supabase
                .from('profiles')
                .select('id, username, skill_score, problems_solved, cf_rating')
                .order('skill_score', { ascending: false })
                .limit(100);

            if (mounted && data) {
                // Assign apparent rank
                const rankedData = data.map((p: any, index: number) => ({
                    ...p,
                    rank: index + 1
                }));
                setPlayers(rankedData);
            }
            if (mounted) setIsLoading(false);
        };

        fetchLeaderboard();

        // Supabase Realtime for live leaderboard updates
        getSupabaseClient().then(supabase => {
            if (!supabase) return;
            const sub = supabase.channel('leaderboard-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload: any) => {
                    fetchLeaderboard();
                }).subscribe();
            return () => { supabase.removeChannel(sub); };
        });

        return () => { mounted = false; };
    }, []);

    const filteredPlayers = players.filter(p => p.username.toLowerCase().includes(searchQuery.toLowerCase()));
    const myPlayer = players.find(p => p.id === user?.id);

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-8 border-b border-brand-border pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-bold retro-text tracking-widest uppercase mb-2 flex items-center gap-3">
                        <Trophy className="text-brand-accent" size={32} /> Elite Rankings
                    </h2>
                    <p className="retro-text-sub">Global telemetry of the top DevTrack operatives.</p>
                </div>
            </header>

            {myPlayer && (
                <div className="retro-panel p-6 border-brand-accent/30 bg-brand-accent/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-brand-accent/20 flex items-center justify-center border border-brand-accent/50 text-brand-accent font-bold text-xl font-mono">
                            #{myPlayer.rank}
                        </div>
                        <div>
                            <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-1">Your Current Position</h3>
                            <div className="text-xl font-bold font-mono text-brand-primary">Top {Math.ceil(myPlayer.rank / 10) * 10}% Tier</div>
                        </div>
                    </div>
                </div>
            )}

            <div className="retro-panel overflow-hidden">
                <div className="p-4 border-b border-brand-border flex items-center gap-3 bg-brand-bg/50">
                    <Search size={18} className="text-brand-secondary" />
                    <input
                        type="text"
                        placeholder="Search Operative..."
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
                                    <td colSpan={5} className="px-6 py-12 text-center text-brand-secondary">No operatives found.</td>
                                </tr>
                            ) : (
                                filteredPlayers.map((p) => (
                                    <tr
                                        key={p.id}
                                        className={`transition-colors hover:bg-brand-primary/5 ${p.id === user?.id ? 'bg-brand-primary/10 border-l-2 border-brand-primary' : ''}`}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {p.rank === 1 ? <Medal size={18} className="text-yellow-400" /> :
                                                    p.rank === 2 ? <Medal size={18} className="text-gray-300" /> :
                                                        p.rank === 3 ? <Medal size={18} className="text-amber-600" /> :
                                                            <span className="w-[18px] text-center text-brand-secondary">#{p.rank}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-brand-primary flex items-center gap-2">
                                            {p.username}
                                            {p.id === user?.id && <span className="text-[10px] text-brand-accent bg-brand-accent/10 px-1 py-0.5 rounded border border-brand-accent/20">YOU</span>}
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
                                            <span className={`px-2 py-0.5 rounded-full text-xs border ${p.cf_rating > 1400 ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10' :
                                                p.cf_rating > 1200 ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                                                    'border-brand-secondary/30 text-brand-secondary bg-brand-secondary/10'
                                                }`}>
                                                {p.cf_rating > 0 ? p.cf_rating : 'Unrated'}
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
