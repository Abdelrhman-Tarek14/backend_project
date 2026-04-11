import { useState, useEffect, useMemo, useRef } from 'react';

/**
 * Highly optimized timer hook for the Admin open cases grid.
 * ONLY triggers React re-renders when critical thresholds are crossed
 * (e.g., status changes to Overdue, or progress hits 75%).
 * It does NOT trigger a re-render every second.
 */
export const useAdminCaseTimer = (caseData, durationMinutes = 0) => {
    const { start_date: startDate, start_time: startTime, eta } = caseData;
    
    const [isExceeded, setIsExceeded] = useState(false);
    const [isNearExceeded, setIsNearExceeded] = useState(false);
    const [isScheduled, setIsScheduled] = useState(false);

    // 1. Calculate static time details
    const timeDetails = useMemo(() => {
        let start = null;

        if (startTime && typeof startTime === 'string' && startTime.includes('T')) {
            start = new Date(startTime);
        } else if (startDate && startTime) {
            start = new Date(`${startDate}T${startTime}`);
        } else if (caseData.timestamp) {
            start = new Date(caseData.timestamp);
        }

        if (!start || isNaN(start.getTime())) return null;

        const effectiveDuration = Number(eta) || Number(durationMinutes) || 0;
        const totalDurationMs = effectiveDuration * 60000;
        const end = new Date(start.getTime() + totalDurationMs);

        return { start, end, totalDurationMs };
    }, [startDate, startTime, eta, durationMinutes, caseData.timestamp]);

    // 2. Slow ticketing just for thresholds
    useEffect(() => {
        if (!timeDetails) return;

        const checkThresholds = () => {
            const now = new Date();
            const timeUntilStart = timeDetails.start - now;

            if (timeUntilStart > 0) {
                if (!isScheduled) setIsScheduled(true);
                if (isExceeded) setIsExceeded(false);
                if (isNearExceeded) setIsNearExceeded(false);
                return;
            }

            if (isScheduled) setIsScheduled(false);

            const remaining = timeDetails.end - now;
            const elapsed = now - timeDetails.start;
            
            let prog = 0;
            if (timeDetails.totalDurationMs > 0) {
                prog = (elapsed / timeDetails.totalDurationMs) * 100;
            }
            const boundedProgress = Math.min(100, Math.max(0, prog));

            const isWaitingEta = !eta || eta.toString().trim() === '';
            
            // Check overdue
            const currentlyOverdue = remaining <= 0 || isWaitingEta;
            if (isExceeded !== currentlyOverdue) {
                setIsExceeded(currentlyOverdue);
            }

            // Check near exceeded
            const currentlyNear = !currentlyOverdue && boundedProgress >= 75 && !isWaitingEta;
            if (isNearExceeded !== currentlyNear) {
                setIsNearExceeded(currentlyNear);
            }
        };

        checkThresholds(); // Run immediately
        const interval = setInterval(checkThresholds, 1000);
        return () => clearInterval(interval);
    }, [timeDetails, eta, isExceeded, isNearExceeded, isScheduled]);

    const isWaitingEta = !eta || eta.toString().trim() === '';

    return {
        startTime: timeDetails?.start || null,
        endTime: timeDetails?.end || null,
        isExceeded,
        isScheduled,
        isNearExceeded,
        isWaitingEta,
        timeDetails
    };
};
