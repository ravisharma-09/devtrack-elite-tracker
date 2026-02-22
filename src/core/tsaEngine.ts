import { getSupabaseClient } from '../backend/supabaseClient';

export async function tsaEngine(userIdParam: string) {
    console.log("Running TSA");
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    const verifiedUserId = user?.id;
    if (!verifiedUserId) {
        console.error("❌ TSA Engine: No authenticated user found.");
        return;
    }

    try {
        console.log("🧠 Running TSA Analysis...");
        // Query problem_attempts for user
        const { data: attempts } = await supabase
            .from('problem_attempts')
            .select('*')
            .eq('user_id', verifiedUserId);

        if (!attempts || attempts.length === 0) return;

        // Group by topic
        const topicStats: Record<string, { attempts: number; solved: number; ratings: number[] }> = {};

        for (const attempt of attempts) {
            const topic = attempt.topic || 'General';
            if (!topicStats[topic]) {
                topicStats[topic] = { attempts: 0, solved: 0, ratings: [] };
            }

            topicStats[topic].attempts++;
            if (attempt.verdict === 'OK') {
                topicStats[topic].solved++;
                if (attempt.rating > 0) {
                    topicStats[topic].ratings.push(attempt.rating);
                }
            }
        }

        const strongTopics: string[] = [];
        const weakTopics: string[] = [];
        let totalSolved = 0;
        let highestRating = 0;
        let rollingAverageSum = 0;
        let rollingAverageCount = 0;

        // Calculate success_rate, avg_rating, max_rating
        for (const [topic, stats] of Object.entries(topicStats)) {
            totalSolved += stats.solved;
            const successRate = stats.attempts > 0 ? (stats.solved / stats.attempts) * 100 : 0;

            const maxRating = stats.ratings.length > 0 ? Math.max(...stats.ratings) : 0;
            const avgRating = stats.ratings.length > 0
                ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length
                : 0;

            if (maxRating > highestRating) highestRating = maxRating;
            if (avgRating > 0) {
                rollingAverageSum += avgRating;
                rollingAverageCount++;
            }

            // Classify
            if (successRate > 80 && avgRating > 1200) {
                strongTopics.push(topic);
            } else if (successRate < 50 || (successRate >= 50 && successRate <= 80 && avgRating < 1200)) {
                weakTopics.push(topic);
            }
        }

        const globalAvgRating = rollingAverageCount > 0 ? Math.round(rollingAverageSum / rollingAverageCount) : 0;

        // Calculate abstract skill score based on Codeforces + generic metrics
        const baseScore = totalSolved * 10;
        const ratingBonus = globalAvgRating > 0 ? globalAvgRating : 0;
        const skillScore = baseScore + ratingBonus;

        let level = 'Beginner';
        if (skillScore > 5000) level = 'Expert';
        else if (skillScore > 2000) level = 'Advanced';
        else if (skillScore > 500) level = 'Intermediate';

        // Update profiles table
        await supabase
            .from('profiles')
            .update({
                strong_topics: strongTopics,
                weak_topics: weakTopics,
                skill_score: skillScore,
                problems_solved: totalSolved,
                current_level: level
            })
            .eq('id', verifiedUserId);

        console.log("✅ TSA Engine Completed");

    } catch (e) {
        console.error("TSA Engine Execution Failed:", e);
    }
}
