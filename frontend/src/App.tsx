import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { useAuth } from './features/auth/hooks/useAuth';
import { LoginPage } from './features/auth/components/LoginPage';
import { useUserPresence } from './features/auth/hooks/useUserPresence';
import { useState, useEffect, Suspense, lazy } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence, useReducedMotion } from 'framer-motion';
import styles from './App.module.css';
import { IntroAnimation } from './components/ui/IntroAnimation';
import { PiPProvider, usePiP } from './context/PiPContext';
import { UserProvider } from './context/UserContext';
import { TimerPiP } from './features/timer/components/TimerPiP';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TimerPage } from './pages/TimerPage';
import { useUserRole } from './hooks/useUserRole';
import { MaintenancePage } from './pages/MaintenancePage';
import { systemApi } from './api/systemApi';
import socketService from './services/socket';
import { RestrictedPage } from './pages/RestrictedPage';
import { ROLES } from './constants/roles';

const AdminRoutes = lazy(() => import('./pages/admin/routes/AdminRoutes'));

import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const PageLoading = () => (
  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
    Loading section...
  </div>
);

const PageWrapper = ({ children }: { children: React.ReactNode }) => {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <m.div
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="page-transition-wrapper"
    >
      {children}
    </m.div>
  );
};

const AdminLoading = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    color: '#888',
    padding: '2rem'
  }}>
    Loading Admin Module...
  </div>
);

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { isAdminLevel, loading: roleLoading } = useUserRole();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [showIntro, setShowIntro] = useState(window.location.pathname !== '/login');
  const [isMaintenance, setIsMaintenance] = useState(false);
  const { isOpen, viewMode } = usePiP();
  const location = useLocation();

  // 1. Initial Maintenance Check & Socket Listener
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data } = await systemApi.getMaintenanceStatus();
        setIsMaintenance(data?.enabled || false);
      } catch (err) {
          // If we can't even reach the status endpoint, assume something is wrong
      }
    };

    checkStatus();

    // Listen for real-time toggle
    const handleStatusUpdate = (data: { enabled: boolean }) => {
        setIsMaintenance(data.enabled);
    };

    // Listen for initial snapshot
    const handleSnapshot = (data: { maintenance: { enabled: boolean } }) => {
        setIsMaintenance(data.maintenance.enabled);
    };

    // Listen for 503 errors from API Interceptor
    const handle503 = () => setIsMaintenance(true);

    socketService.on('maintenance_status_updated', handleStatusUpdate);
    socketService.on('system_status_snapshot', handleSnapshot);
    window.addEventListener('maintenance-mode', handle503);

    return () => {
      socketService.off('maintenance_status_updated', handleStatusUpdate);
      socketService.off('system_status_snapshot', handleSnapshot);
      window.removeEventListener('maintenance-mode', handle503);
    };
  }, []);

  useUserPresence(user);

  useEffect(() => {
    // Show intro on initial load or session recovery
    if (user && !authLoading) {
      setShowIntro(true);
    }
  }, [user, authLoading]);

  const isInitialLoading = authLoading || (user && roleLoading);
  const shouldShowIntro = showIntro || isInitialLoading;

  return (
    <>
      {isOpen && viewMode === 'TIMER_PAGE' && (
        <TimerPiP />
      )}
      <AnimatePresence>
        {shouldShowIntro && (
          <IntroAnimation
            isLoading={!!isInitialLoading}
            onComplete={() => setShowIntro(false)}
            key="intro"
          />
        )}
      </AnimatePresence>

      {isMaintenance && !isAdminLevel && location.pathname !== '/login' ? (
        <MaintenancePage />
      ) : !shouldShowIntro && (
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            !user ? <LoginPage /> : (
              (user.isActive !== false && user.role !== ROLES.NEW_USER) 
                ? <Navigate to="/timer" replace /> 
                : <Navigate to="/restricted" replace />
            )
          } />

          <Route path="/restricted" element={
            user ? (
              (user.isActive !== false && user.role !== ROLES.NEW_USER)
                ? <Navigate to={isAdminLevel ? "/admin/open-cases" : "/timer"} replace />
                : <RestrictedPage />
            ) : <Navigate to="/login" replace />
          } />

          <Route path="/" element={
            user ? (
              (user.isActive !== false && user.role !== ROLES.NEW_USER)
                ? <Navigate to={isAdminLevel ? "/admin/open-cases" : "/timer"} replace />
                : <Navigate to="/restricted" replace />
            ) : <Navigate to="/login" replace />
          } />

          {/* Protected Area */}
          <Route element={<ProtectedRoute />}>
            <Route path="*" element={
              <div className={styles.appContainer}>
                <Header isOnline={true} />
                <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

                <AnimatePresence>
                  {!isSidebarCollapsed && (
                    <m.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsSidebarCollapsed(true)}
                      className={styles.overlay}
                    />
                  )}
                </AnimatePresence>
                <main className={styles.mainContent}>
                  <AnimatePresence mode="wait">
                    <Routes location={location} key={location.pathname}>
                      <Route path="/timer" element={
                        <Suspense fallback={<PageLoading />}>
                          <PageWrapper>
                            <TimerPage />
                          </PageWrapper>
                        </Suspense>
                      } />



                      <Route path="/admin/*" element={
                        isAdminLevel ? (
                          <Suspense fallback={<AdminLoading />}>
                            <PageWrapper>
                              <AdminRoutes />
                            </PageWrapper>
                          </Suspense>
                        ) : (
                          <Navigate to="/timer" replace />
                        )
                      } />

                      <Route path="*" element={<Navigate to={isAdminLevel ? "/admin/open-cases" : "/timer"} replace />} />
                    </Routes>
                  </AnimatePresence>
                </main>
              </div>
            } />
          </Route>
        </Routes>
      )}
    </>
  );
}

function App() {
  return (
    <Router>
      <LazyMotion features={domAnimation}>
        <AuthProvider>
          <PiPProvider>
            <UserProvider>
              <AppContent />
            </UserProvider>
          </PiPProvider>
        </AuthProvider>
      </LazyMotion>
    </Router>
  );
}

export default App;