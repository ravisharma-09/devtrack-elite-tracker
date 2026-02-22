import { getSupabaseClient } from '../backend/supabaseClient';

export interface UnifiedActivity {
    user_id: string;
    source: 'codeforces' | 'leetcode' | 'github' | 'devtrack';
    type: 'solve' | 'contest' | 'commit' | 'study';
    topic?: string;
    difficulty?: string;
    score?: number;
    metadata?: any;
    created_at: string;
}

export async function runTelemetryEngine(userId: string): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('cf_handle, leetcode_username, github_username')
            .eq('id', userId)
            .single();

        if (!profile) return;

        const allActivities: UnifiedActivity[] = [];

        // 1. Codeforces Activity
        if (profile.cf_handle) {
            const cf = await fetchCodeforces(userId, profile.cf_handle);
            allActivities.push(...cf);
        }

        // 2. LeetCode Activity
        if (profile.leetcode_username) {
            const lc = await fetchLeetCode(userId, profile.leetcode_username);
            allActivities.push(...lc);
        }

        // 3. GitHub Activity
        if (profile.github_username) {
            const gh = await fetchGitHub(userId, profile.github_username);
            allActivities.push(...gh);
        }

        // Note: DevTrack study sessions are recorded directly by the timer component
        // into the unified `activities` table. Telemetry engine primarily syncs external ones.

        await bulkUpsertActivities(supabase, allActivities);
    } catch (e) {
        console.error('[DevTrack Core] Telemetry Engine failed:', e);
    }
}

async function fetchCodeforces(userId: string, handle: string): Promise<UnifiedActivity[]> {
    try {
        const res = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=20`);
        const json = await res.json();
        if (json.status !== 'OK') return [];

        const submissions = json.result.filter((s: any) => s.verdict === 'OK');
        return submissions.map((s: any) => ({
            user_id: userId,
            source: 'codeforces',
            type: 'solve',
            topic: Math.floor((s.problem.rating || 1000) / 100) * 100 + ' Level', // Fallback as CF 'tags' are array
            difficulty: s.problem.rating >= 1600 ? 'Hard' : s.problem.rating >= 1200 ? 'Medium' : 'Easy',
            score: s.problem.rating || 0,
            metadata: { problem: s.problem.name, link: `https://codeforces.com/problemset/problem/${s.problem.contestId}/${s.problem.index}`, tags: s.problem.tags },
            created_at: new Date(s.creationTimeSeconds * 1000).toISOString()
        }));
    } catch {
        return [];
    }
}

async function fetchLeetCode(userId: string, username: string): Promise<UnifiedActivity[]> {
    try {
        const res = await fetch(`https://leetcode-api-faisalshohag.vercel.app/${username}`);
        const json = await res.json();
        if (json.errors || !json.recentSubmissions) return [];

        const accepted = json.recentSubmissions.filter((s: any) => s.statusDisplay === 'Accepted');
        return accepted.map((s: any) => ({
            user_id: userId,
            source: 'leetcode',
            type: 'solve',
            topic: 'DSA',
            difficulty: 'Medium', // Proxy API often doesn't return difficulty on recent submissions easily
            score: 10,
            metadata: { problem: s.title, link: `https://leetcode.com/problems/${s.titleSlug}/`, lang: s.lang },
            created_at: new Date(parseInt(s.timestamp) * 1000).toISOString()
        }));
    } catch {
        return [];
    }
}

async function fetchGitHub(userId: string, username: string): Promise<UnifiedActivity[]> {
    try {
        const res = await fetch(`https://api.github.com/users/${username}/events/public?per_page=20`);
        const events = await res.json();
        if (!Array.isArray(events)) return [];

        // Filter only push events for 'commits'
        const pushes = events.filter((e: any) => e.type === 'PushEvent');

        return pushes.map((e: any) => ({
            user_id: userId,
            source: 'github',
            type: 'commit',
            topic: e.repo.name.split('/')[1] || 'repo', // best guess for topic
            score: e.payload.commits?.length || 1,
            metadata: { repo: e.repo.name, commits: e.payload.commits?.length || 1, url: `https://github.com/${e.repo.name}` },
            created_at: new Date(e.created_at).toISOString()
        }));
    } catch {
        return [];
    }
}

async function bulkUpsertActivities(supabase: any, activities: UnifiedActivity[]) {
    if (!activities.length) return;

    // Convert to the exact columns expected by Supabase.
    // The unique constraint in Supabase for idempotency should ideally be (user_id, source, created_at, metadata->>problem)
    // For now we just insert, assuming a UNIQUE constraint handles duplicates or we rely on exact timestamp matching.
    const { error } = await supabase.from('activities').upsert(activities, {
        onConflict: 'user_id,source,created_at',
        ignoreDuplicates: true
    });

    if (error) {
        console.error('[DevTrack Core] Activity Upsert Error:', error);
    }
}
