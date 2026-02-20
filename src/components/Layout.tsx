import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const Layout: React.FC = () => {
    return (
        <div className="flex min-h-screen bg-brand-bg text-brand-primary font-jetbrains">
            <Sidebar />
            <main className="ml-64 flex-1 p-8 overflow-y-auto">
                <div className="max-w-6xl mx-auto flex flex-col min-h-full">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
