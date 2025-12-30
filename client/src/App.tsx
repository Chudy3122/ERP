import { BrowserRouter as Router } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              ERP - Remote Work Management
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Kompleksowe narzędzie do zarządzania pracą zdalną
            </p>
            <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Witaj w systemie ERP!
              </h2>
              <div className="space-y-4 text-left">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-gray-800">Moduł Komunikacyjny</h3>
                  <p className="text-gray-600">
                    Czat w czasie rzeczywistym, wiadomości multimedialne, statusy użytkowników
                  </p>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-semibold text-gray-800">Zarządzanie Czasem Pracy</h3>
                  <p className="text-gray-600">
                    Ewidencja godzin, urlopy, raporty, kalendarz zespołowy
                  </p>
                </div>
              </div>
              <div className="mt-8 text-sm text-gray-500">
                Status: <span className="text-green-600 font-semibold">Setup zakończony</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
