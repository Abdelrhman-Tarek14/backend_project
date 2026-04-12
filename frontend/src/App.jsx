import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { useAuth } from './features/auth/hooks/useAuth';
import { LoginPage } from './features/auth/components/LoginPage';
import { useUserPresence } from './features/auth/hooks/useUserPresence';
import { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IntroAnimation } from './components/ui/IntroAnimation';
import { PiPProvider, usePiP } from './context/PiPContext';
import { UserProvider } from './context/UserContext';
import { TimerPiP } from './features/timer/components/TimerPiP';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { TimerPage } from './pages/TimerPage';
import { useUserRole } from './hooks/useUserRole';

const AdminRoutes = lazy(() => import('./pages/admin/routes/AdminRoutes'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const PageLoading = () => (
  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
    Loading section...
  </div>
);

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.4, ease: "easeOut" }}
    className="page-transition-wrapper"
  >
    {children}
  </motion.div>
);

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

  useUserPresence(user, false);

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
            isLoading={isInitialLoading}
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
              <div className="app-container" style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg-light)' }}>
                <Header isOnline={true} isIdle={false} />
                <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />

                <AnimatePresence>
                  {!isSidebarCollapsed && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsSidebarCollapsed(true)}
                      style={{
                        position: 'fixed',
                        top: '80px',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.18)',
                        backdropFilter: 'blur(.5px)',
                        zIndex: 99,
                        cursor: 'pointer'
                      }}
                    />
                  )}
                </AnimatePresence>
                <main
                  style={{
                    display: 'flex',
                    margin: '65px 10px 0px 85px',
                    width: 'calc(100% - 85px)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    height: 'calc(100vh - 65px)',
                    overflowY: 'auto',
                    overflowX: 'hidden'
                  }}
                >
                  <AnimatePresence mode="wait">
                    <Routes location={location} key={location.pathname}>
                      <Route path="/timer" element={
                        <Suspense fallback={<PageLoading />}>
                          <PageWrapper>
                            <TimerPage />
                          </PageWrapper>
                        </Suspense>
                      } />

                      <Route path="/dashboard" element={
                        <Suspense fallback={<PageLoading />}>
                          <PageWrapper>
                            <DashboardPage />
                          </PageWrapper>
                        </Suspense>
                      } />

                      <Route path="/profile" element={
                        <Suspense fallback={<PageLoading />}>
                          <PageWrapper>
                            <ProfilePage />
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
      <AuthProvider>
        <PiPProvider>
          <UserProvider>
            <AppContent />
          </UserProvider>
        </PiPProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;