import { useState, useEffect } from 'react';
import styles from './TimerPage.module.css';
import { useAuth } from '../features/auth/hooks/useAuth';
import { timerService } from '../features/timer/services/timerService';
import { EtaCalculator } from '../features/timer/components/EtaCalculator';
import { ActiveCase } from '../features/timer/components/ActiveCase';
import { usePiP } from '../context/PiPContext';
import { BiWindows, BiCheckCircle } from 'react-icons/bi';

// 1. تعريف واجهة بيانات الـ Case
export interface TimerCase {
    id?: string | number;
    case_number: string | number;
    case_type?: string;
    start_date?: string;
    start_time?: string;
    timestamp?: string;
    timestamp_closed_iso?: string;
    expected_end_iso?: string;
    completion_status?: string;
    closed_at?: string;
    actual_end_time?: string;
    [key: string]: any;
}

export function TimerPage() {
    const { user } = useAuth();
    const { openPiP } = usePiP();

    const [activeCase, setActiveCase] = useState<TimerCase | null>(null);
    const [showToast, setShowToast] = useState<boolean>(false);

    useEffect(() => {
        if (!user?.email) return;

        const unsubActive = timerService.subscribeToActiveCases(user.email, (cases) => {
            const newActiveCase = cases && cases.length > 0 ? (cases[0] as unknown as TimerCase) : null;

            setActiveCase((prevCase) => {
                if (prevCase && !newActiveCase) {
                    handleCaseCompleted();
                }
                return newActiveCase;
            });
        });

        return () => unsubActive();
    }, [user?.email]);

    const handleCaseCompleted = () => {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
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

            {/* Float Mode Button */}
            <div className={styles.floatBtnWrapper}>
                <button
                    onClick={() => openPiP('TIMER_PAGE', { width: 240, height: 170 })}
                    className={styles.floatBtn}
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
                    />
                ) : (
                    <div className={styles.emptyState}>
                        <p>No active case right now. Waiting for new form submission...</p>
                    </div>
                )}
            </div>

            {/* ETA Calculator */}
            <div className={styles.calculatorWrapper}>
                <EtaCalculator />
            </div>

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