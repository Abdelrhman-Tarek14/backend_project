import { useState, useEffect, useMemo, useRef } from 'react';
import { timerService } from '../services/timerService';

/**
 * Custom hook to manage case timer logic.
 * Shared between ActiveCase (Timer Page) and CaseCard (Admin Page).
 * 
 * @param {string} timestamp - ISO string or specific format from backend
 * @param {string|number} eta - ETA in minutes
 * @param {string|number} durationMinutes - Backup duration if ETA is missing
 * @returns {Object} { timeLeft, status, progress, startTime, endTime, formatTime, isExceeding }
 */
export const useCaseTimer = (caseData, durationMinutes = 0) => {

    const { start_date: startDate, start_time: startTime, eta, assignmentId, hasAlerted } = caseData;
    const [timeLeft, setTimeLeft] = useState(null);
    const [status, setStatus] = useState('On Track');
    const [progress, setProgress] = useState(0);

    // Track if alerts have been shown locally to prevent spam
    const alertState = useRef({ nearExceeded: false, exceeded: false });
    
    // Reset alert state if the case changes (e.g. ETA updated)
    useEffect(() => {
        alertState.current = { nearExceeded: false, exceeded: false };
    }, [caseData.case_number, eta]);

    // 1. Calculate Start and End Times
    const timeDetails = useMemo(() => {
        let start = null;

        if (startTime && typeof startTime === 'string' && startTime.includes('T')) {
            // ISO format from backend
            start = new Date(startTime);
        } else if (startDate && startTime) {
            // Legacy separate format
            start = new Date(`${startDate}T${startTime}`);
        } else if (caseData.timestamp) {
             // Fallback to general timestamp
             start = new Date(caseData.timestamp);
        }

        if (!start || isNaN(start.getTime())) return null;

        const effectiveDuration = Number(eta) || Number(durationMinutes) || 0;
        const totalDurationMs = effectiveDuration * 60000;
        const end = new Date(start.getTime() + totalDurationMs);

        return { start, end, totalDurationMs };
    }, [startDate, startTime, eta, durationMinutes, caseData.timestamp]);

    // 2. Tick Logic
    useEffect(() => {
        if (!timeDetails) return;

        const tick = () => {
            const now = new Date();
            const timeUntilStart = timeDetails.start - now;

            // Case 1: Scheduled (Future)
            if (timeUntilStart > 0) {
                setTimeLeft(timeDetails.totalDurationMs);
                setStatus('Scheduled');
                setProgress(0);
                return;
            }

            const elapsed = now - timeDetails.start;
            const remaining = timeDetails.end - now;

            // Case 2: Active or Overdue
            if (remaining > 0) {
                setTimeLeft(remaining);
                setStatus('On Track');
            } else {
                setTimeLeft(Math.abs(remaining)); // Count up
                setStatus('Overdue');
            }

            // Calculate Progress
            let prog = 0;
            if (timeDetails.totalDurationMs > 0) {
                prog = (elapsed / timeDetails.totalDurationMs) * 100;
            }
            const boundedProgress = Math.min(100, Math.max(0, prog));
            setProgress(boundedProgress);

            // Time-Based Notifications (Disabled per user request)
            const isWaitingEta = !eta || eta.toString().trim() === '';
            if (!isWaitingEta) {
                // Near Exceeded ( >= 75% and < 100%)
                if (boundedProgress >= 75 && boundedProgress < 100 && !alertState.current.nearExceeded) {
                    // toast(`Case ${caseData.case_number} is Near Exceeded!`, {
                    //     icon: '⚠️',
                    //     id: `near-${caseData.case_number}`,
                    //     style: { background: '#FFA000', color: '#fff' }
                    // });
                    alertState.current.nearExceeded = true;
                }

                // Exceeded ( >= 100% )
                if (boundedProgress >= 100 && !alertState.current.exceeded) {
                    // toast.error(`Case ${caseData.case_number} has Exceeded ETA!`, {
                    //     id: `exceed-${caseData.case_number}`
                    // });
                    alertState.current.exceeded = true;
                }
            }
        };

        tick(); // Initial run
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [timeDetails]);

    // Helper: Format Time (HH:MM:SS)
    const formatTime = (ms) => {
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

    const isWaitingEta = !eta || eta.toString().trim() === '';

    return {
        timeLeft,
        status,
        progress,
        startTime: timeDetails?.start || null,
        endTime: timeDetails?.end || null,
        formatTime,
        isOverdue: status === 'Overdue' || isWaitingEta, // Treat waiting for ETA as a priority state
        isScheduled: status === 'Scheduled',
        isWaitingEta
    };
};
