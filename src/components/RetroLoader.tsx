import React from 'react';
import { Zap } from 'lucide-react';

interface RetroLoaderProps {
    title?: string;
    subtitle?: string;
}

export const RetroLoader: React.FC<RetroLoaderProps> = ({
    title = 'Initializing Core',
    subtitle = 'Establishing connection...'
}) => {
    return (
        <div className="flex flex-col justify-center items-center text-center opacity-70 py-12 w-full h-full">
            <Zap size={28} className="mb-4 text-brand-primary animate-pulse" />
            <div className="text-sm font-mono text-brand-primary tracking-widest uppercase">
                {title}
            </div>
            <div className="text-xs font-mono text-brand-secondary mt-2 w-full break-words max-w-[80%]">
                {subtitle}
            </div>
        </div>
    );
};
