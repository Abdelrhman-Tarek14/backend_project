import { useState, useEffect } from 'react';
import styles from './TimerPage.module.css';
import { useAuth } from '../features/auth/hooks/useAuth';
import { timerService } from '../features/timer/services/timerService';
import { EtaCalculator } from '../features/timer/components/EtaCalculator';
import { ActiveCase } from '../features/timer/components/ActiveCase';

import {  BiCheckCircle } from 'react-icons/bi';

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


    const [activeCases, setActiveCases] = useState<TimerCase[]>([]);
    const [showToast, setShowToast] = useState<boolean>(false);

    useEffect(() => {
        if (!user?.email) return;

        const unsubActive = timerService.subscribeToActiveCases(user.email, (cases) => {
            setActiveCases((prevCases) => {
                const newCases = cases ? (cases as unknown as TimerCase[]) : [];
                if (prevCases.length > 0 && newCases.length < prevCases.length) {
                    handleCaseCompleted();
                }
                return newCases;
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


            {/* Active Case Section */}
            <div className={styles.activeCaseContainer}>
                {activeCases.length > 0 ? (
                    activeCases.map((caseData) => (
                        <ActiveCase
                            key={caseData.case_number}
                            caseData={caseData}
                        />
                    ))
                ) : (
                    <div className={styles.emptyActiveCase}>
                        <div className={styles.emptyIcon}>
                            <div className={`${styles.z} ${styles.z1}`}>Z</div>
                            <div className={`${styles.z} ${styles.z2}`}>Z</div>
                            <div className={`${styles.z} ${styles.z3}`}>Z</div>
                            <div className={`${styles.z} ${styles.z4}`}>Z</div>
                        </div>
                        <h3>No Active Cases</h3>
                        <p>Waiting for new case assignments...</p>
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