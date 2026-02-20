import React from 'react';
import { NavLink } from 'react-router-dom';
import { Terminal, CalendarDays, Route as MapRouteIcon, BarChart3 } from 'lucide-react';

export const Sidebar: React.FC = () => {
    const getNavClass = ({ isActive }: { isActive: boolean }) => {
        return `flex items-center gap-3 px-4 py-3 rounded mb-2 transition-colors ${isActive
            ? 'bg-brand-primary text-brand-bg font-bold shadow-[0_0_10px_rgba(34,197,94,0.3)]'
            : 'text-brand-secondary hover:text-brand-primary hover:bg-brand-card'
            }`;
    };

    return (
        <aside className="w-64 h-screen fixed top-0 left-0 bg-brand-card border-r border-brand-border p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-12">
                <Terminal className="w-8 h-8 text-brand-primary" />
                <div>
                    <h1 className="text-xl font-bold tracking-wider text-brand-primary">DEV<span className="text-brand-accent">TRACK</span></h1>
                    <p className="text-brand-secondary text-xs mt-1">SDE Daily Execution</p>
                </div>
            </div>

            <nav className="flex-1">
                <NavLink to="/" className={getNavClass} end>
                    <Terminal size={20} />
                    <span>Dashboard</span>
                </NavLink>
                <NavLink to="/timetable" className={getNavClass}>
                    <CalendarDays size={20} />
                    <span>Timetable</span>
                </NavLink>
                <NavLink to="/roadmap" className={getNavClass}>
                    <MapRouteIcon size={20} />
                    <span>Roadmap</span>
                </NavLink>
                <NavLink to="/statistics" className={getNavClass}>
                    <BarChart3 size={20} />
                    <span>Statistics</span>
                </NavLink>
            </nav>

            <div className="mt-auto pt-6 border-t border-brand-border/50 text-brand-secondary text-xs text-center flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse inline-block"></span>
                System Online
            </div>
        </aside>
    );
};
