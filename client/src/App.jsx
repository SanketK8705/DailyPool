import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PostRoute from './pages/PostRoute';
import ActiveRide from './pages/ActiveRide';
import Profile from './pages/Profile';
import RideHistory from './pages/RideHistory';
import Admin from './pages/Admin';
import WebGLLiquid from './components/ui/WebGLLiquid';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1012] flex items-center justify-center text-sm text-slate-400">
        Loading profile credentials...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-brand-bg text-[#a0aaba] font-sans relative overflow-x-hidden">
        {/* Full-bleed background liquid shader */}
        <div className="fixed inset-0 z-0 pointer-events-none w-screen h-screen">
          <WebGLLiquid className="w-full h-full" opacity={0.6} speed={0.4} />
        </div>

        {/* Content layers */}
        <div className="relative z-10 flex flex-col min-h-screen w-full">
          {/* Render Navbar only if user is logged in */}
          {user && <Navbar />}

          <main className="flex-grow">
            <Routes>
              {/* Public route */}
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-route"
                element={
                  <ProtectedRoute>
                    <PostRoute />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <RideHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/active-ride/:id"
                element={
                  <ProtectedRoute>
                    <ActiveRide />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
