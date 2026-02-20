export interface TimetableTask {
    id: string;
    title: string;
    durationMinutes: number;
    completed: boolean;
}

export interface DailyTimetable {
    day: string;
    tasks: TimetableTask[];
}

export interface RoadmapTopic {
    id: string;
    title: string;
    targetCount?: number;
    progress: number;
    estimatedTime?: string;
    completed: boolean;
    unlocked: boolean;
}

export interface RoadmapCategory {
    id: string;
    title: string;
    topics: RoadmapTopic[];
}

export interface Statistics {
    totalProblemsSolved: number;
    totalRoadmapTopicsCompleted: number;
    studyStreakDays: number;
    weeklyCompletionPercentage: number;
    totalStudySessions: number;
    totalStudyMinutes: number;
    lastActiveDate: string | null;
}

export type PlayerLevel = 'Beginner' | 'Learner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Elite';

export interface DailyActivity {
    tasksCompleted: number;
    minutesStudied: number;
    topics: string[];
}

export interface ActivityHistory {
    [date: string]: DailyActivity;
}

export interface StudySession {
    id: string;
    topic: string;
    category: 'DSA' | 'Web Dev' | 'CS Fundamentals' | 'Project' | 'Other';
    durationMinutes: number;
    date: string;
}
