import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// For AdminLayout, we use the named export correctly in the lazy import
const OpenCasesPage = lazy(() => import('../open-cases/OpenCasesPage'));
const SystemStatusPage = lazy(() => import('../system/SystemStatusPage'));

const AdminPageLoading = () => (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        Loading Admin Page...
    </div>
);

export default function AdminRoutes() {
    return (
        <Suspense fallback={<AdminPageLoading />}>
            <Routes>
                <Route>
                    <Route index element={<Navigate to="open-cases" replace />} />
                    <Route path="open-cases" element={<OpenCasesPage />} />
                    <Route path="system-status" element={<SystemStatusPage />} />
                </Route>
            </Routes>
        </Suspense>
    );
}

