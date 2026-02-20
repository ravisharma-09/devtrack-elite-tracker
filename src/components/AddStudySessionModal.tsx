import React, { useState } from 'react';
import type { StudySession } from '../types';
import { X } from 'lucide-react';

interface AddStudySessionModalProps {
    onClose: () => void;
    onSave: (session: Omit<StudySession, 'id' | 'date'>) => void;
}

export const AddStudySessionModal: React.FC<AddStudySessionModalProps> = ({ onClose, onSave }) => {
    const [topic, setTopic] = useState('');
    const [category, setCategory] = useState<StudySession['category']>('DSA');
    const [durationStr, setDurationStr] = useState('');

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic || !durationStr) return;
        const durationMinutes = parseInt(durationStr, 10);
        if (isNaN(durationMinutes) || durationMinutes <= 0) return;

        onSave({
            topic,
            category,
            durationMinutes,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="retro-panel p-6 w-full max-w-md relative border-brand-accent/50 shadow-[0_0_30px_rgba(245,158,11,0.1)]">

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-brand-secondary hover:text-red-400 transition-colors"
                >
                    <X size={20} />
                </button>

                <h3 className="text-xl font-bold uppercase text-brand-accent tracking-wide mb-6">Log Study Session</h3>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-xs font-mono text-brand-secondary mb-1 uppercase tracking-widest">Topic Name</label>
                        <input
                            type="text"
                            required
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Graphs BFS"
                            className="w-full bg-brand-bg border border-brand-border/50 text-brand-primary p-2 rounded focus:outline-none focus:border-brand-accent font-mono"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-mono text-brand-secondary mb-1 uppercase tracking-widest">Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as StudySession['category'])}
                            className="w-full bg-brand-bg border border-brand-border/50 text-brand-primary p-2 rounded focus:outline-none focus:border-brand-accent font-mono appearance-none"
                        >
                            <option value="DSA">DSA</option>
                            <option value="Web Dev">Web Dev</option>
                            <option value="CS Fundamentals">CS Fundamentals</option>
                            <option value="Project">Project</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-mono text-brand-secondary mb-1 uppercase tracking-widest">Duration (Minutes)</label>
                        <input
                            type="number"
                            required
                            min="1"
                            value={durationStr}
                            onChange={(e) => setDurationStr(e.target.value)}
                            placeholder="e.g. 60"
                            className="w-full bg-brand-bg border border-brand-border/50 text-brand-primary p-2 rounded focus:outline-none focus:border-brand-accent font-mono"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-mono text-brand-secondary hover:text-brand-primary transition-colors"
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-brand-accent/10 border border-brand-accent/50 text-brand-accent font-mono font-bold hover:bg-brand-accent hover:text-black transition-colors rounded uppercase tracking-widest"
                        >
                            SAVE BLOCK
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};
