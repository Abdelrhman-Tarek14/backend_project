import React from 'react';
import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
    isExceeded: boolean;
    isScheduled: boolean;
    isOpen: boolean;
    isWaitingEta: boolean;
    isNearExceeded: boolean;
    isBacklog: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
    isExceeded, 
    isScheduled, 
    isOpen, 
    isWaitingEta, 
    isNearExceeded, 
    isBacklog 
}) => {
    if (!isOpen) return <div className={`${styles.statusBadge} ${styles.statusClosed}`}>Closed</div>;

    let label = 'On Time';
    let styleClass = styles.statusOnTime;

    if (isBacklog) {
        label = 'Back Log';
        styleClass = styles.statusBacklog;
    } else if (isWaitingEta) {
        label = 'Waiting for ETA';
        styleClass = styles.statusWaitingEta;
    } else if (isExceeded) {
        label = 'Exceeding';
        styleClass = styles.statusExceeding;
    } else if (isNearExceeded) {
        label = 'Near Exceeded';
        styleClass = styles.statusNearExceeded;
    } else if (isScheduled) {
        label = 'Scheduled';
        styleClass = styles.statusClosed;
    }

    const fontSize = label.length > 12 ? '0.6rem' : '0.7rem';

    return <div className={`${styles.statusBadge} ${styleClass}`} style={{ fontSize }}>{label}</div>;
};