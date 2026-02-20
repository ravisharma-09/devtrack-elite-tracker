import type { RoadmapCategory } from '../types';

export interface NextBestAction {
    actionTopic: string;
    category: string;
    timeEst: string;
    reason: string;
}

export function generateNextBestAction(roadmap: RoadmapCategory[]): NextBestAction | null {
    const dsa = roadmap.find(c => c.id === 'dsa');
    const webdev = roadmap.find(c => c.id === 'webdev');
    const projects = roadmap.find(c => c.id === 'projects');
    const cs = roadmap.find(c => c.id === 'cs');

    // Priority 1: Current active DSA topic not completed (progress > 0 && !completed)
    const activeDsa = dsa?.topics.find(t => t.progress > 0 && !t.completed);
    if (activeDsa) {
        return {
            actionTopic: activeDsa.title,
            category: 'DSA',
            timeEst: '60–90 min',
            reason: 'Current topic incomplete. Maintain focus.',
        };
    }

    // Check if DSA fatigue is likely (heuristic: 2 or more fully completed DSA topics and web dev is lagging behind)
    const completedDsaCount = dsa?.topics.filter(t => t.completed).length || 0;
    const nextWebDev = webdev?.topics.find(t => t.unlocked && !t.completed);

    // Priority 3: Web Dev topic if DSA fatigue likely (after 2 DSA completions, we recommend web dev if available)
    if (completedDsaCount >= 2 && nextWebDev && Math.random() > 0.5) {
        return {
            actionTopic: nextWebDev.title,
            category: 'Web Dev',
            timeEst: '45–60 min',
            reason: 'Balance your stack. Proceed with Development track.',
        };
    }

    // Priority 2: Next unlocked DSA topic
    const nextDsa = dsa?.topics.find(t => t.unlocked && !t.completed);
    if (nextDsa) {
        return {
            actionTopic: nextDsa.title,
            category: 'DSA',
            timeEst: '60–90 min',
            reason: 'Begin next Data Structure / Algorithm foundation.',
        };
    }

    // Priority 4: Project milestone
    const nextProject = projects?.topics.find(t => t.unlocked && !t.completed);
    if (nextProject) {
        return {
            actionTopic: nextProject.title,
            category: 'Project',
            timeEst: '90–120 min',
            reason: 'Apply your theoretical knowledge into production code.',
        };
    }

    // Priority 5: CS Fundamentals
    const nextCs = cs?.topics.find(t => t.unlocked && !t.completed);
    if (nextCs) {
        return {
            actionTopic: nextCs.title,
            category: 'CS Fundamentals',
            timeEst: '45–60 min',
            reason: 'Strengthen core academic concepts for elite interviews.',
        };
    }

    return {
        actionTopic: 'System Mastery',
        category: 'General',
        timeEst: 'N/A',
        reason: 'All roadmap objectives achieved. You are ready.',
    };
}
