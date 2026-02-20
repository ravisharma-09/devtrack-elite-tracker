import type { DailyActivity, ActivityHistory } from '../types';

// Helper to get today's YYYY-MM-DD string locally
export const getTodayDateString = (): string => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const logActivity = (
    history: ActivityHistory,
    date: string,
    durationMinutes: number,
    topicTitle?: string,
    isTaskCompletion: boolean = false
): ActivityHistory => {
    const updated = { ...history };
    if (!updated[date]) {
        updated[date] = { tasksCompleted: 0, minutesStudied: 0, topics: [] };
    }

    updated[date].minutesStudied += durationMinutes;

    if (isTaskCompletion) {
        updated[date].tasksCompleted += 1;
    }

    if (topicTitle && !updated[date].topics.includes(topicTitle)) {
        updated[date].topics.push(topicTitle);
    }

    return updated;
};

export const getIntensityLevel = (activity?: DailyActivity): 0 | 1 | 2 | 3 => {
    if (!activity) return 0;
    if (activity.tasksCompleted >= 5 || activity.minutesStudied >= 180) return 3;
    if (activity.tasksCompleted >= 2 || activity.minutesStudied >= 60) return 2;
    if (activity.tasksCompleted >= 1 || activity.minutesStudied > 0) return 1;
    return 0;
};
