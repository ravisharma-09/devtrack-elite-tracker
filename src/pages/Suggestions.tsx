import React from 'react';
import { useStore } from '../engine/learningStore';
import { Brain, Code2, Target, ExternalLink, Zap, AlertTriangle, Terminal, LayoutTemplate } from 'lucide-react';

export const Suggestions: React.FC = () => {
    const { aiAnalytics } = useStore();
    const suggestions = aiAnalytics?.questions;

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-8 border-b border-brand-border pb-4">
                <h2 className="text-2xl font-bold retro-text tracking-widest uppercase mb-2 flex items-center gap-3">
                    <Target className="text-brand-accent" /> Targeted Practice
                </h2>
                <p className="retro-text-sub">AI-curated problem sets focused on your weakest areas</p>
            </header>

            {!suggestions ? (
                <div className="retro-panel p-12 text-center border-brand-primary/20 bg-brand-bg/50">
                    <Brain className="w-16 h-16 mx-auto text-brand-secondary/30 mb-4 animate-pulse" />
                    <h3 className="text-brand-secondary font-mono tracking-widest uppercase mb-2">Engines Analyzing Telemetry</h3>
                    <p className="text-sm text-brand-secondary/60 font-mono">
                        Return to the Command Center to initiate a planetary scan, or wait for the chronometric sync...
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Mission Context */}
                    <div className="retro-panel p-6 border-brand-accent/30 bg-brand-accent/5">
                        <div className="flex items-start gap-4">
                            <AlertTriangle className="text-brand-accent w-8 h-8 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-1">
                                    Primary Weak Point Detected:
                                </h3>
                                <div className="text-2xl font-bold font-mono text-brand-primary mb-2">
                                    {suggestions.topic}
                                </div>
                                <p className="text-brand-secondary/80 text-sm leading-relaxed">
                                    {suggestions.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Algorithmic Targets */}
                    <div className="mb-2">
                        <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-4 flex items-center gap-2">
                            <Terminal size={16} /> Algorithmic Targets
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {suggestions.questions?.map((q, i) => (
                                <a
                                    key={i}
                                    href={q.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="retro-panel p-5 block group hover:border-brand-primary transition-all duration-300 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                                        <ExternalLink size={16} className="text-brand-primary" />
                                    </div>

                                    <div className="flex items-center gap-2 mb-3">
                                        {q.platform === 'LeetCode' ? (
                                            <Code2 size={16} className="text-orange-400" />
                                        ) : (
                                            <Zap size={16} className="text-yellow-400" />
                                        )}
                                        <span className="text-[10px] font-mono uppercase tracking-widest text-brand-secondary">
                                            {q.platform}
                                        </span>
                                    </div>

                                    <h4 className="text-brand-primary font-bold font-mono text-sm leading-snug mb-3 group-hover:text-brand-accent transition-colors">
                                        {q.name}
                                    </h4>

                                    <div className="flex items-center gap-2 mt-auto">
                                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border border-brand-border ${q.difficulty === 'Hard' ? 'text-red-400 bg-red-400/10 border-red-400/20' :
                                            q.difficulty === 'Medium' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                                                'text-green-400 bg-green-400/10 border-green-400/20'
                                            }`}>
                                            {q.difficulty}
                                        </span>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Application Projects */}
                    {suggestions.projects && suggestions.projects.length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest mb-4 flex items-center gap-2">
                                <LayoutTemplate size={16} /> Applied Web Projects
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {suggestions.projects.map((p, i) => (
                                    <div key={i} className="retro-panel p-5 border-brand-accent/20 bg-brand-bg/40 hover:border-brand-accent/60 transition-colors">
                                        <h4 className="text-brand-accent font-bold font-mono text-sm uppercase tracking-widest mb-2">
                                            {p.title}
                                        </h4>
                                        <p className="text-brand-secondary/80 text-sm leading-relaxed mb-4">
                                            {p.description}
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-auto">
                                            {p.techStack.map(t => (
                                                <span key={t} className="text-[10px] font-mono px-2 py-0.5 text-brand-primary bg-brand-primary/10 border border-brand-primary/20 rounded">
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
