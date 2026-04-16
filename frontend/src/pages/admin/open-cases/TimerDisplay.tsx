import React, { useState, useEffect } from 'react';
import styles from './TimerDisplay.module.css';

export interface TimeDetails {
    start: Date;
    end: Date;
    totalDurationMs?: number;
}

export interface TimerDisplayProps {
    timeDetails?: TimeDetails | null;
    isExceeded?: boolean | null;
    isWaitingEta?: boolean | null;
    isNearExceeded?: boolean | null;
    isScheduled?: boolean | null;
}

export const TimerDisplay = React.memo(({
    timeDetails,
    isExceeded,
    isWaitingEta,
    isNearExceeded,
    isScheduled
}: TimerDisplayProps) => {
    const [timeStr, setTimeStr] = useState<string>('--:--');

    useEffect(() => {
        const calculateTimeStr = () => {
            if (!timeDetails || !timeDetails.start || !timeDetails.end) return '--:--';
            const now = new Date();

            if (isScheduled) {
                const timeUntilStart = timeDetails.start.getTime() - now.getTime();
                return formatTimeDisplay(timeUntilStart);
            }

            const remaining = timeDetails.end.getTime() - now.getTime();

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

    const formatTimeDisplay = (ms: number | null) => {
        if (ms === null || !Number.isFinite(ms)) return "--:--";

        const totalSecs = Math.floor(ms / 1000);
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;

        const pad = (n: number) => n.toString().padStart(2, '0');

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

TimerDisplay.displayName = 'TimerDisplay';