import { getSupabaseClient } from '../backend/supabaseClient';

export async function syncEngine(userIdParam: string) {
    console.log("Syncing CF...");
    const supabase = await getSupabaseClient();
    if (!supabase) return false;

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    if (!userId) {
        console.error("❌ SyncEngine: No authenticated user found.");
        return false;
    }

    try {
        console.log("🔄 Syncing Codeforces & GitHub...");
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (!profile) return false;

        // 1. SYNC CODEFORCES
        if (profile.cf_handle) {
            try {
                const res = await fetch(`https://codeforces.com/api/user.status?handle=${profile.cf_handle}`);
                const data = await res.json();

                if (data.status === 'OK' && data.result) {
                    const submissions = data.result;

                    for (const sub of submissions) {
                        const problem = sub.problem;
                        if (!problem) continue;

                        const topic = problem.tags && problem.tags.length > 0 ? problem.tags[0] : 'General';
                        const verdict = sub.verdict;

                        // Insert into problem_attempts
                        await supabase.from('problem_attempts').insert({
                            user_id: userId,
                            platform: 'codeforces',
                            problem_id: `${problem.contestId}-${problem.index}`,
                            name: problem.name,
                            topic: topic,
                            rating: problem.rating || 0,
                            verdict: verdict,
                            created_at: new Date(sub.creationTimeSeconds * 1000).toISOString()
                        }).catch(() => { }); // catch dupe unique constrained errors gracefully

                        // If solved, also log it as an activity for the heatmap/pipeline
                        if (verdict === 'OK') {
                            await supabase.from('activities').insert({
                                user_id: userId,
                                source: 'codeforces',
                                type: 'solve',
                                title: `Solved ${problem.name}`,
                                topic: topic,
                                difficulty: problem.rating ? problem.rating.toString() : 'Medium',
                                rating: problem.rating || 0,
                                created_at: new Date(sub.creationTimeSeconds * 1000).toISOString()
                            }).catch(() => { });
                        }
                    }
                }
            } catch (e) {
                console.error("Codeforces Sync Failed:", e);
            }
        }

        // 2. SYNC GITHUB
        if (profile.github_username) {
            try {
                const res = await fetch(`https://api.github.com/users/${profile.github_username}/events/public`);
                if (res.ok) {
                    const events = await res.json();
                    for (const event of events) {
                        if (event.type === 'PushEvent') {
                            await supabase.from('activities').insert({
                                user_id: userId,
                                source: 'github',
                                type: 'commit',
                                title: `Pushed code to ${event.repo.name}`,
                                topic: 'Git',
                                difficulty: 'Easy',
                                created_at: event.created_at
                            }).catch(() => { });
                        } else if (event.type === 'PullRequestEvent' && event.payload.action === 'opened') {
                            await supabase.from('activities').insert({
                                user_id: userId,
                                source: 'github',
                                type: 'commit',
                                title: `Opened PR in ${event.repo.name}`,
                                topic: 'Open Source',
                                difficulty: 'Medium',
                                created_at: event.created_at
                            }).catch(() => { });
                        }
                    }
                }
            } catch (e) {
                console.error("GitHub Sync Failed:", e);
            }
        }

        return true;

    } catch (e) {
        console.error("Sync Engine Execution Failed:", e);
        return false;
    }
}
