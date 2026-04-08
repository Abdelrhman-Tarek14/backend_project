import { Routes, Route, Navigate } from 'react-router-dom';

import { lazy } from 'react';

const AdminLayout = lazy(() => import('../layout/AdminLayout').then(module => ({ default: module.AdminLayout })));
const OpenCasesPage = lazy(() => import('../open-cases/OpenCasesPage'));
const SystemLogPage = lazy(() => import('../system-monitor/SystemLogPage'));
const ClosedCasesPage = lazy(() => import('../closed-cases/ClosedCasesPage'));
const ActivityHistoryPage = lazy(() => import('../activity-history/ActivityHistoryPage'));

export default function AdminRoutes() {
    return (
        <Routes>
            <Route element={<AdminLayout />}>
                <Route index element={<Navigate to="open-cases" replace />} />
                <Route path="open-cases" element={<OpenCasesPage />} />
                <Route path="closed-cases" element={<ClosedCasesPage />} />
                <Route path="activity-history" element={<ActivityHistoryPage />} />
                <Route path="system-monitor" element={<SystemLogPage />} />
            </Route>
        </Routes>
    );
}