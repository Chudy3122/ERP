import { BrowserRouter as Router } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { Toaster } from 'react-hot-toast';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatProvider } from './contexts/ChatContext';
import AppRoutes from './routes/AppRoutes';
import PrankOverlay from './components/PrankOverlay';
import ErrorBoundary from './components/common/ErrorBoundary';
import './i18n';

function App() {
  return (
    <ErrorBoundary>
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ChatProvider>
          <AppRoutes />
          <PrankOverlay />
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
          {/* react-hot-toast host — most of the app uses this; without it those
              toasts were silently invisible. */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: { borderRadius: '10px', fontSize: '14px' },
              success: { iconTheme: { primary: '#16A34A', secondary: '#fff' } },
              error: { duration: 5000 },
            }}
          />
          </ChatProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
    </ErrorBoundary>
  );
}

export default App;
