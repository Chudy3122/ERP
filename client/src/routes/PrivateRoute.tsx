/* eslint-disable react/prop-types */
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth.types';

interface PrivateRouteProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, roles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles?.length && (!user || !roles.includes(user.role))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-3">
            Brak dostępu
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Twoja rola nie ma uprawnień do wyświetlenia tej części systemu.
          </p>
          <Link to="/dashboard" className="btn btn-primary inline-flex">
            Wróć do dashboardu
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default PrivateRoute;
