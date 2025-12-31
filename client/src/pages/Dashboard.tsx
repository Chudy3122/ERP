import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30">
      {/* Modern navbar with gradient */}
      <nav className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl shadow-lg ring-2 ring-white/30">
                🏢
              </div>
              <h1 className="text-2xl font-bold text-white drop-shadow-sm">ERP System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right mr-2">
                <p className="text-white font-semibold drop-shadow-sm">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-indigo-100">{user?.email}</p>
              </div>
              <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/30 shadow-lg">
                {user?.role}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl transition-all duration-200 font-medium text-white shadow-lg hover:shadow-xl hover:scale-105 border border-white/20"
              >
                Wyloguj się
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
            {/* Welcome Card - Modern gradient */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden group hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-[1.02]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>

              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl mb-4 shadow-lg ring-2 ring-white/30">
                  👋
                </div>
                <h2 className="text-2xl font-bold mb-2 drop-shadow-sm">
                  Witaj, {user?.first_name}!
                </h2>
                <p className="text-indigo-100 mb-6">
                  System zarządzania pracą zdalną
                </p>
                <div className="space-y-3 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-2">
                    <span className="text-white/80">📧</span>
                    <span className="text-sm text-white">{user?.email}</span>
                  </div>
                  {user?.department && (
                    <div className="flex items-center gap-2">
                      <span className="text-white/80">🏢</span>
                      <span className="text-sm text-white">{user.department}</span>
                    </div>
                  )}
                  {user?.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-white/80">📱</span>
                      <span className="text-sm text-white">{user.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Communication Module Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-100">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full -mr-12 -mt-12 opacity-50"></div>

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl mb-4 shadow-lg">
                  💬
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Moduł Komunikacyjny
                </h3>
                <p className="text-gray-600 mb-6">
                  Czat, wiadomości multimedialne, statusy użytkowników
                </p>
                <Link
                  to="/chat"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  Przejdź do czatu →
                </Link>
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm text-green-600 font-medium">Dostępne teraz</p>
                </div>
              </div>
            </div>

            {/* Time Management Module Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-100">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full -mr-12 -mt-12 opacity-50"></div>

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-2xl mb-4 shadow-lg">
                  ⏰
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Zarządzanie Czasem Pracy
                </h3>
                <p className="text-gray-600 mb-6">
                  Ewidencja godzin, urlopy, raporty
                </p>
                <Link
                  to="/time-tracking"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  Otwórz kartę czasu →
                </Link>
                <div className="mt-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm text-green-600 font-medium">Dostępne teraz</p>
                </div>
              </div>
            </div>

            {/* Status Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 relative overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-gray-100">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full -mr-12 -mt-12 opacity-50"></div>

              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-2xl mb-4 shadow-lg">
                  📊
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Status Systemu
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">Backend API</span>
                    </div>
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-500 text-white shadow-sm">
                      Online
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">Baza danych</span>
                    </div>
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-500 text-white shadow-sm">
                      Połączona
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-gray-700">Autentykacja</span>
                    </div>
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-500 text-white shadow-sm">
                      Aktywna
                    </span>
                  </div>
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
