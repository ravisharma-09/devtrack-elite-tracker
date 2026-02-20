import { getSupabaseClient } from '../backend/supabaseClient';
import { getGroqTopicAnalysis } from '../ai/groqAnalyticsEngine';
import { getGroqQuestionSuggestions } from '../ai/groqQuestionEngine';
import { getGroqDailyPlan } from '../ai/groqPlannerEngine';
import type { RoadmapCategory, ActivityHistory, StudySession } from '../types';
import type { SkillProfile } from './analyticsEngine';
import type { AIAnalyticsPayload } from './learningStore';

const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function syncAIAnalytics(
    userId: string,
    skillProfile: SkillProfile | null,
    roadmap: RoadmapCategory[],
    activityHistory: ActivityHistory,
    recentSessions: StudySession[],
    currentCache: AIAnalyticsPayload | null,
    force = false
): Promise<AIAnalyticsPayload | null> {

    // 1. Check local cache freshness to prevent Groq API spam
    if (!force && currentCache && currentCache.lastUpdated) {
        if (Date.now() - currentCache.lastUpdated < STALE_MS) {
            return currentCache;
        }
    }

    const supabase = await getSupabaseClient();

    // 2. Check Supabase cache freshness (in case they switch devices)
    if (!force && supabase) {
        try {
            const { data, error } = await supabase
                .from('ai_analytics_cache')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (!error && data && data.updated_at) {
                const dbTime = new Date(data.updated_at).getTime();
                if (Date.now() - dbTime < STALE_MS) {
                    const payload: AIAnalyticsPayload = {
                        analysis: {
                            weakTopics: data.weak_topics || [],
                            strongTopics: data.strong_topics || [],
                            priorityTopics: data.suggestions?.priorityTopics || []
                        },
                        plan: {
                            dailyPlan: data.daily_plan || [],
                            motivationalInsight: data.suggestions?.motivationalInsight || "Keep going!"
                        },
                        questions: data.suggestions?.questions || null,
                        lastUpdated: dbTime
                    };
                    return payload;
                }
            }
        } catch { } // Fallthrough to fetch
    }

    console.log('[DevTrack] Cache stale or forced. Hitting Groq API...');

    try {
        // Step 1: Analyze overall profile to find weak topics
        const analysis = await getGroqTopicAnalysis(skillProfile, roadmap);

        // Step 2: Grab the #1 weakest topic to find questions for
        const weakest = analysis.weakTopics[0] || "Arrays";

        // Step 3: Run Question Engine & Planner Engine concurrently
        const [questions, plan] = await Promise.all([
            getGroqQuestionSuggestions(weakest),
            getGroqDailyPlan(analysis.weakTopics, activityHistory, recentSessions, skillProfile)
        ]);

        const payload: AIAnalyticsPayload = {
            analysis,
            questions,
            plan,
            lastUpdated: Date.now()
        };

        // Step 4: Fire-and-forget save to Supabase
        if (supabase) {
            supabase.from('ai_analytics_cache').upsert({
                user_id: userId,
                weak_topics: analysis.weakTopics,
                strong_topics: analysis.strongTopics,
                daily_plan: plan.dailyPlan,
                suggestions: {
                    priorityTopics: analysis.priorityTopics,
                    questions,
                    motivationalInsight: plan.motivationalInsight
                },
                updated_at: new Date().toISOString()
            }).then(({ error }: any) => {
                if (error) console.error("Supabase cache save failed:", error.message)
            });
        }

        return payload;

    } catch (e: any) {
        console.error("[aiSyncEngine] Failed to generate AI payload:", e);
        return null;
    }
}
