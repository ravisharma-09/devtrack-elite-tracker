import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useStore } from '../engine/learningStore';
import { getUserProfile, updateUserName } from '../auth/authService';
import { calculatePlayerLevel } from '../data/statisticsData';
import { calculateConsistencyScore } from '../engine/consistencyEngine';
import { loadUserHandles, saveUserHandles, syncExternalStats } from '../engine/externalSyncEngine';
import { Mail, Calendar, Edit3, Check, LogOut, Shield, RefreshCw, Code2, Github, Trophy } from 'lucide-react';

export const Profile: React.FC = () => {
    const { user, logout } = useAuth();
    const { statistics, activityHistory, roadmap, externalStats, setExternalStats } = useStore();
    const [name, setName] = useState(user?.name || 'Dev');
    const [editingName, setEditingName] = useState(false);
    const [savingName, setSavingName] = useState(false);
    const [joinDate, setJoinDate] = useState('');

    // Platform handles
    const [cfHandle, setCfHandle] = useState('');
    const [lcUsername, setLcUsername] = useState('');
    const [ghUsername, setGhUsername] = useState('');
    const [savingHandles, setSavingHandles] = useState(false);
    const [savedHandles, setSavedHandles] = useState({ cf: '', lc: '', gh: '' });
    const [syncing, setSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');

    useEffect(() => {
        if (!user?.id) return;
        getUserProfile(user.id).then(profile => {
            if (profile?.name) setName(profile.name);
            if (profile?.created_at) {
                setJoinDate(new Date(profile.created_at).toLocaleDateString('en', {
                    day: 'numeric', month: 'long', year: 'numeric'
                }));
            }
        }).catch(() => { });

        loadUserHandles(user.id).then(h => {
            setCfHandle(h.codeforces_handle || '');
            setLcUsername(h.leetcode_username || '');
            setGhUsername(h.github_username || '');
            setSavedHandles({
                cf: h.codeforces_handle || '',
                lc: h.leetcode_username || '',
                gh: h.github_username || ''
            });
        }).catch(() => { });
    }, [user?.id]);

    const saveName = async () => {
        if (!user?.id || !name.trim()) return;
        setSavingName(true);
        try { await updateUserName(user.id, name.trim()); }
        catch { } finally { setSavingName(false); setEditingName(false); }
    };

    const saveHandles = async () => {
        if (!user?.id) return;
        setSavingHandles(true);
        setSyncMsg('');
        const handles = {
            codeforces_handle: cfHandle.trim(),
            leetcode_username: lcUsername.trim(),
            github_username: ghUsername.trim(),
        };
        if (!handles.codeforces_handle && !handles.leetcode_username && !handles.github_username) {
            setSyncMsg('Enter at least one handle first.');
            setSavingHandles(false); return;
        }
        try {
            setSyncMsg('Saving handles...');
            const saved = await saveUserHandles(user.id, handles);
            setSyncMsg(saved ? 'Saved to Supabase ✓ — fetching stats...' : 'Could not save to DB (schema not applied?), fetching anyway...');
            setSavedHandles({
                cf: handles.codeforces_handle,
                lc: handles.leetcode_username,
                gh: handles.github_username
            });
            setSyncing(true);
            const result = await syncExternalStats(user.id, true, handles);
            setExternalStats(result);

            // Mark connection status persistently
            const supabase = await (await import('../backend/supabaseClient')).getSupabaseClient();
            if (supabase) {
                try {
                    await supabase.from('users').update({
                        cf_connected: !!result.cf,
                        lc_connected: !!result.lc,
                        gh_connected: !!result.gh,
                        ...(((result.cf as any)?.weakTopics) ? { weak_topics: (result.cf as any).weakTopics } : {}),
                    }).eq('id', user.id);
                } catch { /* non-critical — column may not exist yet */ }
            }

            if (result.cf || result.lc || result.gh) {
                setSyncMsg(`✓ Done! ${[result.cf && 'CF', result.lc && 'LC', result.gh && 'GH'].filter(Boolean).join(', ')} synced and connected permanently.`);
            } else {
                setSyncMsg('⚠ Fetched but got no data. Check handles are correct + open DevTools console for details.');
            }
        } catch (e: any) {
            setSyncMsg(`Error: ${e?.message || 'Unknown error'}. Check DevTools console.`);
        } finally {
            setSavingHandles(false); setSyncing(false);
        }
    };

    const forceSync = async () => {
        if (!user?.id || syncing) return;
        setSyncing(true); setSyncMsg('Syncing...');
        try {
            const result = await syncExternalStats(user.id, true);
            setExternalStats(result); // Instantly updates global store & UI

            if (result.cf || result.lc || result.gh) {
                setSyncMsg(`✓ Synced! Check Statistics page.`);
            } else {
                setSyncMsg('⚠ No data returned. Verify handles in Profile and check DevTools console.');
            }
        } catch (e: any) {
            setSyncMsg(`Sync error: ${e?.message || 'Unknown'}. Check DevTools console.`);
        } finally { setSyncing(false); }
    };

    // Stats
    const totalTopics = roadmap.reduce((a, c) => a + c.topics.length, 0);
    const completedTopics = roadmap.reduce((a, c) => a + c.topics.filter(t => t.completed).length, 0);
    const roadmapPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    const level = calculatePlayerLevel(roadmapPct);
    const consistency = calculateConsistencyScore(activityHistory);
    const formatH = (m: number) => m >= 60 ? `${(m / 60).toFixed(1)}h` : `${m}m`;

    return (
        <div className="space-y-8 animate-fade-in pb-12 max-w-2xl">
            <header className="mb-8 border-b border-brand-border pb-4">
                <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2">User Profile</h2>
                <p className="retro-text-sub">Your account, platform handles, and learning identity</p>
            </header>

            {/* Profile Card */}
            <div className="retro-panel p-8 border-brand-primary/20 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-primary/40 to-transparent" />
                <div className="flex items-start gap-6">
                    <div className="w-20 h-20 rounded-xl bg-brand-primary/10 border-2 border-brand-primary/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-3xl font-bold text-brand-primary font-mono">{name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            {editingName ? (
                                <input autoFocus value={name} onChange={e => setName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                                    className="bg-brand-bg border border-brand-primary text-brand-primary font-mono font-bold text-xl px-2 py-1 rounded focus:outline-none" />
                            ) : (
                                <h3 className="text-2xl font-bold font-mono text-brand-primary">{name}</h3>
                            )}
                            {editingName ? (
                                <button onClick={saveName} disabled={savingName} className="text-brand-primary hover:text-brand-accent transition-colors disabled:opacity-50"><Check size={18} /></button>
                            ) : (
                                <button onClick={() => setEditingName(true)} className="text-brand-secondary hover:text-brand-primary transition-colors"><Edit3 size={15} /></button>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm font-mono text-brand-secondary"><Mail size={14} /><span>{user?.email}</span></div>
                            {joinDate && (<div className="flex items-center gap-2 text-sm font-mono text-brand-secondary"><Calendar size={14} /><span>Joined {joinDate}</span></div>)}
                            <div className="flex items-center gap-2 text-sm font-mono text-brand-secondary"><Shield size={14} /><span>Supabase Auth · All data encrypted</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Platform Handles */}
            <div className="retro-panel p-6 border-brand-accent/20">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="text-sm font-mono uppercase text-brand-accent tracking-widest">Platform Connections</h3>
                    <button onClick={forceSync} disabled={syncing}
                        className="flex items-center gap-1.5 text-xs font-mono text-brand-secondary hover:text-brand-primary transition-colors disabled:opacity-40">
                        <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Syncing...' : 'Refresh Stats'}
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Codeforces */}
                    <div className="space-y-1">
                        <label className="flex items-center justify-between text-xs font-mono text-brand-secondary uppercase tracking-widest">
                            <span className="flex items-center gap-2"><Trophy size={15} className="text-yellow-400" /> Codeforces Handle</span>
                            {savedHandles.cf
                                ? <span className="text-green-400 flex items-center gap-1"><Check size={12} /> Connected</span>
                                : cfHandle.trim() && <span className="text-red-400/70 text-[10px] flex items-center gap-1">⚠ Not saved — click Connect</span>
                            }
                        </label>
                        <div className="flex gap-2">
                            <input value={cfHandle} onChange={e => setCfHandle(e.target.value)} placeholder="tourist"
                                className="flex-1 bg-brand-bg border border-brand-border text-brand-primary font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-brand-primary/60 placeholder:text-brand-secondary/30" />
                            {cfHandle === savedHandles.cf && savedHandles.cf !== '' ? (
                                <button onClick={() => forceSync()} disabled={syncing}
                                    className="px-6 bg-brand-primary/10 border border-brand-primary/40 text-brand-primary font-mono text-sm rounded hover:bg-brand-primary/20 transition-colors disabled:opacity-50 uppercase">Sync</button>
                            ) : (
                                <button onClick={() => saveHandles()} disabled={savingHandles || syncing}
                                    className="px-4 bg-brand-primary/10 border border-brand-primary/40 text-brand-primary font-mono text-sm rounded hover:bg-brand-primary/20 transition-colors disabled:opacity-50 uppercase">Connect</button>
                            )}
                        </div>
                        {savedHandles.cf
                            ? <div className="text-xs font-mono text-brand-primary/80 mt-1 ml-1">
                                {externalStats?.cf ? `${externalStats.cf.rating} Rating · ${externalStats.cf.rank} · ${externalStats.cf.problemsSolved} Solved` : 'Connected. Awaiting stats sync...'}
                            </div>
                            : cfHandle.trim() && <div className="text-xs font-mono text-brand-secondary/50 mt-1 ml-1">
                                Handle typed. Click Connect to verify and fetch rating.
                            </div>
                        }
                    </div>

                    {/* LeetCode */}
                    <div className="space-y-1">
                        <label className="flex items-center justify-between text-xs font-mono text-brand-secondary uppercase tracking-widest">
                            <span className="flex items-center gap-2"><Code2 size={15} className="text-orange-400" /> LeetCode Username</span>
                            {savedHandles.lc
                                ? <span className="text-green-400 flex items-center gap-1"><Check size={12} /> Connected</span>
                                : lcUsername.trim() && <span className="text-red-400/70 text-[10px] flex items-center gap-1">⚠ Not saved — click Connect</span>
                            }
                        </label>
                        <div className="flex gap-2">
                            <input value={lcUsername} onChange={e => setLcUsername(e.target.value)} placeholder="neal_wu"
                                className="flex-1 bg-brand-bg border border-brand-border text-brand-primary font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-brand-primary/60 placeholder:text-brand-secondary/30" />
                            {lcUsername === savedHandles.lc && savedHandles.lc !== '' ? (
                                <button onClick={() => forceSync()} disabled={syncing}
                                    className="px-6 bg-brand-primary/10 border border-brand-primary/40 text-brand-primary font-mono text-sm rounded hover:bg-brand-primary/20 transition-colors disabled:opacity-50 uppercase">Sync</button>
                            ) : (
                                <button onClick={() => saveHandles()} disabled={savingHandles || syncing}
                                    className="px-4 bg-brand-primary/10 border border-brand-primary/40 text-brand-primary font-mono text-sm rounded hover:bg-brand-primary/20 transition-colors disabled:opacity-50 uppercase">Connect</button>
                            )}
                        </div>
                        {savedHandles.lc ? (
                            <div className="text-xs font-mono text-brand-primary/80 mt-1 ml-1">
                                {externalStats?.lc ? (
                                    <>
                                        {externalStats.lc.totalSolved} Solved
                                        {externalStats.lc.easySolved > 0 && <> · Easy {externalStats.lc.easySolved} · Med {externalStats.lc.mediumSolved} · Hard {externalStats.lc.hardSolved}</>}
                                        {externalStats.lc.ranking > 0 && <> · Rank #{externalStats.lc.ranking.toLocaleString()}</>}
                                    </>
                                ) : 'Connected. Awaiting stats sync...'}
                            </div>
                        ) : lcUsername.trim() && (
                            <div className="text-xs font-mono text-brand-secondary/50 mt-1 ml-1">
                                Handle typed. Click Connect to verify and fetch rating.
                            </div>
                        )}
                    </div>

                    {/* GitHub */}
                    <div className="space-y-1">
                        <label className="flex items-center justify-between text-xs font-mono text-brand-secondary uppercase tracking-widest">
                            <span className="flex items-center gap-2"><Github size={15} className="text-blue-400" /> GitHub Username</span>
                            {savedHandles.gh
                                ? <span className="text-green-400 flex items-center gap-1"><Check size={12} /> Connected</span>
                                : ghUsername.trim() && <span className="text-red-400/70 text-[10px] flex items-center gap-1">⚠ Not saved — click Connect</span>
                            }
                        </label>
                        <div className="flex gap-2">
                            <input value={ghUsername} onChange={e => setGhUsername(e.target.value)} placeholder="torvalds"
                                className="flex-1 bg-brand-bg border border-brand-border text-brand-primary font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-brand-primary/60 placeholder:text-brand-secondary/30" />
                            {ghUsername === savedHandles.gh && savedHandles.gh !== '' ? (
                                <button onClick={() => forceSync()} disabled={syncing}
                                    className="px-6 bg-brand-primary/10 border border-brand-primary/40 text-brand-primary font-mono text-sm rounded hover:bg-brand-primary/20 transition-colors disabled:opacity-50 uppercase">Sync</button>
                            ) : (
                                <button onClick={() => saveHandles()} disabled={savingHandles || syncing}
                                    className="px-4 bg-brand-primary/10 border border-brand-primary/40 text-brand-primary font-mono text-sm rounded hover:bg-brand-primary/20 transition-colors disabled:opacity-50 uppercase">Connect</button>
                            )}
                        </div>
                        {savedHandles.gh ? (
                            <div className="text-xs font-mono text-brand-primary/80 mt-1 ml-1">
                                {externalStats?.gh ? (
                                    <>
                                        {externalStats.gh.publicRepos} Repos
                                        {externalStats.gh.totalCommitsEstimate > 0
                                            ? <> · {externalStats.gh.totalCommitsEstimate} Commits (90d)</>
                                            : externalStats.gh.lastMonthCommits > 0
                                                ? <> · {externalStats.gh.lastMonthCommits} Commits (30d)</>
                                                : <> · No recent public commits</>}
                                        {externalStats.gh.followers > 0 && <> · {externalStats.gh.followers} Followers</>}
                                    </>
                                ) : 'Connected. Awaiting stats sync...'}
                            </div>
                        ) : ghUsername.trim() && (
                            <div className="text-xs font-mono text-brand-secondary/50 mt-1 ml-1">
                                Handle typed. Click Connect to verify and fetch rating.
                            </div>
                        )}
                    </div>

                    {syncMsg && (
                        <div className={`text-xs font-mono mt-4 pt-3 border-t border-brand-border ${syncMsg.includes('✓') || syncMsg.includes('Saved') ? 'text-brand-primary' : 'text-brand-accent'}`}>
                            {syncMsg}
                        </div>
                    )}
                </div>
            </div>

            {/* Learning Summary */}
            <div className="retro-panel p-6">
                <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-5">Learning Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Rank', value: level },
                        { label: 'Study Time', value: formatH(statistics.totalStudyMinutes) },
                        { label: 'Sessions', value: statistics.totalStudySessions.toString() },
                        { label: 'Consistency', value: `${consistency}%` },
                        { label: 'Streak', value: `${statistics.studyStreakDays}d` },
                        { label: 'Topics Done', value: `${completedTopics}/${totalTopics}` },
                        { label: 'Micro-Tasks', value: `${statistics.totalMicroTasksCompleted || 0}` },
                        { label: 'Roadmap', value: `${roadmapPct}%` },
                    ].map(s => (
                        <div key={s.label} className="flex flex-col">
                            <span className="text-xs font-mono text-brand-secondary uppercase tracking-widest">{s.label}</span>
                            <span className="text-lg font-bold font-mono text-brand-primary mt-0.5">{s.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Logout */}
            <button onClick={logout}
                className="flex items-center gap-2 border border-red-500/40 text-red-400 px-5 py-2.5 rounded font-mono uppercase tracking-widest hover:bg-red-500/10 transition-colors">
                <LogOut size={16} /> Logout
            </button>
        </div>
    );
};
