import type { RoadmapCategory } from '../types';

export const initialRoadmap: RoadmapCategory[] = [
    {
        id: 'dsa',
        title: 'DSA Roadmap - Elite Level',
        topics: [
            { id: 'dsa1', title: 'Programming Basics', targetCount: 30, progress: 0, estimatedTime: '1 week', completed: false, unlocked: true },
            { id: 'dsa2', title: 'Arrays', targetCount: 150, progress: 0, estimatedTime: '4 weeks', completed: false, unlocked: false },
            { id: 'dsa3', title: 'Strings', targetCount: 120, progress: 0, estimatedTime: '3 weeks', completed: false, unlocked: false },
            { id: 'dsa4', title: 'Two Pointers', targetCount: 80, progress: 0, estimatedTime: '2 weeks', completed: false, unlocked: false },
            { id: 'dsa5', title: 'Sliding Window', targetCount: 100, progress: 0, estimatedTime: '3 weeks', completed: false, unlocked: false },
            { id: 'dsa6', title: 'Binary Search', targetCount: 100, progress: 0, estimatedTime: '3 weeks', completed: false, unlocked: false },
            { id: 'dsa7', title: 'Stack', targetCount: 80, progress: 0, estimatedTime: '2 weeks', completed: false, unlocked: false },
            { id: 'dsa8', title: 'Queue', targetCount: 60, progress: 0, estimatedTime: '1.5 weeks', completed: false, unlocked: false },
            { id: 'dsa9', title: 'Linked List', targetCount: 100, progress: 0, estimatedTime: '3 weeks', completed: false, unlocked: false },
            { id: 'dsa10', title: 'Hashing', targetCount: 120, progress: 0, estimatedTime: '3 weeks', completed: false, unlocked: false },
            { id: 'dsa11', title: 'Trees', targetCount: 200, progress: 0, estimatedTime: '6 weeks', completed: false, unlocked: false },
            { id: 'dsa12', title: 'Graph', targetCount: 200, progress: 0, estimatedTime: '6 weeks', completed: false, unlocked: false },
            { id: 'dsa13', title: 'Dynamic Programming', targetCount: 250, progress: 0, estimatedTime: '8 weeks', completed: false, unlocked: false },
        ]
    },
    {
        id: 'webdev',
        title: 'Web Development Roadmap',
        topics: [
            // PHASE 1
            { id: 'web1_1', title: 'PHASE 1: Execution Context', estimatedTime: '2 days', progress: 0, completed: false, unlocked: true },
            { id: 'web1_2', title: 'PHASE 1: Scope', estimatedTime: '2 days', progress: 0, completed: false, unlocked: false },
            { id: 'web1_3', title: 'PHASE 1: Closures', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false },
            { id: 'web1_4', title: 'PHASE 1: Event Loop', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false },
            { id: 'web1_5', title: 'PHASE 1: Promises', estimatedTime: '4 days', progress: 0, completed: false, unlocked: false },
            { id: 'web1_6', title: 'PHASE 1: Async/Await', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false },
            { id: 'web1_7', title: 'PHASE 1: Fetch API', estimatedTime: '2 days', progress: 0, completed: false, unlocked: false },
            { id: 'web1_8', title: 'PHASE 1: Error Handling', estimatedTime: '1 day', progress: 0, completed: false, unlocked: false },
            { id: 'web1_9', title: 'PHASE 1: Modules', estimatedTime: '1 day', progress: 0, completed: false, unlocked: false },
            // PHASE 2
            { id: 'web2_1', title: 'PHASE 2: DOM traversal', estimatedTime: '2 days', progress: 0, completed: false, unlocked: false },
            { id: 'web2_2', title: 'PHASE 2: Event delegation', estimatedTime: '2 days', progress: 0, completed: false, unlocked: false },
            { id: 'web2_3', title: 'PHASE 2: Browser APIs', estimatedTime: '2 days', progress: 0, completed: false, unlocked: false },
            { id: 'web2_4', title: 'PHASE 2: LocalStorage', estimatedTime: '1 day', progress: 0, completed: false, unlocked: false },
            { id: 'web2_5', title: 'PHASE 2: SessionStorage', estimatedTime: '1 day', progress: 0, completed: false, unlocked: false },
            // PHASE 3
            { id: 'web3_1', title: 'PHASE 3: Components', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false },
            { id: 'web3_2', title: 'PHASE 3: JSX', estimatedTime: '1 day', progress: 0, completed: false, unlocked: false },
            { id: 'web3_3', title: 'PHASE 3: Props', estimatedTime: '2 days', progress: 0, completed: false, unlocked: false },
            { id: 'web3_4', title: 'PHASE 3: State', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false },
            { id: 'web3_5', title: 'PHASE 3: Events', estimatedTime: '2 days', progress: 0, completed: false, unlocked: false },
            // PHASE 4
            { id: 'web4_1', title: 'PHASE 4: useEffect', estimatedTime: '4 days', progress: 0, completed: false, unlocked: false },
            { id: 'web4_2', title: 'PHASE 4: Forms', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false },
            { id: 'web4_3', title: 'PHASE 4: Lists and Keys', estimatedTime: '1 day', progress: 0, completed: false, unlocked: false },
            { id: 'web4_4', title: 'PHASE 4: Lifting state', estimatedTime: '2 days', progress: 0, completed: false, unlocked: false },
            { id: 'web4_5', title: 'PHASE 4: Component architecture', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false },
            // PHASE 5
            { id: 'web5_1', title: 'PHASE 5: Custom Hooks', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false },
            { id: 'web5_2', title: 'PHASE 5: Context API', estimatedTime: '4 days', progress: 0, completed: false, unlocked: false },
            { id: 'web5_3', title: 'PHASE 5: Performance optimization', estimatedTime: '4 days', progress: 0, completed: false, unlocked: false },
            { id: 'web5_4', title: 'PHASE 5: Code splitting', estimatedTime: '2 days', progress: 0, completed: false, unlocked: false },
            // PHASE 6
            { id: 'web6_1', title: 'PHASE 6: NodeJS basics', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false },
            { id: 'web6_2', title: 'PHASE 6: Express basics', estimatedTime: '4 days', progress: 0, completed: false, unlocked: false },
            { id: 'web6_3', title: 'PHASE 6: REST APIs', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false },
            { id: 'web6_4', title: 'PHASE 6: JSON', estimatedTime: '1 day', progress: 0, completed: false, unlocked: false },
            // PHASE 7
            { id: 'web7_1', title: 'PHASE 7: Authentication basics', estimatedTime: '5 days', progress: 0, completed: false, unlocked: false },
            { id: 'web7_2', title: 'PHASE 7: Deployment', estimatedTime: '3 days', progress: 0, completed: false, unlocked: false },
            { id: 'web7_3', title: 'PHASE 7: Environment variables', estimatedTime: '1 day', progress: 0, completed: false, unlocked: false },
        ]
    },
    {
        id: 'projects',
        title: 'Project Roadmap',
        topics: [
            { id: 'proj1', title: 'Landing Page', estimatedTime: '1 week', progress: 0, completed: false, unlocked: true },
            { id: 'proj2', title: 'To-Do App', estimatedTime: '2 weeks', progress: 0, completed: false, unlocked: false },
            { id: 'proj3', title: 'DevTrack Dashboard', estimatedTime: '4 weeks', progress: 0, completed: false, unlocked: false },
            { id: 'proj4', title: 'Full React Application', estimatedTime: '6 weeks', progress: 0, completed: false, unlocked: false },
            { id: 'proj5', title: 'Portfolio Website', estimatedTime: '2 weeks', progress: 0, completed: false, unlocked: false },
        ]
    },
    {
        id: 'cs',
        title: 'CS Fundamentals Roadmap',
        topics: [
            { id: 'cs1', title: 'Operating System basics', estimatedTime: '2 weeks', progress: 0, completed: false, unlocked: true },
            { id: 'cs2', title: 'DBMS basics', estimatedTime: '2 weeks', progress: 0, completed: false, unlocked: false },
            { id: 'cs3', title: 'SQL basics', estimatedTime: '2 weeks', progress: 0, completed: false, unlocked: false },
            { id: 'cs4', title: 'Computer Networks basics', estimatedTime: '2 weeks', progress: 0, completed: false, unlocked: false },
        ]
    }
];
