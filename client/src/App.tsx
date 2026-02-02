import { BrowserRouter as Router } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatProvider } from './contexts/ChatContext';
import AppRoutes from './routes/AppRoutes';
import './i18n';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ChatProvider>
          <AppRoutes />
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
          </ChatProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
