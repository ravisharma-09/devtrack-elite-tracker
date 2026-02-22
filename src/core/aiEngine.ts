import { getSupabaseClient } from '../backend/supabaseClient';
import { invokeGroqJSON } from '../ai/groqClient';
import { addRec } from './recommendationEngine';

export async function runAIEngine(userId: string, profile: any, learningTopics: string[], externalStats: any): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    try {
        const cfRating = profile?.cf_rating || 0;
        const problemsSolved = profile?.problems_solved || 0;
        const studyMinutes = profile?.study_minutes || 0;
        const weakTopics = profile?.weak_topics || [];
        const consistencyDays = profile?.consistency_score || 0;

        const githubUsername = profile?.github_username || 'Unknown';
        const leetcodeTotal = externalStats?.lc?.totalSolved || 0;
        const leetcodeHard = externalStats?.lc?.hardSolved || 0;
        const githubCommits = externalStats?.gh?.total_commits_estimate || 0;

        const promptMessages = [
            {
                role: 'system',
                content: `You are an elite AI developer mentor. Analyze the user's Codeforces/LeetCode data, GitHub data, and Web Dev roadmap.
Return EXACTLY a JSON object with this strict structure:
{
  "dsa_analysis": "A detailed 3-4 sentence analysis of their DSA skills, pointing out LeetCode/Codeforces stats and what topic they should learn next.",
  "dsa_recs": [ { "title": "...", "description": "...", "link": "url", "topic": "topic", "difficulty": "Hard|Medium|Easy" } ],
  "github_analysis": "A detailed 3-4 sentence analysis of their GitHub commit history and what open source areas they should target next.",
  "opensource_recs": [ { "title": "...", "description": "...", "link": "url", "topic": "topic", "difficulty": "Hard|Medium|Easy" } ],
  "webdev_analysis": "A detailed 3-4 sentence analysis of their web dev roadmap and what tiny practical projects they should build.",
  "webdev_recs": [ { "title": "...", "description": "...", "link": "url", "topic": "topic", "difficulty": "Hard|Medium|Easy" } ]
}
Rules:
- Provide exactly 5 items for "dsa_recs".
- Provide exactly 2 items for "opensource_recs".
- Provide exactly 2 items for "webdev_recs".
- Ensure the JSON is perfectly valid.`
            },
            {
                role: 'user',
                content: `Developer Telemetry Profile:
- Codeforces Rating: ${cfRating}
- LeetCode Solved: ${leetcodeTotal} (Hard: ${leetcodeHard})
- GitHub Commits: ${githubCommits} (${githubUsername})
- Problems Solved (Total Platform): ${problemsSolved}
- Study Streak Days: ${consistencyDays}
- Study Minutes: ${studyMinutes}
- Weak Topics: ${weakTopics.length > 0 ? weakTopics.join(', ') : 'None identified'}
- Roadmap Focus: ${learningTopics.length > 0 ? learningTopics.join(', ') : 'None'}

Generate the deep analysis text + the recommendation cards array for each of the 3 domains.`
            }
        ];

        const aiResponse = await invokeGroqJSON(promptMessages as any, 0.5);

        if (aiResponse) {
            // Save Recommendations
            if (aiResponse.dsa_recs && Array.isArray(aiResponse.dsa_recs)) {
                for (const item of aiResponse.dsa_recs) {
                    await addRec(supabase, userId, 'dsa', item.title, item.description, item.link, item.topic, item.difficulty);
                }
            }
            if (aiResponse.webdev_recs && Array.isArray(aiResponse.webdev_recs)) {
                for (const item of aiResponse.webdev_recs) {
                    await addRec(supabase, userId, 'webdev', item.title, item.description, item.link, item.topic, item.difficulty);
                }
            }
            if (aiResponse.opensource_recs && Array.isArray(aiResponse.opensource_recs)) {
                for (const item of aiResponse.opensource_recs) {
                    await addRec(supabase, userId, 'opensource', item.title, item.description, item.link, item.topic, item.difficulty);
                }
            }

            // Save the Analysis text blocks into ai_analytics_cache under "targeted_practice_analysis"
            const { data: currentCache } = await supabase.from('ai_analytics_cache').select('suggestions').eq('user_id', userId).single();
            const existingSuggestions = currentCache?.suggestions || {};

            await supabase.from('ai_analytics_cache').upsert({
                user_id: userId,
                suggestions: {
                    ...existingSuggestions,
                    targeted_practice_analysis: {
                        dsa: aiResponse.dsa_analysis || "Keep practicing data structures and algorithms.",
                        github: aiResponse.github_analysis || "Keep building and committing to GitHub.",
                        webdev: aiResponse.webdev_analysis || "Keep building web development projects."
                    }
                }
            });
        }
    } catch (e) {
        console.error('[DevTrack Core] AI Engine failed:', e);
    }
}
