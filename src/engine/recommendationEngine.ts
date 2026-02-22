import { getSupabaseClient } from '../backend/supabaseClient';

export async function runRecommendationEngine(userId: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    try {
        // Fetch active roadmap topics to know what web dev they are learning
        const { data: roadmap } = await supabase
            .from('roadmap_progress')
            .select('topic_id, completed')
            .eq('user_id', userId)
            .eq('completed', false);

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        const { data: cache } = await supabase
            .from('ai_analytics_cache')
            .select('weak_topics')
            .eq('user_id', userId)
            .single();

        const weakTopics = cache?.weak_topics || [];
        const learningTopics = roadmap?.map((r: any) => r.topic_id?.toLowerCase()) || [];

        const cfRating = profile?.cf_rating || 0;
        const problemsSolved = profile?.total_problems_solved || 0;
        const studyMinutes = profile?.study_minutes || 0;

        // Prompt for Groq LLM
        const promptMessages = [
            {
                role: 'system',
                content: `You are an expert AI programming mentor. Your job is to analyze the user's current progress and recommend EXACTLY three categories of practice:
1. Data Structures and Algorithms (DSA): 3 problem recommendations.
2. Web Development Projects: 2 applied project recommendations.
3. Open Source Contributions: 2 open source project or issue recommendations.

Return a JSON object with this exact structure:
{
  "dsa": [ { "title": "...", "description": "...", "link": "url", "topic": "topic", "difficulty": "Hard|Medium|Easy" } ],
  "projects": [ { "title": "...", "description": "...", "link": "url", "topic": "topic", "difficulty": "Hard|Medium|Easy" } ],
  "opensource": [ { "title": "...", "description": "...", "link": "url", "topic": "topic", "difficulty": "Hard|Medium|Easy" } ]
}`
            },
            {
                role: 'user',
                content: `User Profile:
- Codeforces Rating: ${cfRating}
- Problems Solved: ${problemsSolved}
- Study Minutes: ${studyMinutes}
- Weak Topics identified by AI engine: ${weakTopics.length > 0 ? weakTopics.join(', ') : 'None identified yet'}
- Current Learning Roadmap Topics: ${learningTopics.length > 0 ? learningTopics.join(', ') : 'None targeted currently'}

Generate the recommendations based on this profile. Make them realistic and tailored.`
            }
        ];

        // Call Groq LLM
        const { invokeGroqJSON } = await import('../ai/groqClient');
        const aiResponse = await invokeGroqJSON(promptMessages as any, 0.4);


    }

async function addRec(supabase: any, user_id: string, type: string, title: string, description: string, link: string, topic: string, difficulty: string) {
        await supabase.from('recommendations').insert({
            user_id, type, title, description, link, topic, difficulty
        });
    }
