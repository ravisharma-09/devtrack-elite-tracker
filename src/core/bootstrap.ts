import { syncEngine } from "./syncEngine"
import { tsaEngine } from "./tsaEngine"
import { recommendationEngine } from "./recommendationEngine"
import { leaderboardEngine } from "./leaderboardEngine"

export async function bootstrapUser(userId: string) {
    console.log("🚀 Bootstrapping user:", userId)

    await syncEngine(userId)
    await tsaEngine(userId)
    await recommendationEngine(userId)
    await leaderboardEngine()

    console.log("✅ Bootstrap completed")
}
