import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Terminal, CalendarDays, Route as MapRouteIcon, BarChart3, UserCircle, LogOut, Menu, X, Target, Trophy, Activity as ActivityIcon } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const NAV_ITEMS = [
    { to: '/', icon: Terminal, label: 'Dashboard', end: true },
    { to: '/timetable', icon: CalendarDays, label: 'Timetable' },
    { to: '/roadmap', icon: MapRouteIcon, label: 'Roadmap' },
    { to: '/suggestions', icon: Target, label: 'Targeted Practice' },
    { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
    { to: '/activity', icon: ActivityIcon, label: 'Unified Activity' },
    { to: '/statistics', icon: BarChart3, label: 'Statistics' },
    { to: '/profile', icon: UserCircle, label: 'Profile' },
];

export const Sidebar: React.FC = () => {
    const { user, logout } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    // Close drawer on route change
    useEffect(() => { setMobileOpen(false); }, [location.pathname]);

    // Prevent body scroll when drawer is open
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    const getNavClass = ({ isActive }: { isActive: boolean }) =>
        `flex items-center gap-3 px-4 py-3 rounded mb-1.5 transition-colors text-sm font-mono ${isActive
            ? 'bg-brand-primary text-brand-bg font-bold shadow-[0_0_10px_rgba(34,197,94,0.3)]'
            : 'text-brand-secondary hover:text-brand-primary hover:bg-brand-card'
        }`;

    const SidebarContent = () => (
        <div className="flex flex-col h-full p-5">
            {/* Logo */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Terminal className="w-7 h-7 text-brand-primary flex-shrink-0" />
                    <div>
                        <h1 className="text-lg font-bold tracking-wider text-brand-primary leading-tight">
                            DEV<span className="text-brand-accent">TRACK</span>
                        </h1>
                        <p className="text-brand-secondary text-xs">SDE Daily Execution</p>
                    </div>
                </div>
                {/* Close button (mobile only) */}
                <button
                    onClick={() => setMobileOpen(false)}
                    className="md:hidden text-brand-secondary hover:text-brand-primary transition-colors p-1"
                    aria-label="Close menu"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-0.5">
                {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
                    <NavLink key={to} to={to} className={getNavClass} end={end}>
                        <Icon size={18} className="flex-shrink-0" />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* User footer */}
            <div className="mt-auto pt-4 border-t border-brand-border/50">
                {user && (
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-brand-primary/20 border border-brand-primary/40 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-brand-primary">
                                    {(user.name || user.email || 'D').charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs font-mono text-brand-primary truncate">
                                    {user.name || user.email?.split('@')[0]}
                                </div>
                                <div className="text-xs font-mono text-brand-secondary/60 truncate">
                                    {user.email}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => logout()}
                            title="Logout"
                            className="text-brand-secondary hover:text-red-400 transition-colors flex-shrink-0 ml-2"
                        >
                            <LogOut size={15} />
                        </button>
                    </div>
                )}
                <div className="flex items-center justify-center gap-2 text-brand-secondary text-xs">
                    <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse inline-block" />
                    System Online
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* ── DESKTOP sidebar (always visible ≥ md) ─────────────────────── */}
            <aside className="hidden md:flex w-64 h-screen fixed top-0 left-0 bg-brand-card border-r border-brand-border flex-col z-40">
                <SidebarContent />
            </aside>

            {/* ── MOBILE: hamburger button ──────────────────────────────────── */}
            <button
                onClick={() => setMobileOpen(true)}
                className="md:hidden fixed top-4 left-4 z-50 bg-brand-card border border-brand-border rounded-lg p-2.5 text-brand-primary shadow-lg"
                aria-label="Open menu"
            >
                <Menu size={20} />
            </button>

            {/* ── MOBILE: backdrop ─────────────────────────────────────────── */}
            {mobileOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* ── MOBILE: slide-in drawer ───────────────────────────────────── */}
            <aside className={`
                md:hidden fixed top-0 left-0 h-full w-72 bg-brand-card border-r border-brand-border z-50
                transform transition-transform duration-300 ease-in-out
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <SidebarContent />
            </aside>

            {/* ── MOBILE: bottom nav bar (quick access) ─────────────────────── */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-card border-t border-brand-border z-40 flex items-center justify-around px-2 py-1.5 safe-area-pb">
                {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${isActive ? 'text-brand-primary' : 'text-brand-secondary'
                            }`
                        }
                    >
                        <Icon size={20} />
                        <span className="text-[10px] font-mono">{label}</span>
                    </NavLink>
                ))}
            </nav>
        </>
    );
};
