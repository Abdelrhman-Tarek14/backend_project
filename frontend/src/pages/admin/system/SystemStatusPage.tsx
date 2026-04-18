import { useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { BiServer, BiData, BiCloud, BiRefresh, BiWrench, BiLockAlt, BiLockOpenAlt, BiStats, BiPulse } from 'react-icons/bi';
import { TbApi } from 'react-icons/tb';
import { systemApi } from '../../../api/systemApi';
import type { SystemHealthResponse } from '../../../api/systemApi';
import socketService from '../../../services/socket';
import Swal from 'sweetalert2';
import styles from './SystemStatusPage.module.css';

const formatMemory = (mb: number) => {
    if (mb < 1024) return `${mb} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
};

const formatUptime = (seconds: number) => {
    if (!seconds) return '0m';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || (d === 0 && h === 0)) parts.push(`${m}m`);
    return parts.join(' ');
};

const formatTime = (isoString?: string | null) => {
    if (!isoString) return 'Never';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const StatusBadge = ({ status }: { status?: 'operational' | 'down' | 'degraded' | 'live' }) => {
    const isLive = status === 'live';
    const statusClass = isLive ? styles.live : styles[status || 'down'];
    
    return (
        <div className={`${styles.statusBadge} ${statusClass}`}>
            <div className={styles.statusDot} />
            <span>{isLive ? 'Live' : (status || 'down')}</span>
        </div>
    );
};

const SystemStatusPage = () => {
    const [isMaintenance, setIsMaintenance] = useState<boolean>(false);
    const [healthData, setHealthData] = useState<SystemHealthResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    const fetchData = useCallback(async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true);
        try {
            const [maintenanceRes, healthRes] = await Promise.all([
                systemApi.getMaintenanceStatus(),
                systemApi.getSystemHealth()
            ]);
            setIsMaintenance(maintenanceRes.data.enabled);
            setHealthData(healthRes.data);
        } catch (error) {
            console.error('Failed to fetch system metrics:', error);
            // On failure to fetch health, we might simulate a 'down' state for the API
            setHealthData(prev => prev ? { ...prev, services: { ...prev.services, backend: { status: 'down' } } } as any : null);
        } finally {
            setLoading(false);
            if (isManualRefresh) {
                setTimeout(() => setRefreshing(false), 500); // small delay for UX so spinner is visible
            }
        }
    }, []);

    useEffect(() => {
        fetchData();

        // 1. Initial Snapshot (if socket connects after component mounts)
        const handleSnapshot = (data: { maintenance: { enabled: boolean }, health: SystemHealthResponse }) => {
            setIsMaintenance(data.maintenance.enabled);
            setHealthData(data.health);
        };

        // 2. Periodic Metrics (Heartbeat)
        const handleMetricsUpdate = (data: SystemHealthResponse) => {
            setHealthData(data);
        };

        // 3. Global Maintenance Toggle
        const handleMaintenanceUpdate = (data: { enabled: boolean }) => {
            setIsMaintenance(data.enabled);
        };

        socketService.on('system_status_snapshot', handleSnapshot);
        socketService.on('system_metrics_update', handleMetricsUpdate);
        socketService.on('maintenance_status_updated', handleMaintenanceUpdate);

        return () => {
            socketService.off('system_status_snapshot', handleSnapshot);
            socketService.off('system_metrics_update', handleMetricsUpdate);
            socketService.off('maintenance_status_updated', handleMaintenanceUpdate);
        };
    }, [fetchData]);

    const handleToggleMaintenance = async () => {
        const action = isMaintenance ? 'Disable' : 'Enable';

        const result = await Swal.fire({
            title: `${action} Maintenance Mode?`,
            text: isMaintenance
                ? "The system will be accessible to all users immediately."
                : "This will block all non-administrative users from accessing the system and API.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: isMaintenance ? '#10b981' : '#f59e0b',
            cancelButtonColor: '#64748b',
            confirmButtonText: `Yes, ${action} it!`,
            background: '#1e293b',
            color: '#fff'
        });

        if (result.isConfirmed) {
            try {
                const { data } = await systemApi.toggleMaintenance(!isMaintenance);
                setIsMaintenance(data.enabled);
                Swal.fire({
                    title: 'Success!',
                    text: `Maintenance mode has been ${data.enabled ? 'enabled' : 'disabled'}.`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    background: '#1e293b',
                    color: '#fff'
                });
            } catch (error) {
                Swal.fire('Error', 'Failed to update maintenance mode.', 'error');
            }
        }
    };

    if (loading) {
        return (
            <div className={styles.loadingWrapper}>
                <BiRefresh size={48} className={styles.spinIcon} />
                <p>Establishing secure connection to telemetry servers...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>System Health & Observability</h1>
                    <p className={styles.subtitle}>Real-time infrastructure monitoring and global state control.</p>
                </div>
                <button
                    className={styles.refreshBtn}
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                >
                    <BiRefresh size={20} className={refreshing ? styles.spinIcon : ''} />
                    <span>{refreshing ? 'Syncing...' : 'Refresh Status'}</span>
                </button>
            </header>

            <AnimatePresence>
                <div className={styles.grid} key="system-metrics-grid">

                    {/* Backend API Card */}
                    <m.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0 }}
                        className={`${styles.card} ${healthData ? styles.operational : styles.down}`}
                    >
                        <div className={styles.cardHeader}>
                            <div className={styles.cardHeaderLeft}>
                                <div className={`${styles.iconBox} ${styles.iconApi}`}><TbApi /></div>
                                <div className={styles.cardTitleArea}>
                                    <h3>Backend API Node</h3>
                                    <p className={styles.subtitleText}>Primary application server</p>
                                </div>
                            </div>
                            <StatusBadge status={healthData ? 'operational' : 'down'} />
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.metricRow}>
                                <span className={styles.metricLabel}>Process Uptime</span>
                                <span className={styles.metricValue}>{formatUptime(healthData?.uptime || 0)}</span>
                            </div>
                            <div className={styles.metricRow}>
                                <span className={styles.metricLabel}>Last Ping</span>
                                <span className={styles.metricValue}>{formatTime(healthData?.timestamp)}</span>
                            </div>
                        </div>
                    </m.div>

                    {/* Database Card */}
                    <m.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                        className={`${styles.card} ${styles[healthData?.services?.database.status || 'down']}`}
                    >
                        <div className={styles.cardHeader}>
                            <div className={styles.cardHeaderLeft}>
                                <div className={`${styles.iconBox} ${styles.iconDatabase}`}><BiData /></div>
                                <div className={styles.cardTitleArea}>
                                    <h3>Relational Database</h3>
                                    <p className={styles.subtitleText}>Primary PostgreSQL Datastore</p>
                                </div>
                            </div>
                            <StatusBadge status={healthData?.services?.database.status} />
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.metricRow}>
                                <span className={styles.metricLabel}>Connection Ping</span>
                                <span className={styles.metricValue}>{healthData?.services?.database.status === 'operational' ? '< 10ms' : 'Timeout'}</span>
                            </div>
                        </div>
                    </m.div>

                    {/* WebSockets Card */}
                    <m.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                        className={`${styles.card} ${styles[healthData?.services?.websockets.status || 'down']}`}
                    >
                        <div className={styles.cardHeader}>
                            <div className={styles.cardHeaderLeft}>
                                <div className={`${styles.iconBox} ${styles.iconWebsocket}`}><BiServer /></div>
                                <div className={styles.cardTitleArea}>
                                    <h3>Real-Time Gateway</h3>
                                    <p className={styles.subtitleText}>WebSocket Event Hub</p>
                                </div>
                            </div>
                            <StatusBadge status={healthData?.services?.websockets.status} />
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.metricRow}>
                                <span className={styles.metricLabel}>Client Broadcaster</span>
                                <span className={styles.metricValue}>Active</span>
                            </div>
                        </div>
                    </m.div>

                    {/* Salesforce Card */}
                    <m.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                        className={`${styles.card} ${styles[healthData?.services?.salesforce.status || 'down']}`}
                    >
                        <div className={styles.cardHeader}>
                            <div className={styles.cardHeaderLeft}>
                                <div className={`${styles.iconBox} ${styles.iconSalesforce}`}><BiCloud /></div>
                                <div className={styles.cardTitleArea}>
                                    <h3>Salesforce Engine</h3>
                                    <p className={styles.subtitleText}>SF Webhook Microservice</p>
                                </div>
                            </div>
                            <StatusBadge status={healthData?.services?.salesforce.status} />
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.metricRow}>
                                <span className={styles.metricLabel}>Last Heartbeat</span>
                                <span className={styles.metricValue}>{formatTime(healthData?.services?.salesforce.lastSync)}</span>
                            </div>
                            <div className={styles.metricRow}>
                                <span className={styles.metricLabel}>Pulse Status</span>
                                <span className={styles.metricValue}>{healthData?.services?.salesforce.status === 'operational' ? 'Syncing normal' : 'Signal Lost (>6m)'}</span>
                            </div>
                        </div>
                    </m.div>

                    {/* Server Resources Card */}
                    <m.div 
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
                        className={`${styles.card} ${healthData && healthData.memoryUsageMB > 800 ? styles.degraded : styles.operational}`}
                    >
                        <div className={styles.cardHeader}>
                            <div className={styles.cardHeaderLeft}>
                                <div className={`${styles.iconBox} ${styles.iconResources}`}><BiStats /></div>
                                <div className={styles.cardTitleArea}>
                                    <h3>Server Resources</h3>
                                    <p className={styles.subtitleText}>Node.js Runtime Metrics</p>
                                </div>
                            </div>
                            <StatusBadge status={healthData && healthData.memoryUsageMB > 800 ? 'degraded' : 'operational'} />
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.metricRow}>
                                <span className={styles.metricLabel}>Memory Usage (Heap)</span>
                                <span className={styles.metricValue}>{formatMemory(healthData?.memoryUsageMB || 0)}</span>
                            </div>
                            <div className={styles.progressBarContainer}>
                                <div 
                                    className={`${styles.progressBar} ${
                                        (healthData?.memoryUsageMB || 0) > 800 ? styles.progressCritical : 
                                        (healthData?.memoryUsageMB || 0) > 500 ? styles.progressWarning : styles.progressNormal
                                    }`}
                                    style={{ width: `${Math.min(((healthData?.memoryUsageMB || 0) / 1024) * 100, 100)}%` }}
                                />
                            </div>
                            <div className={styles.metricRow} style={{ marginTop: '1rem' }}>
                                <span className={styles.metricLabel}>CPU Load (1m avg)</span>
                                <span className={styles.metricValue}>{healthData?.cpuLoad.toFixed(2) || '0.00'}</span>
                            </div>
                        </div>
                    </m.div>

                    {/* Live Traffic Card */}
                    <m.div 
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}
                        className={`${styles.card} ${styles.live}`}
                    >
                        <div className={styles.cardHeader}>
                            <div className={styles.cardHeaderLeft}>
                                <div className={`${styles.iconBox} ${styles.iconTraffic}`}><BiPulse /></div>
                                <div className={styles.cardTitleArea}>
                                    <h3>Live Traffic</h3>
                                    <p className={styles.subtitleText}>Real-time active sessions</p>
                                </div>
                            </div>
                            <StatusBadge status="live" />
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.metricRow}>
                                <span className={styles.metricLabel}>Connected Agents</span>
                                <span className={styles.metricValue}>{healthData?.activeUsers || 0}</span>
                            </div>
                             <div className={styles.metricRow}>
                                <span className={styles.metricLabel}>Socket State</span>
                                <span className={styles.metricValue}>Streaming</span>
                            </div>
                        </div>
                    </m.div>

                </div>

                {/* System Controls Section */}
                <m.div
                    key="global-system-controls"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                    className={styles.card}
                >
                    <div className={styles.cardHeader}>
                        <div className={styles.cardHeaderLeft}>
                            <div className={`${styles.iconBox} ${styles.iconControl}`}><BiWrench /></div>
                            <div className={styles.cardTitleArea}>
                                <h3>Global System Controls</h3>
                                <p className={styles.subtitleText}>Manage application-wide states</p>
                            </div>
                        </div>
                    </div>

                    <div className={styles.controlArea}>
                        <p className={styles.controlsDescription}>
                            Maintenance Mode immediately blocks all non-administrative users and APIs. Active users will be forced to a standby screen until the lock is lifted.
                        </p>
                        <button
                            onClick={handleToggleMaintenance}
                            className={`${styles.toggleBtn} ${isMaintenance ? styles.btnDisable : styles.btnEnable}`}
                        >
                            {isMaintenance ? <BiLockOpenAlt size={24} /> : <BiLockAlt size={24} />}
                            <span>{isMaintenance ? 'Lift Maintenance Lock' : 'Engage Maintenance Lock'}</span>
                        </button>
                    </div>
                </m.div>

            </AnimatePresence>
        </div>
    );
};

export default SystemStatusPage;
