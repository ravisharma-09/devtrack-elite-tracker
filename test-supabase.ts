import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vqjbakskjswuibpmbqyu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxamJha3NranN3dWlicG1icXl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MDkwNzcsImV4cCI6MjA4NzE4NTA3N30.g1x_16r6PQjC8D8BE91rVj0fEWLsVCJj4P88s5ZcZbw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    console.log("Checking profiles...");
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
    console.log(pErr ? pErr : `Profiles found: ${profiles?.length}`);
    if (profiles && profiles.length > 0) {
        const userId = profiles[0].id;
        console.log(`Checking recommendations for user ${userId}...`);
        const { data: recs, error: rErr } = await supabase.from('recommendations').select('*').eq('user_id', userId);
        console.log(rErr ? rErr : `Recommendations found: ${recs?.length}`);
        if(recs) console.log(recs);
        
        console.log(`Checking AI cache for user ${userId}...`);
        const { data: cache, error: cErr } = await supabase.from('ai_analytics_cache').select('suggestions').eq('user_id', userId).single();
        console.log(cErr ? cErr : `AI Cache suggestions available: ${!!cache?.suggestions?.targeted_practice_analysis}`);
    }
}

checkData();
