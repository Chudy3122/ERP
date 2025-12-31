import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Pages
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import Chat from '../pages/Chat';
import TimeTracking from '../pages/TimeTracking';
import LeaveManagement from '../pages/LeaveManagement';
import PrivateRoute from './PrivateRoute';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />}
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <PrivateRoute>
            <Chat />
          </PrivateRoute>
        }
      />
      <Route
        path="/time-tracking"
        element={
          <PrivateRoute>
            <TimeTracking />
          </PrivateRoute>
        }
      />
      <Route
        path="/time-tracking/leave"
        element={
          <PrivateRoute>
            <LeaveManagement />
          </PrivateRoute>
        }
      />

      {/* Default redirect */}
      <Route
        path="/"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        }
      />

      {/* 404 - Not Found */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
              <p className="text-xl text-gray-600 mb-8">Strona nie znaleziona</p>
              <a href="/" className="btn btn-primary">
                Wróć do strony głównej
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  );
};

export default AppRoutes;
