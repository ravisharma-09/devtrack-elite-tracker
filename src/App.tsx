import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Timetable } from './pages/Timetable';
import { Roadmap } from './pages/Roadmap';
import { Statistics } from './pages/Statistics';
import { Suggestions } from './pages/Suggestions';
import { Leaderboard } from './pages/Leaderboard';
import { ActivityFeed } from './pages/Activity';
import { Profile } from './pages/Profile';
import { GitHubHub } from './pages/GitHubHub';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { useEffect } from 'react';
import { useAuth } from './auth/AuthContext';
import { getSupabaseClient } from './backend/supabaseClient';

function AppContent() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // ── Permanent auto-sync: runs once per login, skips if data < 2h old ──
    const autoSync = async () => {
      try {
        const supabase = await getSupabaseClient();
        if (!supabase) return;

        // Load handles saved in Profile
        const { data: userRow } = await supabase
          .from('users')
          .select('codeforces_handle, leetcode_username, github_username')
          .eq('id', user.id)
          .single();
        if (!userRow) return;

        const { codeforces_handle: cfHandle, leetcode_username: lcUsername, github_username: ghUsername } = userRow;
        if (!cfHandle && !lcUsername && !ghUsername) return; // Nothing connected yet

        // Check staleness — skip if synced < 2h ago
        const { data: extRow } = await supabase
          .from('external_stats')
          .select('last_synced')
          .eq('user_id', user.id)
          .single();
        const lastSync = extRow?.last_synced ? new Date(extRow.last_synced).getTime() : 0;
        const stale = Date.now() - lastSync > 2 * 60 * 60 * 1000; // 2 hours
        if (!stale) {
          console.log('[AutoSync] Data is fresh, skipping sync.');
          return;
        }

        console.log('[AutoSync] Syncing external activity in background...');
        const { syncCodeforcesActivity, syncGitHubActivity, syncLeetCodeActivity } = await import('./engine/externalActivityEngine');
        const { fetchCodeforcesStats } = await import('./api/codeforcesApi');

        // Fire all syncs in parallel — completely non-blocking for the UI
        await Promise.all([
          cfHandle ? syncCodeforcesActivity(user.id, cfHandle) : Promise.resolve(),
          lcUsername ? syncLeetCodeActivity(user.id, lcUsername) : Promise.resolve(),
          ghUsername ? syncGitHubActivity(user.id, ghUsername) : Promise.resolve(),
          cfHandle ? fetchCodeforcesStats(cfHandle).then(cf => {
            if (cf) supabase.from('external_stats').upsert({ user_id: user.id, cf, last_synced: new Date().toISOString() }).catch(() => { });
          }) : Promise.resolve(),
        ]);
        console.log('[AutoSync] Done.');
      } catch (e) {
        console.warn('[AutoSync] Background sync failed:', e);
      }
    };

    autoSync();
  }, [user]);

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public routes ─────────────────────────────── */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ── Protected routes ──────────────────────────── */}
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="suggestions" element={<Suggestions />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="activity" element={<ActivityFeed />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="github" element={<GitHubHub />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* ── Catch-all ─────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import { LearningProvider } from './engine/learningStore';

function App() {
  return (
    <AuthProvider>
      <LearningProvider>
        <AppContent />
      </LearningProvider>
    </AuthProvider>
  );
}

export default App;
