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
import { bootstrapUser } from './core/bootstrap';

function AppContent() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Use user.id directly from AuthContext — avoids the broken supabase.auth.getUser() 403
      bootstrapUser(user.id).catch(e => console.warn('Bootstrap error:', e));
    }
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

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
