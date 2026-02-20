import type { RoadmapCategory, DailyTimetable, TimetableTask } from '../types';

export interface DailyPlanItem {
    categoryTitle: string;
    topicTitle: string;
    directive: string;
}

export function generateDailyStudyPlan(
    timetable: DailyTimetable[],
    roadmap: RoadmapCategory[],
    dayIndex: number
): DailyPlanItem[] {
    const todaySchedule = timetable[dayIndex];
    if (!todaySchedule || todaySchedule.tasks.length === 0) {
        return [];
    }

    const dsa = roadmap.find(c => c.id === 'dsa');
    const webdev = roadmap.find(c => c.id === 'webdev');
    const projects = roadmap.find(c => c.id === 'projects');
    // const cs = roadmap.find(c => c.id === 'cs');

    const pendingDsa = dsa?.topics.find(t => t.unlocked && !t.completed) || dsa?.topics[0];
    const pendingWebDev = webdev?.topics.find(t => t.unlocked && !t.completed) || webdev?.topics[0];
    const pendingProject = projects?.topics.find(t => t.unlocked && !t.completed) || projects?.topics[0];

    const plan: DailyPlanItem[] = [];

    todaySchedule.tasks.forEach((task: TimetableTask) => {
        const titleLower = task.title.toLowerCase();

        if (titleLower.includes('dsa') && pendingDsa) {
            plan.push({
                categoryTitle: 'DSA',
                topicTitle: pendingDsa.title,
                directive: `Solve 4 problems (${task.durationMinutes} min)`
            });
        } else if (titleLower.includes('web dev') && pendingWebDev) {
            plan.push({
                categoryTitle: 'Web Dev',
                topicTitle: pendingWebDev.title,
                directive: `Study deeply for ${task.durationMinutes} minutes`
            });
        } else if (titleLower.includes('project') && pendingProject) {
            plan.push({
                categoryTitle: 'Project',
                topicTitle: pendingProject.title,
                directive: `Implement requirements (${task.durationMinutes} min)`
            });
        } else if (titleLower.includes('revision') || titleLower.includes('planning') || titleLower.includes('contest')) {
            plan.push({
                categoryTitle: 'System',
                topicTitle: task.title,
                directive: `Execute routine protocol (${task.durationMinutes} min)`
            });
        }
    });

    return plan;
}
