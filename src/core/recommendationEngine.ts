import { getSupabaseClient } from '../backend/supabaseClient';
import { runAIEngine } from './aiEngine.ts';
import problemBank from '../data/problemBank.json';

export async function addRec(supabase: any, user_id: string, type: string, title: string, description: string, link: string, topic: string, difficulty: string) {
    await supabase.from('recommendations').insert({
        user_id, type,
        content: { title, description, link, topic, difficulty }
    });
}

export async function recommendationEngine(userIdParam: string): Promise<void> {
    console.log("🧩 Generating Recommendations...");
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    const verifiedUserId = user?.id;
    if (!verifiedUserId) {
        console.error("❌ Recommendation Engine: No authenticated user found.");
        return;
    }

    try {
        // Clear old recommendations
        await supabase.from('recommendations').delete().eq('user_id', verifiedUserId);

        // Fetch profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('cf_rating, weak_topics, problems_solved, github_username')
            .eq('id', verifiedUserId)
            .single();

        // Fetch roadmap
        const { data: roadmap } = await supabase
            .from('roadmap_progress')
            .select('topic_id')
            .eq('user_id', verifiedUserId)
            .eq('completed', false);

        // Fetch external stats for deep AI analysis
        const { data: externalStats } = await supabase
            .from('external_stats')
            .select('*')
            .eq('user_id', verifiedUserId)
            .single();

        const weakTopics: string[] = profile?.weak_topics || [];
        const learningTopics: string[] = roadmap?.map((r: any) => r.topic_id?.toLowerCase() || '')?.filter(Boolean) || [];
        const cfRating: number = profile?.cf_rating || 800;

        // ── 1. DSA PROBLEMS ─────────────────────────────────────────────────
        // Find problems near the user's CF rating (+/- 200), fallback to all rating=800 problems
        let availableProblems = (problemBank as any[]).filter(
            p => p.rating >= cfRating - 100 && p.rating <= cfRating + 200
        );

        if (availableProblems.length === 0) {
            // Ultimate fallback — grab all beginner problems
            availableProblems = (problemBank as any[]).filter(p => p.rating <= 900);
        }

        // Prefer weak topic matches, then fill with general problems
        const weakMatches = availableProblems.filter(p => weakTopics.includes(p.topic));
        const nonWeakMatches = availableProblems.filter(p => !weakTopics.includes(p.topic));

        const selectedAlgorithms: any[] = [...weakMatches.slice(0, 3)];
        const remainingNeeded = 3 - selectedAlgorithms.length;
        if (remainingNeeded > 0) {
            selectedAlgorithms.push(...nonWeakMatches.slice(0, remainingNeeded));
        }

        // Absolute fallback — always have at least 3 DSA cards
        const hardcodedStarters = [
            { name: 'Watermelon', link: 'https://codeforces.com/problemset/problem/4/A', topic: 'Math', rating: 800 },
            { name: 'Way Too Long Words', link: 'https://codeforces.com/problemset/problem/71/A', topic: 'Strings', rating: 800 },
            { name: 'Team', link: 'https://codeforces.com/problemset/problem/231/A', topic: 'Greedy', rating: 800 },
        ];
        while (selectedAlgorithms.length < 3) {
            const fill = hardcodedStarters[selectedAlgorithms.length];
            if (fill) selectedAlgorithms.push(fill);
            else break;
        }

        for (const prob of selectedAlgorithms) {
            const diff = prob.rating > 1400 ? 'Hard' : prob.rating > 1000 ? 'Medium' : 'Easy';
            await addRec(supabase, verifiedUserId, 'dsa', prob.name, `Targeted practice for ${prob.topic} at rating ${prob.rating}.`, prob.link, prob.topic, diff);
        }

        // ── 2. WEB PROJECTS ─────────────────────────────────────────────────
        // Always add at least one webdev card for new users
        let addedWebdev = false;
        for (const topic of learningTopics) {
            if (topic.includes('dom')) {
                await addRec(supabase, verifiedUserId, 'webdev', 'Todo App', 'Master DOM manipulation.', 'https://github.com/topics/todo-app', 'DOM', 'Medium');
                addedWebdev = true; break;
            } else if (topic.includes('fetch')) {
                await addRec(supabase, verifiedUserId, 'webdev', 'Weather App', 'Master APIs.', 'https://github.com/topics/weather-app', 'Fetch API', 'Medium');
                addedWebdev = true; break;
            } else if (topic.includes('react')) {
                await addRec(supabase, verifiedUserId, 'webdev', 'Blog App', 'Master State and Props.', 'https://github.com/topics/react-blog', 'React', 'Hard');
                addedWebdev = true; break;
            } else if (topic.includes('hooks')) {
                await addRec(supabase, verifiedUserId, 'webdev', 'Dashboard Clone', 'Master custom hooks.', 'https://github.com/topics/react-dashboard', 'React Hooks', 'Hard');
                addedWebdev = true; break;
            }
        }
        // Default webdev card for users with no roadmap progress yet
        if (!addedWebdev) {
            await addRec(supabase, verifiedUserId, 'webdev', 'Portfolio Website', 'Build your first personal portfolio with HTML, CSS and JS.', 'https://github.com/topics/portfolio', 'HTML/CSS', 'Easy');
        }

        // ── 3. OPEN SOURCE ──────────────────────────────────────────────────
        await addRec(supabase, verifiedUserId, 'opensource', 'First Contributions', 'Perfect place for beginners to make their first open-source PR.', 'https://github.com/firstcontributions/first-contributions', 'Git', 'Easy');
        await addRec(supabase, verifiedUserId, 'opensource', 'Good First Issues', 'Browse open issues labeled good-first-issue across GitHub.', 'https://goodfirstissues.com', 'Open Source', 'Easy');

        // ── 4. AI ANALYSIS ──────────────────────────────────────────────────
        try {
            await runAIEngine(verifiedUserId, profile, learningTopics, externalStats);
        } catch (aiErr) {
            console.warn("AI Engine skipped (non-critical):", aiErr);
        }

        console.log("✅ Recommendation Engine Completed");

    } catch (e) {
        console.error('[DevTrack Core] Recommendation Engine failed:', e);
    }
}

export { recommendationEngine as runRecommendationEngine };
