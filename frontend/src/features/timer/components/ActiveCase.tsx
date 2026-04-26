import React from 'react';
import styles from './ActiveCase.module.css';
import { BiHash, BiCategory, BiLinkExternal, BiWindows } from 'react-icons/bi';
import { useCaseTimer } from '../hooks/useCaseTimer';
import type { TimerCaseData } from '../hooks/useCaseTimer';
import { usePiP } from '../../../context/PiPContext';

export interface ActiveCaseProps {
    caseData: TimerCaseData;
}

export const ActiveCase: React.FC<ActiveCaseProps> = ({ caseData }) => {
    const { openPiP } = usePiP();
    const {
        case_number,
        case_type,
        eta,
        ownerEmail
    } = caseData;

    const handleOpenForm = () => {
        const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLScPTPZefAuASuRKBMt-k5_k3kTan6XsxI6cKsgh9zNgXPOFYQ/viewform";
        const caseEntry = "entry.1432700205";
        const emailEntry = "entry.757853534";
        
        const finalUrl = `${formUrl}?${caseEntry}=${case_number}&${emailEntry}=${encodeURIComponent(ownerEmail || '')}`;
        window.open(finalUrl, "_blank");
    };

    const {
        timeLeft,
        progress,
        startTime,
        endTime,
        formatTime,
        isExceeded,
        isScheduled,
        isWaitingEta
    } = useCaseTimer(caseData);

    // Removed forced loading state to allow rendering fallback --:-- if start time is missing
    // if (!startTime || !endTime) return <div className={styles.loading}>Loading Case Data...</div>;

    return (
        <div className={`${styles.container} ${isExceeded ? styles.overdue : ''}`}>
            {/* Header: Case Info */}
            <div className={styles.header}>
                <div className={styles.caseInfo}>
                    <div className={styles.badge}>
                        {isScheduled ? 'SCHEDULED' : 'ACTIVE'}
                    </div>
                    <div className={styles.caseNumber}>
                        <BiHash className={styles.icon} />
                        <span>{case_number}</span>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    {isWaitingEta && (
                        <button 
                            className={styles.formBtn} 
                            onClick={handleOpenForm}
                            title="Open ETA Form"
                        >
                            <BiLinkExternal />
                            <span>ETA Form</span>
                        </button>
                    )}
                    <button 
                        className={styles.floatBtn} 
                        onClick={() => openPiP('TIMER_PAGE', { width: 240, height: 170 }, caseData)}
                        title="Open Float Mode"
                    >
                        <BiWindows />
                        <span>Float Mode</span>
                    </button>
                    <div className={styles.caseType}>
                        <BiCategory className={styles.icon} />
                        <span>{case_type}</span>
                    </div>
                </div>
            </div>

            {/* Timer Display */}
            <div className={styles.timerSection}>
                <div className={styles.timerLabel}>
                    {isExceeded ? "TIME EXCEEDED BY" : "TIME REMAINING"}
                </div>
                <div className={styles.timerValue}>
                    {formatTime(timeLeft)}
                </div>
            </div>

            {/* Progress Bar */}
            <div className={styles.progressContainer}>
                <div
                    className={styles.progressBar}
                    style={{ width: `${progress}%`, backgroundColor: isExceeded ? '#F44336' : '#FF5722' }}
                />
                <div className={styles.progressText}>{Math.round(progress)}%</div>
            </div>

            {/* Meta Details */}
            <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                    <span className={styles.label}>Start Time</span>
                    <div className={styles.lockedTime}>
                        <span>
                            {startTime 
                                ? `${startTime.getDate().toString().padStart(2, '0')}/${(startTime.getMonth() + 1).toString().padStart(2, '0')} - ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
                                : '--:--'
                            }
                        </span>
                    </div>
                </div>
                <div className={styles.metaItem}>
                    <span className={styles.label}>ETA</span>
                    <span className={styles.value}>{eta} min</span>
                </div>
                <div className={styles.metaItem}>
                    <span className={styles.label}>Expected End</span>
                    <span className={styles.value}>
                        {endTime ? endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                </div>
            </div>
        </div>
    );
};