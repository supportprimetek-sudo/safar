import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { SplashScreen } from './components/SplashScreen';
import { IntroSlider } from './components/IntroSlider';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ActiveTrip } from './pages/ActiveTrip';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#11151D] text-white flex items-center justify-center font-bold">Loading SAFAR Partner...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem('safar_driver_intro_seen'));

  useEffect(() => {
    const initStatusBar = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#11151D' });
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch (err) {}
    };
    initStatusBar();
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (showIntro) {
    return <IntroSlider onFinish={() => setShowIntro(false)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trip/:rideId"
          element={
            <ProtectedRoute>
              <ActiveTrip />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Driver App Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#11151D] text-white p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-3xl border border-amber-500/30">
            ⚠️
          </div>
          <h2 className="text-xl font-black text-white">SAFAR Partner Error Recovery</h2>
          <p className="text-xs text-gray-400 max-w-xs">
            {this.state.error?.message || 'An unexpected error occurred while loading your driver portal.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="py-3 px-6 bg-safar-teal text-safar-bg font-extrabold text-xs rounded-xl shadow-lg active:scale-95 transition-all"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <div className="saf-status-bar-shield" />
          <AppContent />
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};
