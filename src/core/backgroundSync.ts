import { runTelemetryEngine } from './telemetryEngine';
import { runAnalyticsEngine } from './analyticsEngine';
import { runRecommendationEngine } from './recommendationEngine';
import { runLeaderboardEngine } from './leaderboardEngine';

let isSyncing = false;

export async function runBackgroundSync(userId: string, force = false): Promise<void> {
    if (!userId) return;

    // Prevent overlapping syncs
    if (isSyncing && !force) {
        console.log('[DevTrack Core] Sync already in progress, skipping...');
        return;
    }

    // Optional: Add logic to check last sync time in a local variable or indexDB
    // to throttle to eg. once every 20 minutes unless 'force' is true.

    try {
        isSyncing = true;
        console.log('[DevTrack Core] Starting Intelligence Pipeline Sync...');

        // 1. Fetch external activity & record DevTrack sessions -> unified `activities`
        await runTelemetryEngine(userId);

        // 2. Aggregate `activities` -> computes skill score, updates `profiles`
        await runAnalyticsEngine(userId);

        // 3. Generate static logic and AI suggestions based on updated profiles
        await runRecommendationEngine(userId);

        // 4. Recalculate global ranks
        await runLeaderboardEngine();

        console.log('[DevTrack Core] Intelligence Pipeline Sync Complete.');
    } catch (e) {
        console.error('[DevTrack Core] Sync Pipeline Failed:', e);
    } finally {
        isSyncing = false;
    }
}
