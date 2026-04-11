import React, { useState } from 'react';
import styles from './ActiveCase.module.css';
import { BiTimeFive, BiHash, BiCategory, BiCalendar, BiCheckCircle, BiLoaderAlt, BiPencil } from 'react-icons/bi';
import { timerService } from '../services/timerService';
import { useCaseTimer } from '../hooks/useCaseTimer';
import { useAppControls } from '../../../pages/admin/hooks/useAppControls';
import Swal from 'sweetalert2';


export const ActiveCase = ({ caseData, onComplete }) => {
    const [isCompleting, setIsCompleting] = useState(false);

    const controls = useAppControls();

    const canEditStartTime = controls.allow_agent_edit_start_time;

    const {
        case_number,
        case_type,
        eta,
        assignmentId
    } = caseData;

    const {
        timeLeft,
        progress,
        startTime,
        endTime,
        formatTime,
        isExceeded,
        isScheduled
    } = useCaseTimer(caseData);

    if (!startTime) return <div className={styles.loading}>Loading Case Data...</div>;

    // Use assignmentId if available, otherwise case_number
    const activeCaseId = assignmentId || case_number;

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
                <div className={styles.caseType}>
                    <BiCategory className={styles.icon} />
                    <span>{case_type}</span>
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
                        <span>{startTime.getDate().toString().padStart(2, '0')}/${(startTime.getMonth() + 1).toString().padStart(2, '0')} - {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                    </div>
                </div>
                <div className={styles.metaItem}>
                    <span className={styles.label}>ETA</span>
                    <span className={styles.value}>{eta} min</span>
                </div>
                <div className={styles.metaItem}>
                    <span className={styles.label}>Expected End</span>
                    <span className={styles.value}>
                        {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>


        </div>
    );
};
