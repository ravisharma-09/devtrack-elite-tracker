import type { RoadmapCategory, StudySession } from '../types';

// ─── Progress Unit Calculation ────────────────────────────────────────────────
// Easy → +1, Medium → +2, Hard → +3, Duration >90min → +1 bonus
export function calculateProgressUnits(difficulty: StudySession['difficulty'], durationMinutes: number): number {
    let units = difficulty === 'Easy' ? 1 : difficulty === 'Medium' ? 2 : 3;
    if (durationMinutes > 90) units += 1;
    return units;
}

// ─── Session → Roadmap Application ───────────────────────────────────────────
// Matches session topic/category to roadmap topic by name fuzzy match.
// Only applies to quantitative (targetCount) topics — not micro-task topics.
export function applySessionToRoadmap(
    current: RoadmapCategory[],
    session: StudySession
): { updatedRoadmap: RoadmapCategory[]; actualProgressAdded: number } {
    const units = calculateProgressUnits(session.difficulty, session.durationMinutes);
    let totalAdded = 0;

    const updated = current.map(category => {
        // Category-level match (e.g. session.category = 'DSA' matches category.id = 'dsa')
        const categoryMatches =
            category.id.toLowerCase().includes(session.category.toLowerCase().replace(/\s/g, '')) ||
            session.category.toLowerCase().includes(category.title.toLowerCase().split(' ')[0]);

        if (!categoryMatches) return category;

        const updatedTopics = category.topics.map(topic => {
            if (!topic.targetCount) return topic; // Skip micro-task topics

            const topicMatches =
                topic.title.toLowerCase().includes(session.topic.toLowerCase()) ||
                session.topic.toLowerCase().includes(topic.title.toLowerCase().replace(/phase \d+:\s*/i, ''));

            if (!topicMatches || !topic.unlocked) return topic;

            const oldProg = topic.progress;
            const newProg = Math.min(topic.targetCount, topic.progress + units);
            totalAdded += newProg - oldProg;

            return {
                ...topic,
                progress: newProg,
                completed: newProg >= topic.targetCount,
            };
        });

        // Propagate unlock after updating
        let prevDone = true;
        const withUnlocks = updatedTopics.map((t, idx) => {
            const unlocked = idx === 0 ? true : prevDone;
            prevDone = t.completed;
            return { ...t, unlocked };
        });

        return { ...category, topics: withUnlocks };
    });

    return { updatedRoadmap: updated, actualProgressAdded: totalAdded };
}

// ─── Complete Micro-Task (pure function for testing) ─────────────────────────
export function applyMicroTaskCompletion(
    current: RoadmapCategory[],
    categoryId: string,
    topicId: string,
    taskId: string,
    isCompleted: boolean
): { roadmap: RoadmapCategory[]; microTaskDiff: number; topicDiff: number } {
    let microTaskDiff = 0;
    let topicDiff = 0;

    const next: RoadmapCategory[] = JSON.parse(JSON.stringify(current));
    const cat = next.find(c => c.id === categoryId);
    if (!cat) return { roadmap: current, microTaskDiff: 0, topicDiff: 0 };

    const topic = cat.topics.find(t => t.id === topicId);
    if (!topic?.tasks) return { roadmap: current, microTaskDiff: 0, topicDiff: 0 };

    const task = topic.tasks.find((t: any) => t.id === taskId);
    if (!task || task.completed === isCompleted) return { roadmap: current, microTaskDiff: 0, topicDiff: 0 };

    task.completed = isCompleted;
    microTaskDiff = isCompleted ? 1 : -1;

    const wasComplete = topic.completed;
    const allDone = topic.tasks.every((t: any) => t.completed);
    topic.completed = allDone;
    if (allDone) topic.progress = 100;

    topicDiff = allDone && !wasComplete ? 1 : (!allDone && wasComplete ? -1 : 0);

    // Cascade unlock
    next.forEach(c => {
        let prevDone = true;
        c.topics.forEach((t, idx) => {
            t.unlocked = idx === 0 ? true : prevDone;
            prevDone = t.completed;
        });
    });

    return { roadmap: next, microTaskDiff, topicDiff };
}
