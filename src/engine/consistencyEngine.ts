import type { StudySession, ActivityHistory } from '../types';

// ─── Date Helpers ─────────────────────────────────────────────────────────────
export function getTodayDateString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDateString(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ─── Log Session to Activity History ─────────────────────────────────────────
export function logSessionToHistory(prev: ActivityHistory, session: StudySession): ActivityHistory {
    const d = session.date;
    const current = prev[d] || { minutesStudied: 0, tasksCompleted: 0, topics: [] };
    return {
        ...prev,
        [d]: {
            minutesStudied: current.minutesStudied + session.durationMinutes,
            tasksCompleted: current.tasksCompleted + 1,
            topics: Array.from(new Set([...current.topics, session.topic])),
        },
    };
}

// ─── Today's Stats ────────────────────────────────────────────────────────────
export function getTodayStats(history: ActivityHistory): {
    minutesStudied: number;
    sessionsCompleted: number;
    topics: string[];
} {
    const today = getTodayDateString();
    const entry = history[today];
    return {
        minutesStudied: entry?.minutesStudied || 0,
        sessionsCompleted: entry?.tasksCompleted || 0,
        topics: entry?.topics || [],
    };
}

// ─── Streak Calculation ───────────────────────────────────────────────────────
export function calculateStreak(history: ActivityHistory): number {
    const today = new Date();
    let streak = 0;

    for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = getDateString(d);
        if (history[key] && history[key].minutesStudied > 0) {
            streak++;
        } else if (i > 0) {
            break; // Streak broken
        }
    }
    return streak;
}

// ─── Consistency Score (0–100) ────────────────────────────────────────────────
// Percentage of last 30 days with any study activity
export function calculateConsistencyScore(history: ActivityHistory): number {
    const today = new Date();
    let activeDays = 0;
    for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = getDateString(d);
        if (history[key] && history[key].minutesStudied > 0) activeDays++;
    }
    return Math.round((activeDays / 30) * 100);
}
