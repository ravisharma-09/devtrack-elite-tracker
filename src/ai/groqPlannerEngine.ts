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

    const recentActivity = Object.entries(activityHistory)
        .slice(-3)
        .map(([date, data]) => `${date}: ${data.minutesStudied} mins, Topics: ${data.topics.join(', ')}`)
        .join('\n');

    const recentTopics = recentSessions.slice(-5).map(s => s.topic).join(', ');

    const categoryMins: Record<string, number> = {};
    recentSessions.forEach(s => {
        categoryMins[s.category] = (categoryMins[s.category] || 0) + s.durationMinutes;
    });
    const categoryStats = Object.entries(categoryMins).map(([cat, mins]) => `${cat}: ${mins} mins`).join(' | ');

    const systemPrompt = `
You are an elite coding coach creating a highly actionable, structured daily study plan for a software engineering student.

Context you have:
1. Weak Topics: The areas they are struggling with most right now.
2. Category Breakdown: Which categories they spend the most/least time on recently.
3. Global Standing: Their current absolute skill level across Codeforces and LeetCode.

Your goal is to output:
1. "dailyPlan": A strict array of EXACTLY 3 bullet points. Each point should be a concise actionable task.
2. "motivationalInsight": A 1-sentence personalized encouragement.

AI ANALYSIS RULES:
- Detect their strongest and weakest categories from the Category Breakdown.
- DSA Suggestions: Suggest specific DSA problems by difficulty (Easy/Med/Hard) aligned with their LeetCode/CF proxy skill.
- Topic-based practice: If there are identified weak topics, prioritize practicing them.
- Open Source: If Open Source time is very low, suggest finding and fixing small open source issues to build PR count.
- External Requirements: If Maths or Chemistry have 0 recorded minutes, remind them to reinforce these.

You MUST return ONLY a JSON object with this exact schema:
{
    "dailyPlan": [
        "Solve 2 Medium LeetCode problems on Arrays",
        "Build a basic React component for your portfolio",
        "Read one article on System Design load balancing"
    ],
    "motivationalInsight": "You've been consistent, keep mastering Arrays!"
}
`;

    const userPrompt = `
Leaderboard / Global Telemetry:
Overall Skill Score: ${skillProfile?.overallScore || 0}/100
Codeforces: ${skillProfile?.cfRating || '0'} rating
LeetCode: ${skillProfile?.lcTotalSolved || 0} solved

Weak Topics: ${weakTopics.length > 0 ? weakTopics.join(', ') : 'None specifically.'}

Category Time Spent (All Time/Recent Context):
${categoryStats || 'No category data recorded yet.'}

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
