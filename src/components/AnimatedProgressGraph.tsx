import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity as ActivityIcon } from 'lucide-react';

import type { ActivityHistory } from '../types';

interface AnimatedProgressGraphProps {
    activityHistory: ActivityHistory;
    daysToView?: number;
}

export const AnimatedProgressGraph: React.FC<AnimatedProgressGraphProps> = ({
    activityHistory,
    daysToView = 14
}) => {
    // Generate data for the last N days
    const data = useMemo(() => {
        const today = new Date();
        const result = [];

        for (let i = daysToView - 1; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const shortDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            const dayData = activityHistory[dateStr];
            result.push({
                date: shortDate,
                fullDate: dateStr,
                score: dayData ? (dayData.tasksCompleted * 10) + Math.round(dayData.minutesStudied / 2) : 0,
                minutes: dayData ? dayData.minutesStudied : 0,
            });
        }
        return result;
    }, [activityHistory, daysToView]);

    const maxScore = Math.max(...data.map(d => d.score), 10);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="retro-panel p-3 border-brand-primary/50 bg-black/90 shadow-lg shadow-brand-primary/20 backdrop-blur-sm">
                    <p className="text-brand-secondary text-xs font-mono uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-brand-primary font-mono text-sm font-bold flex items-center gap-2">
                        <ActivityIcon size={12} />
                        {payload[0].value} Score
                    </p>
                    <p className="text-brand-secondary/60 font-mono text-xs mt-1">
                        {payload[0].payload.minutes} mins tracked
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="retro-panel p-6 overflow-hidden relative group">
            {/* Cyberpunk Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#00ff9d0a_1px,transparent_1px),linear-gradient(to_bottom,#00ff9d0a_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

            <div className="flex justify-between items-center mb-6 relative z-10">
                <div>
                    <h3 className="text-sm font-mono uppercase text-brand-secondary tracking-widest flex items-center gap-2">
                        <ActivityIcon size={16} className="text-brand-primary" />
                        Activity Momentum
                    </h3>
                    <p className="text-xs font-mono text-brand-secondary/60 mt-1">Last {daysToView} Days</p>
                </div>
                <div className="px-3 py-1 rounded bg-brand-primary/10 border border-brand-primary/30 text-brand-primary text-xs font-mono">
                    LIVE
                </div>
            </div>

            <div className="h-[200px] w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00ff9d" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="#00ff9d" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            stroke="#8b949e"
                            fontSize={10}
                            fontFamily="monospace"
                            tickLine={false}
                            axisLine={false}
                            minTickGap={20}
                        />
                        <YAxis
                            stroke="#8b949e"
                            fontSize={10}
                            fontFamily="monospace"
                            tickLine={false}
                            axisLine={false}
                            domain={[0, Math.ceil(maxScore * 1.2)]}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#00ff9d', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Area
                            type="monotone"
                            dataKey="score"
                            stroke="#00ff9d"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorScore)"
                            animationDuration={1500}
                            animationEasing="ease-in-out"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
