import React from 'react';
import type { ActivityHistory } from '../types';
import { getIntensityLevel } from '../data/activityStore';

interface ConsistencyGraphProps {
    daysToView: number;
    activityHistory: ActivityHistory;
}

export const ConsistencyGraph: React.FC<ConsistencyGraphProps> = ({ daysToView, activityHistory }) => {
    // Generate array of dates for the last N days
    const today = new Date();
    const dates = Array.from({ length: daysToView }).map((_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (daysToView - 1) + i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    const getDayColor = (dateString: string) => {
        const activity = activityHistory[dateString];
        const intensity = getIntensityLevel(activity);

        switch (intensity) {
            case 3: return 'bg-brand-primary shadow-[0_0_8px_rgba(34,197,94,0.6)]'; // Level 3: Bright green
            case 2: return 'bg-brand-primary/60'; // Level 2: Medium green
            case 1: return 'bg-brand-primary/30'; // Level 1: Light green
            default: return 'bg-brand-bg border border-brand-border/30'; // Level 0: Dark
        }
    };

    const getTooltipContent = (dateString: string) => {
        const activity = activityHistory[dateString];
        if (!activity) return `No activity on ${dateString}`;
        return `${activity.tasksCompleted} tasks, ${activity.minutesStudied} mins on ${dateString}`;
    };

    return (
        <div className="retro-panel p-6 shadow-[0_0_15px_rgba(34,197,94,0.05)] border-brand-primary/20">
            <div className="mb-4">
                <h3 className="text-xl font-bold uppercase text-brand-primary tracking-wide">Execution Consistency</h3>
                <p className="text-xs text-brand-secondary font-mono">Last {daysToView} Days</p>
            </div>

            {/* GitHub-style wrap grid. Setting layout to flow left-to-right wrapping cleanly. */}
            {/* We use a flex container so it scales gracefully out of the box in the retro theme */}
            <div
                className="flex flex-wrap gap-1.5"
            >
                {dates.map((dateString) => (
                    <div
                        key={dateString}
                        title={getTooltipContent(dateString)}
                        className={`w-3.5 h-3.5 rounded-sm transition-colors duration-300 ${getDayColor(dateString)}`}
                    />
                ))}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 text-xs font-mono text-brand-secondary">
                <span>Less</span>
                <div className="w-3 h-3 bg-brand-bg border border-brand-border/30 rounded-sm"></div>
                <div className="w-3 h-3 bg-brand-primary/30 rounded-sm"></div>
                <div className="w-3 h-3 bg-brand-primary/60 rounded-sm"></div>
                <div className="w-3 h-3 bg-brand-primary rounded-sm shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                <span>More</span>
            </div>
        </div>
    );
};
