import type { Statistics } from '../types';

export const initialStatistics: Statistics = {
    totalProblemsSolved: 0,
    totalRoadmapTopicsCompleted: 0,
    studyStreakDays: 0,
    weeklyCompletionPercentage: 0,
    totalStudySessions: 0,
    totalStudyMinutes: 0,
    lastActiveDate: null,
};

export const calculatePlayerLevel = (completionPercentage: number): string => {
    if (completionPercentage >= 90) return 'Elite';
    if (completionPercentage >= 70) return 'Expert';
    if (completionPercentage >= 50) return 'Advanced';
    if (completionPercentage >= 30) return 'Intermediate';
    if (completionPercentage >= 10) return 'Learner';
    return 'Beginner';
};
