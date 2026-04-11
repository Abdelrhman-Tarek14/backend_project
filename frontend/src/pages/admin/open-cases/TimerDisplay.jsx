import React, { useState, useEffect } from 'react';
import styles from './TimerDisplay.module.css';

export const TimerDisplay = React.memo(({ timeDetails, isExceeded, isWaitingEta, isNearExceeded, isScheduled }) => {
    const [timeStr, setTimeStr] = useState('--:--');

    useEffect(() => {
        const calculateTimeStr = () => {
            if (!timeDetails) return '--:--';
            const now = new Date();

            if (isScheduled) {
                const timeUntilStart = timeDetails.start - now;
                return formatTimeDisplay(timeUntilStart);
            }

            const remaining = timeDetails.end - now;

            if (remaining > 0) {
                return formatTimeDisplay(remaining);
            } else {
                return formatTimeDisplay(Math.abs(remaining));
            }
        };

        const tick = () => {
            const newStr = calculateTimeStr();
            setTimeStr(newStr);
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [timeDetails, isScheduled]);

    const formatTimeDisplay = (ms) => {
        if (ms === null || !Number.isFinite(ms)) return "--:--";
        const totalSecs = Math.floor(ms / 1000);
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;

        const pad = (n) => n.toString().padStart(2, '0');

        if (h > 0) {
            return `${h}:${pad(m)}:${pad(s)}`;
        }
        return `${pad(m)}:${pad(s)}`;
    };

    let timerClass = styles.timerOnTime;
    if (isWaitingEta) timerClass = styles.timerWaitingEta;
    else if (isExceeded) timerClass = styles.timerExceeding;
    else if (isNearExceeded) timerClass = styles.timerNearExceeded;

    return (
        <div className={`${styles.timerDisplay} ${timerClass}`}>
            {timeStr}
        </div>
    );
});
