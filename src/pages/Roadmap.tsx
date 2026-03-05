import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getSupabaseClient } from '../backend/supabaseClient';
import { Lock, Unlock, Play, Code2, Terminal, Target, BookOpen } from 'lucide-react';
import { RetroLoader } from '../components/RetroLoader';

export const Roadmap: React.FC = () => {
    const { user } = useAuth();
    const [lcSolved, setLcSolved] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            if (!user) return;
            try {
                const supabase = await getSupabaseClient();
                if (!supabase) return;
                const { data } = await supabase.from('external_stats').select('lc').eq('user_id', user.id).single();
                if (data?.lc?.totalSolved) {
                    setLcSolved(data.lc.totalSolved);
                }
            } catch (e) {
                console.error("Failed to load LC stats", e);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, [user]);

    if (loading) return <div className="h-64 mt-8 relative"><RetroLoader title="Loading Roadmap" subtitle="Checking external sync status..." /></div>;

    const phase2Target = 40;
    const phase2Progress = Math.min(lcSolved, phase2Target);
    const phase2Pct = Math.round((phase2Progress / phase2Target) * 100);

    const isPhase2Unlocked = true; // Phase 1 is basic review, so Phase 2 is always open
    const isPhase3Unlocked = lcSolved >= phase2Target;
    const isPhase4Unlocked = lcSolved >= 150; // Arbitrary high number for specialization

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-8 border-b border-brand-border pb-4">
                <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2">SYSTEM ROADMAP</h2>
                <p className="retro-text-sub">SDE Elite Mastery Track — 4-Phase Structured Learning</p>
            </header>

            {/* PHASE 1: Python Foundations */}
            <section className="retro-panel p-6 border-l-4 border-l-blue-500">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Terminal className="text-blue-400" size={24} />
                        <div>
                            <h3 className="text-xl font-bold text-blue-400 uppercase tracking-wide">Phase 1: Python Foundations</h3>
                            <p className="text-xs text-brand-secondary font-mono mt-1">Loops, Lists, Dictionaries, Sets & Basic Recursion.</p>
                        </div>
                    </div>
                    <Unlock className="text-brand-secondary/50" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['Reverse Array', 'Count Frequency', 'Find Duplicates', 'String Basics'].map((topic, i) => (
                        <div key={i} className="bg-brand-bg/40 border border-brand-border/30 rounded p-3 text-center transition-colors hover:border-blue-400">
                            <span className="text-xs font-mono text-brand-primary">{topic}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* PHASE 2: Problem Solving Basics */}
            <section className={`retro-panel p-6 border-l-4 ${isPhase2Unlocked ? 'border-l-green-500' : 'border-l-brand-border/30 opacity-60'}`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Target className={isPhase2Unlocked ? "text-green-400" : "text-brand-secondary"} size={24} />
                        <div>
                            <h3 className={`text-xl font-bold uppercase tracking-wide ${isPhase2Unlocked ? "text-green-400" : "text-brand-secondary"}`}>Phase 2: Problem Solving Basics</h3>
                            <p className="text-xs text-brand-secondary font-mono mt-1">Master the first 40 core problems to build edge-case awareness.</p>
                        </div>
                    </div>
                    {isPhase2Unlocked ? <Unlock className="text-brand-secondary/50" /> : <Lock className="text-brand-secondary/50" />}
                </div>

                <div className="mb-4">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-mono text-brand-secondary uppercase">Progress to unlock Core DSA</span>
                        <span className="text-sm font-mono font-bold text-brand-primary">{phase2Progress} / {phase2Target} Solved</span>
                    </div>
                    <div className="h-2 w-full bg-brand-bg rounded overflow-hidden border border-brand-border/30">
                        <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${phase2Pct}%` }} />
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 opacity-80">
                    {['Array Traversal', 'Simple Math', 'Hashing Basics', 'Simple Binary Search'].map((topic, i) => (
                        <div key={i} className="bg-brand-bg/40 border border-brand-border/30 rounded p-3 text-center">
                            <span className="text-xs font-mono text-brand-secondary">{topic}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* PHASE 3: Core DSA Roadmap */}
            <section className={`retro-panel p-6 border-l-4 ${isPhase3Unlocked ? 'border-l-brand-accent' : 'border-l-brand-border/30 opacity-60'}`}>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                    <div className="flex items-center gap-3">
                        <BookOpen className={isPhase3Unlocked ? "text-brand-accent" : "text-brand-secondary"} size={24} />
                        <div>
                            <h3 className={`text-xl font-bold uppercase tracking-wide ${isPhase3Unlocked ? "text-brand-accent" : "text-brand-secondary"}`}>Phase 3: Core DSA Roadmap</h3>
                            <p className="text-xs text-brand-secondary font-mono mt-1">Pattern-based progression for intermediate mastery.</p>
                        </div>
                    </div>
                    {!isPhase3Unlocked ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-bg border border-brand-border/50 rounded text-xs font-mono text-brand-secondary">
                            <Lock size={12} /> Complete Phase 2 ({phase2Target - phase2Progress} left)
                        </div>
                    ) : (
                        <a href="/target" className="flex items-center gap-2 px-4 py-2 bg-brand-accent/10 border border-brand-accent/50 rounded text-xs font-mono text-brand-accent hover:bg-brand-accent hover:text-brand-bg transition-colors">
                            <Play size={13} /> Start Targeted Practice
                        </a>
                    )}
                </div>

                <div className="space-y-4">
                    {[
                        { topic: 'Arrays', patterns: 'Traversal → Hashing → Two Pointers → Prefix Sum → Sliding Window' },
                        { topic: 'Linked Lists', patterns: 'Fast/Slow Pointers → Reversal → Merging' },
                        { topic: 'Trees', patterns: 'DFS → BFS → BST Operations' },
                    ].map((item, i) => (
                        <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-brand-bg/30 border border-brand-border/20 rounded">
                            <h4 className="font-mono font-bold text-sm text-brand-primary mb-1 md:mb-0 w-32">{item.topic}</h4>
                            <span className="text-[10px] md:text-xs font-mono text-brand-secondary flex-1">{item.patterns}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* PHASE 4: Specialization Tracks */}
            <section className={`retro-panel p-6 border-l-4 ${isPhase4Unlocked ? 'border-l-purple-500' : 'border-l-brand-border/30 opacity-60'}`}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <Code2 className={isPhase4Unlocked ? "text-purple-400" : "text-brand-secondary"} size={24} />
                        <div>
                            <h3 className={`text-xl font-bold uppercase tracking-wide ${isPhase4Unlocked ? "text-purple-400" : "text-brand-secondary"}`}>Phase 4: Advanced Specialization</h3>
                            <p className="text-xs text-brand-secondary font-mono mt-1">Hard level algorithms and specialized system design themes.</p>
                        </div>
                    </div>
                    {!isPhase4Unlocked && <Lock className="text-brand-secondary/50" />}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {['Dynamic Programming Expert', 'Graph Algorithms Specialist', 'Competitive Programming Track', 'System Design Basics'].map((track, i) => (
                        <div key={i} className="p-4 bg-brand-bg/20 border border-brand-border/20 rounded flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-brand-bg flex items-center justify-center border border-brand-border/30">
                                {isPhase4Unlocked ? <Unlock size={14} className="text-purple-400" /> : <Lock size={14} className="text-brand-secondary" />}
                            </div>
                            <span className={`font-mono text-sm ${isPhase4Unlocked ? 'text-brand-primary' : 'text-brand-secondary'}`}>{track}</span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};
