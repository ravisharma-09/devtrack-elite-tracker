import { invokeGroqJSON } from './groqClient';
import type { RoadmapCategory } from '../types';
import type { SkillProfile } from '../engine/analyticsEngine';

export interface TopicPriority {
    topic: string;
    reason: string;
    priority: "High" | "Medium" | "Low";
}

export interface GroqTopicAnalysis {
    weakTopics: string[];
    strongTopics: string[];
    priorityTopics: TopicPriority[];
}

export async function getGroqTopicAnalysis(
    skillProfile: SkillProfile | null,
    roadmap: RoadmapCategory[]
): Promise<GroqTopicAnalysis> {

    // 1. Serialize Roadmap Progress
    let roadmapSummary = roadmap.map(cat => {
        const total = cat.topics.length;
        const done = cat.topics.filter(t => t.completed).length;
        const topicNames = cat.topics.map(t => `${t.title} (${t.completed ? 'Done' : 'Pending'})`).join(', ');
        return `${cat.title} (${done}/${total}): ${topicNames}`;
    }).join('\n');

    // 2. Serialize Stats
    const statsSummary = `
LeetCode Solved: ${skillProfile?.lcTotalSolved ?? 0} (Easy: ${skillProfile?.lcEasySolved ?? 0}, Med: ${skillProfile?.lcMediumSolved ?? 0}, Hard: ${skillProfile?.lcHardSolved ?? 0})
Codeforces Rating: ${skillProfile?.cfRating ?? 0} (Rank: ${skillProfile?.cfRank ?? 'unrated'})
GitHub Activity: ${skillProfile?.ghLastMonthCommits ?? 0} commits this month
Overall Skill Score: ${skillProfile?.overallScore ?? 0}/100
Consistency Score: ${skillProfile?.consistencyScore ?? 0}/100
    `.trim();

    const systemPrompt = `
You are an elite AI Coding Coach analyzing a software engineering student's progress.
Your job is to identify their strengths, weaknesses, and prioritize exactly what they need to study next.

Data provided:
1. Roadmap Progress (topics marked Done or Pending)
2. External Stats (LeetCode, Codeforces, GitHub)

You must return ONLY a raw JSON object with this exact schema:
{
  "weakTopics": ["Topic 1", "Topic 2"],
  "strongTopics": ["Topic A", "Topic B"],
  "priorityTopics": [
     { "topic": "Topic Name", "reason": "Short reason why", "priority": "High" }
  ]
}

Logic Rules:
- If a topic is Pending and they have low LeetCode/CF stats, it's a Weak Topic.
- If a topic is Done, it's a Strong Topic (unless their stats contradict it).
- Prioritize high-value DSA topics (Graphs, DP, Trees) if they have low LC Hard/CF Rating.
- "priorityTopics" must be the absolute best next steps for them to focus on.
`;

    const userPrompt = `
User Roadmap Progress:
${roadmapSummary}

External Stats:
${statsSummary}

Return the JSON analysis.
`;

    const data = await invokeGroqJSON([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ]);

    return {
        weakTopics: data.weakTopics || [],
        strongTopics: data.strongTopics || [],
        priorityTopics: data.priorityTopics || []
    };
}
