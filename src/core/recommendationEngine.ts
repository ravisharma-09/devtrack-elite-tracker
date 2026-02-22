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
    console.log("Generating recommendations");
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    const verifiedUserId = user?.id;
    if (!verifiedUserId) {
        console.error("❌ Recommendation Engine: No authenticated user found.");
        return;
    }

    try {
        console.log("🧩 Generating Recommendations...");
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

        const weakTopics = profile?.weak_topics || [];
        const learningTopics = roadmap?.map((r: any) => r.topic_id?.toLowerCase() || '')?.filter(Boolean) || [];
        const cfRating = profile?.cf_rating || 800;

        // 1. Dynamic Curated Logic (from Problem Bank + TSA engine weak topics)

        // Filter problem bank near user's skill rating (+/- 200)
        let availableProblems = problemBank.filter(p => p.rating >= cfRating - 100 && p.rating <= cfRating + 200);

        // If they are too low, give absolute basics
        if (availableProblems.length === 0) {
            availableProblems = problemBank.filter(p => p.rating === 800);
        }

        // Try to find problems matching weak topics first
        const weakMatches = availableProblems.filter(p => weakTopics.includes(p.topic));

        let selectedAlgorithms = [];
        if (weakMatches.length >= 3) {
            // Take top 3
            selectedAlgorithms = weakMatches.slice(0, 3);
        } else {
            // Mix weak matches with general appropriate rating matches
            selectedAlgorithms = [...weakMatches];
            const remainingNeeded = 3 - selectedAlgorithms.length;
            const nonWeakMatches = availableProblems.filter(p => !weakTopics.includes(p.topic));
            selectedAlgorithms.push(...nonWeakMatches.slice(0, remainingNeeded));
        }

        for (const prob of selectedAlgorithms) {
            const diff = prob.rating > 1400 ? 'Hard' : prob.rating > 1000 ? 'Medium' : 'Easy';
            await addRec(supabase, verifiedUserId, 'dsa', prob.name, `Targeted practice for ${prob.topic} at rating ${prob.rating}.`, prob.link, prob.topic, diff);
        }


        // Roadmap Projects (Web Dev)
        for (const topic of learningTopics) {
            if (topic.includes('dom')) {
                await addRec(supabase, verifiedUserId, 'webdev', 'Todo App', 'Master DOM manipulation.', 'https://github.com/topics/todo-app', 'DOM', 'Medium');
                break; // Just one project is enough usually
            } else if (topic.includes('fetch')) {
                await addRec(supabase, verifiedUserId, 'webdev', 'Weather App', 'Master APIs.', 'https://github.com/topics/weather-app', 'Fetch API', 'Medium');
                break;
            } else if (topic.includes('react')) {
                await addRec(supabase, verifiedUserId, 'webdev', 'Blog App', 'Master State and Props.', 'https://github.com/topics/react-blog', 'React', 'Hard');
                break;
            } else if (topic.includes('hooks')) {
                await addRec(supabase, verifiedUserId, 'webdev', 'Dashboard Clone', 'Master custom hooks.', 'https://github.com/topics/react-dashboard', 'React Hooks', 'Hard');
                break;
            }
        }

        // Open Source
        await addRec(supabase, verifiedUserId, 'opensource', 'First Contributions', 'Great place for beginners to make PRs.', 'https://github.com/firstcontributions/first-contributions', 'Git', 'Easy');

        // 2. AI Smart Engine execution
        // We run this alongside the static to get the highly tailored recommendations into AI textual cache
        await runAIEngine(verifiedUserId, profile, learningTopics, externalStats);

        // 3. Last chance fallback check to guarantee UI isn't empty
        const { data: verifyData } = await supabase
            .from("recommendations")
            .select("*")
            .eq("user_id", verifiedUserId);

        if (!verifyData || verifyData.length === 0) {
            console.log("⚠️ Fallback: Still empty... generating new recommendations");
            await addRec(supabase, verifiedUserId, 'dsa', 'Watermelon', 'A classic introductory problem.', 'https://codeforces.com/problemset/problem/4/A', 'Math', 'Easy');
        }

    } catch (e) {
        console.error('[DevTrack Core] Recommendation Engine failed:', e);
    }
}


