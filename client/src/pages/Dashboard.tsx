import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">ERP System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                {user?.first_name} {user?.last_name}
              </span>
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-800">
                {user?.role}
              </span>
              <button
                onClick={handleLogout}
                className="btn btn-secondary text-sm"
              >
                Wyloguj się
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Welcome Card */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Witaj, {user?.first_name}!
              </h2>
              <p className="text-gray-600">
                System zarządzania pracą zdalną
              </p>
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Email:</span> {user?.email}
                </p>
                {user?.department && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Dział:</span> {user.department}
                  </p>
                )}
                {user?.phone && (
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Telefon:</span> {user.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Communication Module Card */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Moduł Komunikacyjny
              </h3>
              <p className="text-gray-600 mb-4">
                Czat, wiadomości multimedialne, statusy użytkowników
              </p>
              <button className="btn btn-primary">
                Przejdź do czatu
              </button>
              <p className="mt-2 text-xs text-gray-500">Wkrótce dostępne</p>
            </div>

            {/* Time Management Module Card */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Zarządzanie Czasem Pracy
              </h3>
              <p className="text-gray-600 mb-4">
                Ewidencja godzin, urlopy, raporty
              </p>
              <button className="btn btn-primary">
                Otwórz kartę czasu
              </button>
              <p className="mt-2 text-xs text-gray-500">Wkrótce dostępne</p>
            </div>

            {/* Status Card */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Status Systemu
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Backend API</span>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Baza danych</span>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Połączona
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Autentykacja</span>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Aktywna
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
