import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Pages
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import VideoMeeting from '../pages/VideoMeeting';
import Meetings from '../pages/Meetings';
import TimeTracking from '../pages/TimeTracking';
import TeamCalendar from '../pages/TeamCalendar';
import Admin from '../pages/Admin';
import AdminUsers from '../pages/AdminUsers';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';
import Projects from '../pages/Projects';
import ProjectForm from '../pages/ProjectForm';
import ProjectDetail from '../pages/ProjectDetail';
import Tasks from '../pages/Tasks';
import TaskForm from '../pages/TaskForm';
import Tickets from '../pages/Tickets';
import TicketForm from '../pages/TicketForm';
import Absences from '../pages/Absences';
import Employees from '../pages/Employees';
import EmployeeDetail from '../pages/EmployeeDetail';
import Profile from '../pages/Profile';
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
        path="/meeting"
        element={
          <PrivateRoute>
            <Meetings />
          </PrivateRoute>
        }
      />
      <Route
        path="/meeting/:roomName"
        element={
          <PrivateRoute>
            <VideoMeeting />
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
        path="/absences"
        element={
          <PrivateRoute>
            <Absences />
          </PrivateRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <PrivateRoute>
            <Projects />
          </PrivateRoute>
        }
      />
      <Route
        path="/projects/new"
        element={
          <PrivateRoute>
            <ProjectForm />
          </PrivateRoute>
        }
      />
      <Route
        path="/projects/:id/edit"
        element={
          <PrivateRoute>
            <ProjectForm />
          </PrivateRoute>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <PrivateRoute>
            <ProjectDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <PrivateRoute>
            <Tasks />
          </PrivateRoute>
        }
      />
      <Route
        path="/tasks/new"
        element={
          <PrivateRoute>
            <TaskForm />
          </PrivateRoute>
        }
      />
      <Route
        path="/tasks/:id/edit"
        element={
          <PrivateRoute>
            <TaskForm />
          </PrivateRoute>
        }
      />
      <Route
        path="/tickets"
        element={
          <PrivateRoute>
            <Tickets />
          </PrivateRoute>
        }
      />
      <Route
        path="/tickets/new"
        element={
          <PrivateRoute>
            <TicketForm />
          </PrivateRoute>
        }
      />
      <Route
        path="/tickets/:id/edit"
        element={
          <PrivateRoute>
            <TicketForm />
          </PrivateRoute>
        }
      />
      <Route
        path="/employees"
        element={
          <PrivateRoute>
            <Employees />
          </PrivateRoute>
        }
      />
      <Route
        path="/employees/:id"
        element={
          <PrivateRoute>
            <EmployeeDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <PrivateRoute>
            <Admin />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <PrivateRoute>
            <AdminUsers />
          </PrivateRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <PrivateRoute>
            <Reports />
          </PrivateRoute>
        }
      />
      <Route
        path="/team-calendar"
        element={
          <PrivateRoute>
            <TeamCalendar />
          </PrivateRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <PrivateRoute>
            <Settings />
          </PrivateRoute>
        }
      />
<Route
        path="/profile"
        element={
          <PrivateRoute>
            <Profile />
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
          <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">Strona nie znaleziona</p>
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
