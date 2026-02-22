import { getSupabaseClient } from '../backend/supabaseClient';

export async function runAnalysisEngine(userId: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    try {
        // 1. Fetch user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (!profile) return;

        // 2. Fetch all problem history
        const { data: problems } = await supabase
            .from('problem_history')
            .select('topic, solved')
            .eq('user_id', userId);

        // 3. Fetch all activities for consistency & study minutes
        const { data: activities } = await supabase
            .from('activities')
            .select('type, created_at')
            .eq('user_id', userId);

        let problemsSolved = profile.problems_solved || 0;
        let cfRating = profile.cf_rating || 0;
        let studyMinutes = profile.study_minutes || 0;

        // Calculate consistency days (unique active days)
        const activeDays = new Set<string>();
        if (activities) {
            for (const act of activities) {
                if (act.type === 'study') studyMinutes += 30; // Approximation if missing
                const date = act.created_at.split('T')[0];
                activeDays.add(date);
            }
        }
        const consistencyDays = activeDays.size;

        // Calculate skill score
        // Algorithm: (problems_solved * 5) + (cf_rating * 2) + (study_minutes / 10) + (consistency_days * 10)
        let skillScore = Math.floor(
            (problemsSolved * 5) +
            (cfRating * 2) +
            (studyMinutes / 10) +
            (consistencyDays * 10)
        );

        // Calculate weak/strong topics from problem_history
        const topicStats: Record<string, { attempts: number; solved: number }> = {};

        if (problems) {
            for (const p of problems) {
                if (!p.topic || p.topic === 'general' || p.topic === 'mixed') continue;
                // Topics can be comma separated
                const tags = p.topic.split(',').map((t: string) => t.trim());
                for (const tag of tags) {
                    if (!topicStats[tag]) topicStats[tag] = { attempts: 0, solved: 0 };
                    topicStats[tag].attempts += 1;
                    if (p.solved) topicStats[tag].solved += 1;
                }
            }
        }

        const weakTopics: string[] = [];
        const strongTopics: string[] = [];

        Object.entries(topicStats).forEach(([topic, stats]) => {
            const solveRate = stats.solved / stats.attempts;
            // Low solve count / high failure count = weak
            if (stats.attempts > 3 && solveRate < 0.4) {
                weakTopics.push(topic);
            } else if (stats.attempts >= 2 && solveRate > 0.7) {
                strongTopics.push(topic);
            }
        });

        // Store results in ai_analytics_cache
        await supabase.from('ai_analytics_cache').upsert({
            user_id: userId,
            weak_topics: weakTopics,
            strong_topics: strongTopics,
            updated_at: new Date().toISOString()
        });

        // Update profile with new skill score and study minutes
        await supabase.from('profiles').update({
            skill_score: skillScore,
            study_minutes: studyMinutes
        }).eq('id', userId);

    } catch (e) {
        console.error('[DevTrack] Analysis engine failed', e);
    }
}
