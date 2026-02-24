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

export interface MicroTask {
    id: string;
    title: string;
    completed: boolean;
}

export interface RoadmapTopic {
    id: string;
    title: string;
    targetCount?: number;
    progress: number;
    estimatedTime?: string;
    completed: boolean;
    unlocked: boolean;
    tasks?: MicroTask[];
}

export interface RoadmapCategory {
    id: string;
    title: string;
    topics: RoadmapTopic[];
}

export interface Statistics {
    totalProblemsSolved: number;
    totalRoadmapTopicsCompleted: number;
    totalMicroTasksCompleted: number;
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
    topic: string; // The roadmap string name or arbitrary study title
    category: 'DSA' | 'Competitive Programming' | 'Web Development' | 'Project Work' | 'Open Source' | 'Maths' | 'Chemistry' | 'Contest' | 'Revision' | 'Other';
    durationMinutes: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    date: string; // YYYY-MM-DD
    timestamp: number; // Unix for precise sorting
    notes?: string;
}

export interface LearningProfile {
    totalStudyTime: number; // in minutes
    strongestTopics: string[];
    weakestTopics: string[];
    consistencyScore: number; // 0-100 derived from activity array
    learningLevel: PlayerLevel;
}
