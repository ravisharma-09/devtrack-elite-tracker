import { getSupabaseClient } from '../backend/supabaseClient';

export async function leaderboardEngine(): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    try {
        console.log("🏆 Updating Leaderboard Ranks...");

        // The leaderboard is essentially a materialized view of profiles
        // For now, we can just ensure that the `leaderboard_stats` table 
        // is kept in sync with the `profiles` table.
        // A more complex implementation might run a cron job, but doing it
        // on login ensures the active user's stats are fresh.

        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*');

        if (profileError || !profiles) {
            console.error("Failed to fetch profiles for leaderboard update");
            return;
        }

        for (const profile of profiles) {
            await supabase
                .from('leaderboard_stats')
                .upsert({
                    user_id: profile.id,
                    username: profile.username || 'Anonymous',
                    skill_score: profile.skill_score || 0,
                    problems_solved: profile.problems_solved || 0,
                    consistency_score: profile.consistency_score || 0,
                    codeforces_rating: profile.cf_rating || 0,
                    last_updated: new Date().toISOString()
                }, { onConflict: 'user_id' });
        }

        console.log("✅ Leaderboard Engine Completed");

    } catch (e) {
        console.error("Leaderboard Engine Execution Failed:", e);
    }
}

export { leaderboardEngine as runLeaderboardEngine };

