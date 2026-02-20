import { getSupabaseClient } from '../backend/supabaseClient';

export interface LeaderboardUser {
    id: string;
    user_id: string;
    username: string;
    skill_score: number;
    problems_solved: number;
    study_hours: number;
    consistency_score: number;
    codeforces_rating: number;
    leetcode_solved: number;
    github_activity_score: number;
    batch?: string;
    last_updated: string;
    rank?: number; // Injected on read
}

export interface RankHistoryEntry {
    date: string;
    rank: number;
}

// ── Update Single User Stats ──────────────────────────────────────────────────
export async function updateLeaderboardStats(
    userId: string,
    username: string,
    skillScore: number,
    problemsSolved: number,
    studyMinutes: number,
    consistencyScore: number,
    codeforcesRating: number,
    leetcodeSolved: number,
    githubActivityScore: number,
    batch?: string
): Promise<boolean> {
    const supabase = await getSupabaseClient();
    if (!supabase) return false;

    const studyHours = Math.round(studyMinutes / 60);

    const { error } = await supabase.from('leaderboard_stats').upsert({
        user_id: userId,
        username,
        skill_score: skillScore,
        problems_solved: problemsSolved,
        study_hours: studyHours,
        consistency_score: consistencyScore,
        codeforces_rating: codeforcesRating,
        leetcode_solved: leetcodeSolved,
        github_activity_score: githubActivityScore,
        batch,
        last_updated: new Date().toISOString()
    }, { onConflict: 'user_id' }); // user_id is unique

    if (error) {
        console.error('[Leaderboard Engine] Error updating stats:', error);
        return false;
    }

    return true;
}

// ── Fetch Leaderboard ─────────────────────────────────────────────────────────
export async function fetchLeaderboard(limit = 100, batch?: string): Promise<LeaderboardUser[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];

    let query = supabase
        .from('leaderboard_stats')
        .select('*')
        .order('skill_score', { ascending: false })
        .limit(limit);

    if (batch) {
        query = query.eq('batch', batch);
    }

    const { data, error } = await query;

    if (error || !data) {
        console.error('[Leaderboard Engine] Error fetching leaderboard:', error);
        return [];
    }

    // Inject 1-based ranks based on the sorted order
    return data.map((u: any, i: number) => ({ ...u, rank: i + 1 }));
}

// ── Fetch Current User Rank ───────────────────────────────────────────────────
export async function fetchUserRank(skillScore: number, batch?: string): Promise<number> {
    const supabase = await getSupabaseClient();
    if (!supabase) return 0;

    // Count how many users have a strictly higher skill score + 1
    let query = supabase
        .from('leaderboard_stats')
        .select('id', { count: 'exact', head: true })
        .gt('skill_score', skillScore);

    if (batch) {
        query = query.eq('batch', batch);
    }

    const { count, error } = await query;
    if (error || count === null) return 0;

    return count + 1;
}

// ── Save Rank History (Snapshot) ──────────────────────────────────────────────
export async function snapshotRankHistory(userId: string, currentRank: number): Promise<void> {
    const supabase = await getSupabaseClient();
    if (!supabase) return;

    const todayStr = new Date().toISOString().split('T')[0];

    const { error } = await supabase.from('rank_history').upsert({
        user_id: userId,
        date: todayStr,
        rank: currentRank,
        created_at: new Date().toISOString()
    }, { onConflict: 'user_id,date' });

    if (error) {
        console.error('[Leaderboard Engine] Error saving rank history:', error);
    }
}

// ── Fetch Rank History ────────────────────────────────────────────────────────
export async function fetchRankHistory(userId: string): Promise<RankHistoryEntry[]> {
    const supabase = await getSupabaseClient();
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('rank_history')
        .select('date, rank')
        .eq('user_id', userId)
        .order('date', { ascending: true })
        .limit(30); // limit to last 30 snapshots

    if (error || !data) return [];
    return data;
}
