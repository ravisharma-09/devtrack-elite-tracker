import { getSupabaseClient } from '../backend/supabaseClient';

export interface ExternalActivity {
    id: string;
    user_id: string;
    platform: 'Codeforces' | 'LeetCode' | 'GitHub';
    activity_type: string;
    activity_title: string;
    activity_link?: string;
    activity_timestamp: string;
    metadata?: any;
    created_at: string;
}

// ── External Activity Engine ─────────────────────────────────────────────────

// Fetch recent activity across all platforms and save them directly to Supabase.
// These are not the "Stats" APIs, but the specific unified timeline events.

export async function syncCodeforcesActivity(userId: string, handle: string): Promise<boolean> {
    if (!handle) return false;
    try {
        const res = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=20`);
        const json = await res.json();

        if (json.status !== 'OK') return false;

        const submissions = json.result.filter((s: any) => s.verdict === 'OK');
        const activities = submissions.map((s: any) => ({
            user_id: userId,
            platform: 'Codeforces',
            activity_type: 'submission',
            activity_title: `Solved ${s.problem.name}`,
            activity_link: `https://codeforces.com/problemset/problem/${s.problem.contestId}/${s.problem.index}`,
            activity_timestamp: new Date(s.creationTimeSeconds * 1000).toISOString(),
            metadata: { rating: s.problem.rating, tags: s.problem.tags }
        }));

        await bulkUpsertActivity(activities);
        return true;
    } catch (e) {
        console.error('[ExternalActivity] CF Sync Error:', e);
        return false;
    }
}

export async function syncLeetCodeActivity(userId: string, username: string): Promise<boolean> {
    if (!username) return false;
    // We'll use the reliable proxy for recent AC submissions from alastair-based graphql wrappers
    // Many proxies drop the raw submission stream, so we'll use a known public one that provides recentAcSubmissionList
    try {
        const res = await fetch(`https://leetcode-api-faisalshohag.vercel.app/${username}`);
        const json = await res.json();

        if (json.errors || !json.recentSubmissions) return false;

        // Ensure only Accepted submissions
        const accepted = json.recentSubmissions.filter((s: any) => s.statusDisplay === 'Accepted');

        const activities = accepted.map((s: any) => ({
            user_id: userId,
            platform: 'LeetCode',
            activity_type: 'submission',
            activity_title: `Solved ${s.title}`,
            activity_link: `https://leetcode.com/problems/${s.titleSlug}/`,
            activity_timestamp: new Date(parseInt(s.timestamp) * 1000).toISOString(),
            metadata: { language: s.lang }
        }));

        await bulkUpsertActivity(activities);
        return true;
    } catch (e) {
        console.error('[ExternalActivity] LC Sync Error:', e);
        return false;
    }
}

export async function syncGitHubActivity(userId: string, username: string): Promise<boolean> {
    if (!username) return false;

    try {
        const res = await fetch(`https://api.github.com/users/${username}/events/public?per_page=20`);
        const events = await res.json();

        if (!Array.isArray(events)) return false;

        const activities = events.map((e: any) => {
            let title = '';
            if (e.type === 'PushEvent') {
                title = `Pushed ${e.payload.commits?.length || 0} commits to ${e.repo.name}`;
            } else if (e.type === 'CreateEvent') {
                title = `Created repository ${e.repo.name}`;
            } else if (e.type === 'PullRequestEvent') {
                title = `${e.payload.action} PR in ${e.repo.name}`;
            } else {
                title = `Activity on ${e.repo.name}`; // Fallback
            }

            return {
                user_id: userId,
                platform: 'GitHub',
                activity_type: e.type,
                activity_title: title,
                activity_link: `https://github.com/${e.repo.name}`,
                activity_timestamp: new Date(e.created_at).toISOString(),
                metadata: { repo: e.repo.name }
            };
        });

        await bulkUpsertActivity(activities);
        return true;
    } catch (e) {
        console.error('[ExternalActivity] GH Sync Error:', e);
        return false;
    }
}

// ── Private Helpers ───────────────────────────────────────────────────────────

async function bulkUpsertActivity(activities: any[]) {
    if (!activities.length) return;
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    // Use onConflict to ignore duplicates based on the composite unique key (user_id, platform, activity_title, activity_timestamp)
    const { error } = await supabase.from('external_activity').upsert(activities, {
        onConflict: 'user_id,platform,activity_title,activity_timestamp',
        ignoreDuplicates: true // We don't need to overwrite them, just insert new ones
    });

    if (error) {
        console.error('[ExternalActivity] Bulk Upsert Error:', error);
    }
}

// ── Fetch Unified Timeline ────────────────────────────────────────────────────
export async function fetchUnifiedActivityFeed(userId: string, limit = 50): Promise<ExternalActivity[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('external_activity')
        .select('*')
        .eq('user_id', userId)
        .order('activity_timestamp', { ascending: false })
        .limit(limit);

    if (error || !data) return [];
    return data;
}
