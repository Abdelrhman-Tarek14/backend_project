import { useState, useEffect } from 'react';
import styles from './TimerPage.module.css';
import { useAuth } from '../features/auth/hooks/useAuth';
import { timerService } from '../features/timer/services/timerService';
import { EtaCalculator } from '../features/timer/components/EtaCalculator';
import { ActiveCase } from '../features/timer/components/ActiveCase';
import { useUserRole } from '../hooks/useUserRole';
import { usePiP } from '../context/PiPContext';
import { BiWindows, BiRefresh, BiLoaderAlt, BiCheckCircle } from 'react-icons/bi';
import { RiArrowDownDoubleFill, RiArrowUpDoubleFill } from 'react-icons/ri';

export function TimerPage() {
    const { user } = useAuth();
    const [activeCase, setActiveCase] = useState(null);
    const [closedCases, setClosedCases] = useState([]);
    const [loading, setLoading] = useState(true); // Global loading
    const [loadingHistory, setLoadingHistory] = useState(false); // Button loading
    const [hasMore, setHasMore] = useState(true);

    // History Collapse State
    const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false); // Kept this as it's used later

    const [showToast, setShowToast] = useState(false);

    const { role } = useUserRole();
    const { openPiP } = usePiP();

    // Pagination State
    const [page, setPage] = useState(1);

    // Help combine start_date and start_time into a Date object
    const getStartDate = (item) => {
        if (!item) return null;
        if (item.start_date && item.start_time) {
            return new Date(`${item.start_date}T${item.start_time}`);
        }
        // Fallback for legacy if absolutely necessary
        if (item.timestamp) {
            const safeTs = item.timestamp.includes('/')
                ? item.timestamp.split(' ').map((p, i) => i === 0 ? p.split('/').reverse().join('-') : p).join('T')
                : item.timestamp.replace(' ', 'T');
            return new Date(safeTs);
        }
        return null;
    };

    // Load History Function
    const loadHistory = async (isInitial = false) => {
        try {
            if (isInitial) {
                setLoading(true);
            } else {
                setLoadingHistory(true);
            }

            const fetchPage = isInitial ? 1 : page + 1;
            const newCases = await timerService.getClosedCases(fetchPage, 10);

            if (newCases.length < 10) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            if (isInitial) {
                setClosedCases(newCases);
                setPage(1);
            } else {
                setClosedCases(prev => {
                    // Prevent duplicates when rapid clicking
                    const existingIds = new Set(prev.map(c => c.id));
                    const uniqueNew = newCases.filter(c => !existingIds.has(c.id));
                    return [...prev, ...uniqueNew];
                });
                setPage(fetchPage);
            }

        } catch (error) {
            console.error("Failed to load history", error);
        } finally {
            setLoading(false);
            setLoadingHistory(false);
        }
    };

    // 1. Fetch Active Case & Initial History
    useEffect(() => {
        if (!user?.email) return;

        const unsubActive = timerService.subscribeToActiveCases(user.email, (cases) => {
            if (cases && cases.length > 0) {
                setActiveCase(cases[0]);
            } else {
                setActiveCase(null);
            }
        });

        loadHistory(true);

        return () => unsubActive();
    }, [user]);

    // const handleComplete = async (expectedEndDate) => {
    //     if (!activeCase) return;
    //     try {
    //         await timerService.completeCase(activeCase, expectedEndDate);
    //         setShowToast(true);
    //         setTimeout(() => setShowToast(false), 3000);
    //     } catch (error) {
    //         console.error("Failed to complete case", error);
    //     }
    // };



    // Calculate Duration accurately
    const calculateDuration = (item) => {
        const start = getStartDate(item);
        const end = item.timestamp_closed_iso ? new Date(item.timestamp_closed_iso) : null;

        if (!start || isNaN(start.getTime()) || !end || isNaN(end.getTime())) return '-';

        let diffMs = end - start;
        const totalSec = Math.floor(diffMs / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;

        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    // Calculate Deviation accurately
    const calculateDeviation = (item) => {
        const expected = item.expected_end_iso ? new Date(item.expected_end_iso) : null;
        const actual = item.timestamp_closed_iso ? new Date(item.timestamp_closed_iso) : null;

        if (!expected || isNaN(expected.getTime()) || !actual || isNaN(actual.getTime())) return '';

        let diffMs = actual - expected;
        const absDiff = Math.abs(diffMs);
        const totalSec = Math.floor(absDiff / 1000);
        const m = Math.floor(totalSec / 60);
        const s = totalSec % 60;

        if (totalSec === 0) return '';
        return `${m}m ${s}s`;
    };

    return (
        <div className={styles.container}>
            {/* Header Section */}
            <div className={styles.header}>
                <h1 className={styles.title}>ETA Tracker</h1>
                <p className={styles.description}>
                    Monitor your case deadlines and performance in real-time.
                </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', marginTop: '-1rem' }}>
                <button
                    onClick={() => openPiP('TIMER_PAGE', { width: 240, height: 170 })}
                    style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        background: 'var(--color-success-bg)',
                        color: 'var(--color-primary)',
                        border: '1px solid var(--color-border)',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    <BiWindows /> Float Mode
                </button>
            </div>

            {/* Active Case Section */}
            <div className={styles.activeCaseContainer}>
                {activeCase ? (
                    <ActiveCase
                        key={activeCase.case_number}
                        caseData={activeCase}
                        onComplete={() => loadHistory(true)}
                    />
                ) : (
                    <div className={styles.emptyState}>
                        <p>No active case right now. Waiting for new form submission...</p>
                    </div>
                )}
            </div>

            {/* {ETA Calculator} */}
            <div className={styles.calculatorWrapper}>
                <EtaCalculator />
            </div>
            {/* History Section - CARD LAYOUT */}
            {role === 'owner' && (
                <div className={styles.historySection}>
                    <div className={styles.historyHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h3 className={styles.historyTitle}>Completed History</h3>
                            <button
                                onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                                className={styles.collapseBtn}
                                title={isHistoryCollapsed ? "Expand" : "Collapse"}
                            >
                                {isHistoryCollapsed ? (
                                    <>
                                        <span>Expand</span>
                                        <RiArrowDownDoubleFill />
                                    </>
                                ) : (
                                    <>
                                        <span>Collapse</span>
                                        <RiArrowUpDoubleFill />
                                    </>
                                )}
                            </button>
                            <button
                                className={styles.refreshBtn}
                                onClick={() => loadHistory(true)}
                                title="Refresh History"
                                disabled={loadingHistory}
                            >
                                <BiRefresh className={loadingHistory ? styles.spin : ''} />
                            </button>
                        </div>
                    </div>
                    {!isHistoryCollapsed && (
                        <>
                            {loadingHistory && closedCases.length === 0 ? (
                                <div className={styles.loadingContainer}><BiLoaderAlt className={styles.spinner} /> Loading History...</div>
                            ) : (
                                <div className={styles.historyList}>
                                    {closedCases.map((item) => {
                                        const deviation = calculateDeviation(item);
                                        const isExceeding = item.completion_status === 'Exceeding';

                                        return (
                                            <div key={item.case_number} className={styles.historyCard}>
                                                <div className={styles.cardHeader}>
                                                    <span className={styles.caseNumber}>#{item.case_number}</span>
                                                    <span className={`${styles.statusBadge} ${isExceeding ? styles.statusExceeding : styles.statusOntime}`}>
                                                        {item.completion_status} {deviation && `(${deviation})`}
                                                    </span>
                                                </div>
                                                <div className={styles.cardBody}>
                                                    <div className={styles.infoRow}>
                                                        <span className={styles.infoLabel}>Type</span>
                                                        <span className={styles.infoValue}>{item.case_type}</span>
                                                    </div>
                                                    <div className={styles.infoRow}>
                                                        <span className={styles.infoLabel}>Started</span>
                                                        <span className={styles.infoValue}>
                                                            {item.start_date ? `${item.start_date} ${item.start_time}` : item.timestamp}
                                                        </span>
                                                    </div>
                                                    <div className={styles.infoRow}>
                                                        <span className={styles.infoLabel}>Completed</span>
                                                        <span className={styles.infoValue}>{item.closed_at || item.actual_end_time || '-'}</span>
                                                    </div>
                                                    <div className={styles.infoRow}>
                                                        <span className={styles.infoLabel}>Duration</span>
                                                        <span className={styles.infoValue}>{calculateDuration(item)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {!loadingHistory && closedCases.length === 0 && (
                                        <div className={styles.noHistory}>No completed cases found.</div>
                                    )}
                                </div>
                            )}

                            {hasMore && !loadingHistory && closedCases.length > 0 && (
                                <div className={styles.loadMoreContainer}>
                                    <button className={styles.loadMoreBtn} onClick={() => loadHistory(false)} disabled={loadingHistory}>
                                        {loadingHistory ? <BiLoaderAlt className={styles.spinner} /> : 'Load More Cases'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Toast Notification */}
            {showToast && (
                <div className={styles.toast}>
                    <BiCheckCircle size={20} />
                    <span>Case Completed Successfully!</span>
                </div>
            )}
        </div>
    );
}
