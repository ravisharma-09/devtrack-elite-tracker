import { getSupabaseClient } from '../backend/supabaseClient';
import { runAIEngine } from './aiEngine.ts';
import problemBank from '../data/problemBank.json';

export async function addRec(supabase: any, user_id: string, type: string, title: string, description: string, link: string, topic: string, difficulty: string) {
    const { error } = await supabase.from('recommendations').insert({
        user_id, type,
        content: { title, description, link, topic, difficulty }
    });
    if (error) console.warn('addRec error:', error.message);
}

export async function recommendationEngine(userId: string): Promise<void> {
    if (!userId) {
        console.error('❌ recommendationEngine called with no userId');
        return;
    }
    console.log('🧩 Generating Recommendations for user:', userId);

    const supabase = await getSupabaseClient();
    if (!supabase) return;

    try {
        // Clear old recommendations
        await supabase.from('recommendations').delete().eq('user_id', userId);

        // Fetch profile using the passed userId (NOT supabase.auth.getUser() which can fail)
        const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('cf_rating, weak_topics, problems_solved, github_username')
            .eq('id', userId)
            .single();

        if (profileErr) console.warn('Profile fetch error:', profileErr.message);

        // Fetch roadmap
        const { data: roadmap } = await supabase
            .from('roadmap_progress')
            .select('topic_id')
            .eq('user_id', userId)
            .eq('completed', false);

        // Fetch external stats
        const { data: externalStats } = await supabase
            .from('external_stats')
            .select('*')
            .eq('user_id', userId)
            .single();

        const weakTopics: string[] = profile?.weak_topics || [];
        const learningTopics: string[] = roadmap?.map((r: any) => r.topic_id?.toLowerCase() || '')?.filter(Boolean) || [];
        const cfRating: number = profile?.cf_rating || 800;

        // ── 1. DSA PROBLEMS ─────────────────────────────────────────────────
        let availableProblems = (problemBank as any[]).filter(
            p => p.rating >= cfRating - 100 && p.rating <= cfRating + 200
        );
        if (availableProblems.length === 0) {
            availableProblems = (problemBank as any[]).filter(p => p.rating <= 900);
        }
        if (availableProblems.length === 0) {
            availableProblems = problemBank as any[];
        }

        const weakMatches = availableProblems.filter(p => weakTopics.includes(p.topic));
        const nonWeakMatches = availableProblems.filter(p => !weakTopics.includes(p.topic));
        const selectedAlgorithms: any[] = [...weakMatches.slice(0, 3)];
        if (selectedAlgorithms.length < 3) {
            selectedAlgorithms.push(...nonWeakMatches.slice(0, 3 - selectedAlgorithms.length));
        }

        // Hard guarantee — never skip DSA cards
        const starters = [
            { name: 'Watermelon', link: 'https://codeforces.com/problemset/problem/4/A', topic: 'Math', rating: 800 },
            { name: 'Way Too Long Words', link: 'https://codeforces.com/problemset/problem/71/A', topic: 'Strings', rating: 800 },
            { name: 'Team', link: 'https://codeforces.com/problemset/problem/231/A', topic: 'Greedy', rating: 800 },
        ];
        while (selectedAlgorithms.length < 3) {
            selectedAlgorithms.push(starters[selectedAlgorithms.length]);
        }

        for (const prob of selectedAlgorithms) {
            const diff = prob.rating > 1400 ? 'Hard' : prob.rating > 1000 ? 'Medium' : 'Easy';
            await addRec(supabase, userId, 'dsa', prob.name, `Practice for ${prob.topic} at rating ${prob.rating}`, prob.link, prob.topic, diff);
        }

        // ── 2. WEB PROJECTS ─────────────────────────────────────────────────
        let addedWebdev = false;
        for (const topic of learningTopics) {
            if (topic.includes('dom')) {
                await addRec(supabase, userId, 'webdev', 'Todo App', 'Master DOM manipulation.', 'https://github.com/topics/todo-app', 'DOM', 'Medium');
                addedWebdev = true; break;
            } else if (topic.includes('fetch')) {
                await addRec(supabase, userId, 'webdev', 'Weather App', 'Master APIs.', 'https://github.com/topics/weather-app', 'Fetch API', 'Medium');
                addedWebdev = true; break;
            } else if (topic.includes('react')) {
                await addRec(supabase, userId, 'webdev', 'Blog App', 'Master State and Props.', 'https://github.com/topics/react-blog', 'React', 'Hard');
                addedWebdev = true; break;
            } else if (topic.includes('hooks')) {
                await addRec(supabase, userId, 'webdev', 'Dashboard Clone', 'Master custom hooks.', 'https://github.com/topics/react-dashboard', 'React Hooks', 'Hard');
                addedWebdev = true; break;
            }
        }
        if (!addedWebdev) {
            await addRec(supabase, userId, 'webdev', 'Portfolio Website', 'Build your personal portfolio with HTML, CSS and JS.', 'https://github.com/topics/portfolio', 'HTML/CSS', 'Easy');
        }

        // ── 3. OPEN SOURCE ──────────────────────────────────────────────────
        await addRec(supabase, userId, 'opensource', 'First Contributions', 'Make your first open-source PR.', 'https://github.com/firstcontributions/first-contributions', 'Git', 'Easy');
        await addRec(supabase, userId, 'opensource', 'Good First Issues', 'Browse beginner-friendly issues across GitHub.', 'https://goodfirstissues.com', 'Open Source', 'Easy');

        console.log('✅ Recommendation Engine Completed for', userId);

        // ── 4. AI ANALYSIS (non-critical) ────────────────────────────────────
        try {
            await runAIEngine(userId, profile, learningTopics, externalStats);
        } catch (aiErr) {
            console.warn('AI Engine skipped:', aiErr);
        }

    } catch (e) {
        console.error('[DevTrack Core] Recommendation Engine failed:', e);
    }
}

export { recommendationEngine as runRecommendationEngine };
