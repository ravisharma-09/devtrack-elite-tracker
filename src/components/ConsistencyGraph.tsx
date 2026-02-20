import React, { useState, useEffect } from 'react';
import type { ActivityHistory } from '../types';

interface ConsistencyGraphProps {
    daysToView: number;
    activityHistory: ActivityHistory;
    cfDates?: string[];
    ghDates?: string[];
}

type ActivitySource = { devtrack: boolean; cf: boolean; gh: boolean };

// Adaptive: reduce days shown on small screens to avoid horizontal overflow
function useAdaptiveDays(requested: number): number {
    const [days, setDays] = useState(Math.min(requested, 90));
    useEffect(() => {
        const calc = () => {
            const w = window.innerWidth;
            if (w < 480) setDays(Math.min(requested, 60));
            else if (w < 768) setDays(Math.min(requested, 120));
            else if (w < 1024) setDays(Math.min(requested, 180));
            else setDays(requested);
        };
        calc();
        window.addEventListener('resize', calc);
        return () => window.removeEventListener('resize', calc);
    }, [requested]);
    return days;
}

export const ConsistencyGraph: React.FC<ConsistencyGraphProps> = ({
    daysToView,
    activityHistory,
    cfDates = [],
    ghDates = [],
}) => {
    const adaptedDays = useAdaptiveDays(daysToView);
    const today = new Date();
    const dates = Array.from({ length: adaptedDays }).map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (daysToView - 1) + i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    // Build unified activity map
    const cfSet = new Set(cfDates);
    const ghSet = new Set(ghDates);

    const getActivity = (dateString: string): ActivitySource => ({
        devtrack: !!activityHistory[dateString],
        cf: cfSet.has(dateString),
        gh: ghSet.has(dateString),
    });

    const getDayColor = (src: ActivitySource) => {
        const count = [src.devtrack, src.cf, src.gh].filter(Boolean).length;
        if (count === 0) return 'bg-brand-bg border border-brand-border/30';
        // Multi-source: brightest
        if (count >= 3) return 'bg-brand-primary shadow-[0_0_10px_rgba(34,197,94,0.8)]';
        if (count === 2) return 'bg-brand-primary shadow-[0_0_6px_rgba(34,197,94,0.5)]';
        // Single source color
        if (src.devtrack) return 'bg-brand-primary/60';
        if (src.cf) return 'bg-yellow-400/60';
        return 'bg-blue-400/50';
    };

    const getTooltip = (dateString: string, src: ActivitySource) => {
        const parts: string[] = [];
        const devAct = activityHistory[dateString];
        if (devAct) parts.push(`DevTrack: ${devAct.minutesStudied}m studied`);
        if (src.cf) parts.push('Codeforces: submission');
        if (src.gh) parts.push('GitHub: push activity');
        return parts.length ? `${dateString}\n${parts.join('\n')}` : `No activity on ${dateString}`;
    };

    const hasCF = cfDates.length > 0;
    const hasGH = ghDates.length > 0;

    return (
        <div className="retro-panel p-6 shadow-[0_0_15px_rgba(34,197,94,0.05)] border-brand-primary/20">
            <div className="mb-4 flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold uppercase text-brand-primary tracking-wide">Execution Consistency</h3>
                    <p className="text-xs text-brand-secondary font-mono">Last {daysToView} Days — All Sources</p>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-3 text-xs font-mono text-brand-secondary flex-wrap justify-end">
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-brand-primary/60 rounded-sm" /><span>DevTrack</span></div>
                    {hasCF && <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-400/60 rounded-sm" /><span>Codeforces</span></div>}
                    {hasGH && <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-400/50 rounded-sm" /><span>GitHub</span></div>}
                    <div className="flex items-center gap-1"><div className="w-3 h-3 bg-brand-primary rounded-sm shadow-[0_0_6px_rgba(34,197,94,0.5)]" /><span>Multi</span></div>
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
                {dates.map(dateString => {
                    const src = getActivity(dateString);
                    return (
                        <div
                            key={dateString}
                            title={getTooltip(dateString, src)}
                            className={`w-3.5 h-3.5 rounded-sm transition-colors duration-300 ${getDayColor(src)}`}
                        />
                    );
                })}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs font-mono text-brand-secondary">
                <span className="opacity-50">Hover cells for details</span>
                <div className="flex items-center gap-2">
                    <span>Less</span>
                    <div className="w-3 h-3 bg-brand-bg border border-brand-border/30 rounded-sm" />
                    <div className="w-3 h-3 bg-brand-primary/30 rounded-sm" />
                    <div className="w-3 h-3 bg-brand-primary/60 rounded-sm" />
                    <div className="w-3 h-3 bg-brand-primary rounded-sm shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    <span>More</span>
                </div>
            </div>
        </div>
    );
};
