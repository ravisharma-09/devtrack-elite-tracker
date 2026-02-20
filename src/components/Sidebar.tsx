import React from 'react';
import { NavLink } from 'react-router-dom';
import { Terminal, CalendarDays, Route as MapRouteIcon, BarChart3, UserCircle, LogOut } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export const Sidebar: React.FC = () => {
    const { user, logout } = useAuth();

    const getNavClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-4 py-3 rounded mb-1.5 transition-colors ${isActive
            ? 'bg-brand-primary text-brand-bg font-bold shadow-[0_0_10px_rgba(34,197,94,0.3)]'
            : 'text-brand-secondary hover:text-brand-primary hover:bg-brand-card'}`;

    return (
        <aside className="w-64 h-screen fixed top-0 left-0 bg-brand-card border-r border-brand-border p-6 flex flex-col">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
                <Terminal className="w-8 h-8 text-brand-primary" />
                <div>
                    <h1 className="text-xl font-bold tracking-wider text-brand-primary">DEV<span className="text-brand-accent">TRACK</span></h1>
                    <p className="text-brand-secondary text-xs mt-0.5">SDE Daily Execution</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-0.5">
                <NavLink to="/" className={getNavClass} end>
                    <Terminal size={18} /> <span>Dashboard</span>
                </NavLink>
                <NavLink to="/timetable" className={getNavClass}>
                    <CalendarDays size={18} /> <span>Timetable</span>
                </NavLink>
                <NavLink to="/roadmap" className={getNavClass}>
                    <MapRouteIcon size={18} /> <span>Roadmap</span>
                </NavLink>
                <NavLink to="/statistics" className={getNavClass}>
                    <BarChart3 size={18} /> <span>Statistics</span>
                </NavLink>
                <NavLink to="/profile" className={getNavClass}>
                    <UserCircle size={18} /> <span>Profile</span>
                </NavLink>
            </nav>

            {/* User footer */}
            <div className="mt-auto pt-4 border-t border-brand-border/50">
                {user && (
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-brand-primary">{(user.name || user.email || 'D').charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-mono text-brand-primary truncate">{user.name || user.email?.split('@')[0]}</div>
                                <div className="text-xs font-mono text-brand-secondary/60 truncate">{user.email}</div>
                            </div>
                        </div>
                        <button onClick={() => logout()} title="Logout"
                            className="text-brand-secondary hover:text-red-400 transition-colors flex-shrink-0 ml-2">
                            <LogOut size={15} />
                        </button>
                    </div>
                )}
                <div className="flex items-center justify-center gap-2 text-brand-secondary text-xs">
                    <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse inline-block" />
                    System Online
                </div>
            </div>
        </aside>
    );
};
