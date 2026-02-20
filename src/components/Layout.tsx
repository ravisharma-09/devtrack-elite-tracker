import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const Layout: React.FC = () => {
    return (
        <div className="flex min-h-screen bg-brand-bg text-brand-primary font-jetbrains">
            <Sidebar />
            {/* 
              Desktop: ml-64 to offset the fixed sidebar
              Mobile:  no margin (sidebar is a drawer), add top padding for hamburger btn,
                       add bottom padding for bottom nav bar (pb-20)
            */}
            <main className="
                flex-1 min-h-screen overflow-y-auto
                md:ml-64
                px-4 pt-16 pb-24
                md:px-8 md:pt-8 md:pb-10
            ">
                <div className="max-w-6xl mx-auto w-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
