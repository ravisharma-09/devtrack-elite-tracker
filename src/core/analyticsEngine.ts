import { getSupabaseClient } from '../backend/supabaseClient';

export async function runAnalyticsEngine(userId: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    try {
        // 1. Fetch current profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (!profile) return;

        // 2. Fetch all telemetry activities for this user
        const { data: activities } = await supabase
            .from('activities')
            .select('*')
            .eq('user_id', userId);

        let problemsSolved = 0;
        let cfRating = profile.cf_rating || 0;
        let studyMinutes = 0;
        let githubCommits = 0;

        const activeDays = new Set<string>();
        const topicStats: Record<string, { attempts: number; solved: number }> = {};

        if (activities && activities.length > 0) {
            for (const act of activities) {
                // Consistency tracking (unique days active)
                const date = act.created_at.split('T')[0];
                activeDays.add(date);

                // Aggregations based on type
                if (act.type === 'solve') {
                    problemsSolved += 1;

                    // Track topics
                    if (act.topic && act.topic !== 'general') {
                        const tags = act.topic.split(',').map((t: string) => t.trim());
                        for (const tag of tags) {
                            if (!topicStats[tag]) topicStats[tag] = { attempts: 0, solved: 0 };
                            topicStats[tag].attempts += 1;
                            topicStats[tag].solved += 1; // Assuming 'solve' means successful
                        }
                    }

                    // Update CF Rating if it's a Codeforces solve (we might want a more accurate way to track rating history later)
                    if (act.source === 'codeforces' && act.score > cfRating) {
                        cfRating = act.score; // Max out rating from problems solved as a proxy if profile doesn't have it
                    }

                } else if (act.type === 'study') {
                    // DevTrack study sessions
                    studyMinutes += (act.score || 30); // Default 30 mins if score not set
                } else if (act.type === 'commit') {
                    githubCommits += (act.score || 1);
                }
            }
        }

        const consistencyDays = activeDays.size;

        // Calculate weak/strong topics
        const weakTopics: string[] = [];
        const strongTopics: string[] = [];

        Object.entries(topicStats).forEach(([topic, stats]) => {
            const solveRate = stats.solved / stats.attempts;
            // E.g. low solve rate or few solves total could be weak, but since we mostly track ACs (Accepteds) here,
            // we'll say if attempts are low, it's weak, if high it's strong.
            // Ideally telemetry tracks failed attempts too, but with current proxy APIs we only get ACs.
            if (stats.solved < 3) {
                weakTopics.push(topic);
            } else if (stats.solved >= 5) {
                strongTopics.push(topic);
            }
        });

        // Calculate skill score
        // skill_score = (problems_solved * 4) + (cf_rating * 1.5) + (consistency_days * 15) + (study_minutes / 5) + (github_activity_score * 2)
        const skillScore = Math.floor(
            (problemsSolved * 4) +
            (cfRating * 1.5) +
            (consistencyDays * 15) +
            (studyMinutes / 5) +
            (githubCommits * 2)
        );

        // Update profile table
        const { error } = await supabase.from('profiles').update({
            skill_score: skillScore,
            problems_solved: problemsSolved,
            cf_rating: cfRating,
            consistency_score: consistencyDays, // Mapping consistency_days to consistency_score column
            weak_topics: weakTopics,
            strong_topics: strongTopics,
            study_minutes: studyMinutes
        }).eq('id', userId);

        if (error) {
            console.error('[DevTrack Core] Error updating profile analytics:', error);
        }

    } catch (e) {
        console.error('[DevTrack Core] Analytics Engine failed:', e);
    }
}
