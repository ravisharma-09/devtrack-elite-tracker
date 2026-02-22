import { getSupabaseClient } from '../backend/supabaseClient';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export async function runAISuggestionEngine(userId: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    try {
        // Fetch Profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('username, skill_score, problems_solved')
            .eq('id', userId)
            .single();

        // Fetch Cache for Weak Topics
        const { data: cache } = await supabase
            .from('ai_analytics_cache')
            .select('weak_topics, strong_topics')
            .eq('user_id', userId)
            .single();

        const weak = cache?.weak_topics?.join(', ') || 'General Algorithms';
        const strong = cache?.strong_topics?.join(', ') || 'Basics';

        const prompt = `You are an elite AI coding coach.
        User: ${profile?.username || 'Operative'}
        Skill Score: ${profile?.skill_score || 0}
        Problems Solved: ${profile?.problems_solved || 0}
        Weak Topics: ${weak}
        Strong Topics: ${strong}

        Write a short (2-3 sentences max), highly motivational message in a cyberpunk/hacker tone.
        Acknowledge their strengths, but push them to grind on their weak topics. Give them a mission.
        Do not use any hashtags. Always stay in character.`;

        if (!GROQ_API_KEY) {
            console.warn('[DevTrack] VITE_GROQ_API_KEY not found. Skipping AI generation.');
            return;
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: 'llama3-70b-8192', // or any lightweight fast model
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 150
            })
        });

        if (response.ok) {
            const result = await response.json();
            const message = result.choices[0]?.message?.content?.trim();

            if (message) {
                await supabase.from('ai_analytics_cache').upsert({
                    user_id: userId,
                    ai_motivational_message: message,
                    updated_at: new Date().toISOString()
                });
            }
        } else {
            console.error('[DevTrack] Groq API returned error:', await response.text());
        }

    } catch (e) {
        console.error('[DevTrack] AI Suggestion engine failed', e);
    }
}
