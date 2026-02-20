import type { DailyTimetable } from '../types';

export const initialTimetable: DailyTimetable[] = [
    {
        day: 'Monday',
        tasks: [
            { id: 'm1', title: 'DSA Practice', durationMinutes: 75, completed: false },
            { id: 'm2', title: 'Web Development', durationMinutes: 60, completed: false },
            { id: 'm3', title: 'Project Work', durationMinutes: 45, completed: false },
            { id: 'm4', title: 'Revision', durationMinutes: 15, completed: false },
        ],
    },
    {
        day: 'Tuesday',
        tasks: [
            { id: 't1', title: 'DSA Practice', durationMinutes: 75, completed: false },
            { id: 't2', title: 'Web Development', durationMinutes: 60, completed: false },
            { id: 't3', title: 'Project Work', durationMinutes: 45, completed: false },
        ],
    },
    {
        day: 'Wednesday',
        tasks: [
            { id: 'w1', title: 'DSA Practice', durationMinutes: 75, completed: false },
            { id: 'w2', title: 'Project Work', durationMinutes: 60, completed: false },
            { id: 'w3', title: 'Revision', durationMinutes: 15, completed: false },
        ],
    },
    {
        day: 'Thursday',
        tasks: [
            { id: 'th1', title: 'Contest Preparation Only', durationMinutes: 120, completed: false },
        ],
    },
    {
        day: 'Friday',
        tasks: [
            { id: 'f1', title: 'DSA Practice', durationMinutes: 60, completed: false },
            { id: 'f2', title: 'Project Work', durationMinutes: 60, completed: false },
        ],
    },
    {
        day: 'Saturday',
        tasks: [
            { id: 'sa1', title: 'Project Work', durationMinutes: 120, completed: false },
            { id: 'sa2', title: 'Web Development', durationMinutes: 60, completed: false },
            { id: 'sa3', title: 'DSA Practice', durationMinutes: 60, completed: false },
        ],
    },
    {
        day: 'Sunday',
        tasks: [
            { id: 'su1', title: 'DSA Practice', durationMinutes: 180, completed: false },
            { id: 'su2', title: 'Project Work', durationMinutes: 120, completed: false },
            { id: 'su3', title: 'Web Development', durationMinutes: 60, completed: false },
            { id: 'su4', title: 'Weekly planning', durationMinutes: 30, completed: false },
        ],
    },
];
