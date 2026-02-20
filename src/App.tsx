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
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';

function App() {
  return (
    <AuthProvider>
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
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* ── Catch-all ─────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
