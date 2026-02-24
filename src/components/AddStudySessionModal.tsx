import React, { useState } from 'react';
import type { StudySession } from '../types';
import { X } from 'lucide-react';
import { getTodayDateString } from '../engine/consistencyEngine';

interface AddStudySessionModalProps {
    onClose: () => void;
    onSave: (session: Omit<StudySession, 'id' | 'timestamp'>) => void;
    initialTopic?: string;
    initialCategory?: StudySession['category'];
    initialDuration?: number;
}

export const AddStudySessionModal: React.FC<AddStudySessionModalProps> = ({
    onClose,
    onSave,
    initialTopic = '',
    initialCategory = 'DSA',
    initialDuration
}) => {
    const [topic, setTopic] = useState(initialTopic);
    const [category, setCategory] = useState<StudySession['category']>(initialCategory);
    const [durationStr, setDurationStr] = useState(initialDuration ? initialDuration.toString() : '');
    const [difficulty, setDifficulty] = useState<StudySession['difficulty']>('Medium');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(getTodayDateString());

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!durationStr) return;
        const durationMinutes = parseInt(durationStr, 10);
        if (isNaN(durationMinutes) || durationMinutes <= 0) return;

        onSave({
            topic: topic.trim() || category, // fallback to category if topic is omitted
            category,
            durationMinutes,
            difficulty,
            notes,
            date
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="retro-panel w-full sm:max-w-md relative border-brand-accent/50 shadow-[0_0_30px_rgba(245,158,11,0.1)] rounded-t-2xl sm:rounded-xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-brand-secondary hover:text-red-400 transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <h3 className="text-xl font-bold uppercase text-brand-accent tracking-wide mb-6">Log Study Session</h3>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-xs font-mono text-brand-secondary mb-1 uppercase tracking-widest">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value as StudySession['category'])}
                                className="w-full bg-brand-bg border border-brand-border/50 text-brand-primary p-2 rounded focus:outline-none focus:border-brand-accent font-mono appearance-none"
                            >
                                <option value="DSA">DSA</option>
                                <option value="Competitive Programming">Competitive Programming</option>
                                <option value="Web Development">Web Development</option>
                                <option value="Project Work">Project Work</option>
                                <option value="Open Source">Open Source</option>
                                <option value="Maths">Maths</option>
                                <option value="Chemistry">Chemistry</option>
                                <option value="Contest">Contest</option>
                                <option value="Revision">Revision</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-mono text-brand-secondary mb-1 uppercase tracking-widest">Topic Name (Optional)</label>
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g. Graphs BFS"
                                className="w-full bg-brand-bg border border-brand-border/50 text-brand-primary p-2 rounded focus:outline-none focus:border-brand-accent font-mono"
                            />
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

                        <div>
                            <label className="block text-xs font-mono text-brand-secondary mb-1 uppercase tracking-widest">Date</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full bg-brand-bg border border-brand-border/50 text-brand-primary p-2 rounded focus:outline-none focus:border-brand-accent font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-mono text-brand-secondary mb-1 uppercase tracking-widest">Difficulty</label>
                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value as StudySession['difficulty'])}
                                className="w-full bg-brand-bg border border-brand-border/50 text-brand-primary p-2 rounded focus:outline-none focus:border-brand-accent font-mono appearance-none"
                            >
                                <option value="Easy">Easy</option>
                                <option value="Medium">Medium</option>
                                <option value="Hard">Hard</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-mono text-brand-secondary mb-1 uppercase tracking-widest">Notes (Optional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g. Struggled with BFS queue state..."
                                className="w-full bg-brand-bg border border-brand-border/50 text-brand-primary p-2 rounded focus:outline-none focus:border-brand-accent font-mono h-24 resize-none"
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
        </div>
    );
};
