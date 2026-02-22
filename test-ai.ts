import { runRecommendationEngine } from './src/core/recommendationEngine';
import { getSupabaseClient } from './src/backend/supabaseClient';

async function test() {
    const supabase = await getSupabaseClient();
    if (!supabase) {
        console.error('No Supabase client.');
        return;
    }

    // Auth logic is skipped in this pure function test, so find a user id
    const { data: users } = await supabase.from('profiles').select('id').limit(1);
    if (!users || users.length === 0) {
        console.error('No users found in database to test.');
        return;
    }

    const userId = users[0].id;
    console.log(`Running AI Recommendation Engine for user ${userId}...`);

    await runRecommendationEngine(userId);
    console.log('Finished execution.');
    process.exit(0);
}

test();
