import { invokeGroqJSON } from './groqClient';
import type { ActivityHistory, StudySession } from '../types';
import type { SkillProfile } from '../engine/analyticsEngine';

export interface GroqDailyPlan {
    dailyPlan: string[];
    motivationalInsight: string;
}

export async function getGroqDailyPlan(
    weakTopics: string[],
    activityHistory: ActivityHistory,
    recentSessions: StudySession[],
    skillProfile: SkillProfile | null
): Promise<GroqDailyPlan> {

    // Serialize basic history to give the AI context on what they did recently
    const recentActivity = Object.entries(activityHistory)
        .slice(-3) // last 3 days
        .map(([date, data]) => `${date}: ${data.minutesStudied} mins, Topics: ${data.topics.join(', ')}`)
        .join('\n');

    const recentTopics = recentSessions.slice(-5).map(s => s.topic).join(', ');

    const systemPrompt = `
You are an elite coding coach creating a highly actionable, structured daily study plan for a software engineering student.

Context you have:
1. Weak Topics: The areas they are struggling with most right now.
2. Recent Activity: What they have been studying in the last 72 hours.
3. Recent Sessions: Specific micro-tasks they just completed.
4. Global Standing: Their current absolute skill level across DevTrack, Codeforces, and LeetCode.

Your goal is to output:
1. "dailyPlan": A strict array of EXACTLY 3 bullet points. Each point should be a concise, direct, actionable task for today. 
2. "motivationalInsight": A 1-sentence personalized encouragement based on their recent activity.

RULES:
- Balance the plan: e.g., 1 DSA task, 1 Dev task, 1 Core conceptual review.
- Prioritize their Weak Topics directly.
- DO NOT use markdown formatting like asterisks or bolding inside the bullet strings.

You MUST return ONLY a JSON object with this exact schema:
{
    "dailyPlan": [
        "Solve 2 Medium LeetCode problems on Arrays",
        "Build a basic React component for your portfolio",
        "Read one article on System Design load balancing"
    ],
    "motivationalInsight": "You've been consistent for the last 3 days, keep mastering Arrays today!"
}
`;

    const userPrompt = `
Leaderboard / Global Telemetry:
Overall Skill Score: ${skillProfile?.overallScore || 0}/100
Codeforces: ${skillProfile?.cfRating || '0'} rating
LeetCode: ${skillProfile?.lcTotalSolved || 0} solved

Weak Topics: ${weakTopics.length > 0 ? weakTopics.join(', ') : 'None specifically, doing great overall.'}

Recent Study History (Last 3 Days):
${recentActivity || 'No recent activity recorded.'}

Recently completed study sessions:
${recentTopics || 'None recently.'}

Return my daily plan in JSON format.
`;

    const data = await invokeGroqJSON([
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
    ], 0.3);

    return {
        dailyPlan: data.dailyPlan || [
            "Complete 1 Micro-task from your pending DevTrack Roadmap",
            "Solve 1 algorithmic problem to keep your brain sharp",
            "Review your consistency heatmap to plan tomorrow's session"
        ],
        motivationalInsight: data.motivationalInsight || "Keep pushing forward, consistency is the key to engineering."
    };
}
