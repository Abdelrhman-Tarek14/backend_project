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
  const [showIntro, setShowIntro] = useState(true);
  const { isOpen, viewMode } = usePiP();
  const location = useLocation();

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

      {!shouldShowIntro && (
        <Routes>
          {/* Public Route */}
          <Route path="/" element={
            !user ? <LoginPage /> : <Navigate to="/timer" replace />
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

                      <Route path="*" element={<Navigate to="/timer" replace />} />
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