import styles from '../../AdminPage.module.css';

export const TimerDisplay = ({ timeStr, isOverdue, isWaitingEta, isNearExceeded }) => {
    let timerClass = styles.timerOnTime;
    if (isWaitingEta) timerClass = styles.timerWaitingEta;
    else if (isOverdue) timerClass = styles.timerExceeding;
    else if (isNearExceeded) timerClass = styles.timerNearExceeded;

    return (
        <div className={`${styles.timerDisplay} ${timerClass}`}>
            {timeStr}
        </div>
    );
};
