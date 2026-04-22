import React from 'react';
import { BiHash, BiTime } from 'react-icons/bi';
import styles from './TimerPagePiPContent.module.css';
import type { TimerCaseData } from '../hooks/useCaseTimer';

interface PiPContentProps {
    activeCase: TimerCaseData | null;
    isExceeded: boolean;
    timeLeft: number;
    formatTime: (ms: number) => string;
    startTime: Date | null;
}

export const PiPContent: React.FC<PiPContentProps> = ({
    activeCase,
    isExceeded,
    timeLeft,
    formatTime,
    startTime
}) => {
    if (!activeCase) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <BiTime size={32} />
                    <p>No active case</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* 1. Timer Display */}
            <div className={styles.mainDisplay}>
                <div className={styles.timeLabel}>{isExceeded ? 'Exceeded' : 'Remaining'}</div>
                <div className={`${styles.timeValue} ${isExceeded ? styles.overdue : ''}`}>
                    {formatTime(timeLeft)}
                </div>
            </div>

            {/* 2. Case Number */}
            <div className={styles.header}>
                <div className={styles.caseInfo}>
                    <BiHash size={14} color="#FF5722" />
                    <span className={styles.caseNumber}>{activeCase.case_number}</span>
                </div>
            </div>

            {/* 3. ETA & Start Time */}
            <div className={styles.footerGrid}>
                <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>ETA</span>
                    <span className={styles.metaValue}>{activeCase.eta || 0}m</span>
                </div>
                <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Start</span>
                    <span className={styles.metaValue}>
                        {startTime ? startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                    </span>
                </div>
            </div>
        </div>
    );
};
