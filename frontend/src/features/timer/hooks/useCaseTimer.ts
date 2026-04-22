import { useState, useEffect, useMemo, useRef } from 'react';

export interface TimerCaseData {
    case_number?: string | number;
    start_date?: string;
    start_time?: string;
    eta?: number | string | null;
    assignmentId?: string | number;
    timestamp?: string;
    [key: string]: any;
}

export interface UseCaseTimerReturn {
    timeLeft: number | null;
    status: 'On Track' | 'Scheduled' | 'Overdue';
    progress: number;
    startTime: Date | null;
    endTime: Date | null;
    formatTime: (ms: number | null) => string;
    isExceeded: boolean;
    isScheduled: boolean;
    isWaitingEta: boolean;
}

/**
 * Custom hook to manage case timer logic.
 * Shared between ActiveCase (Timer Page) and CaseCard (Admin Page).
 * * @param {TimerCaseData} caseData - Object containing case details
 * @param {number} durationMinutes - Backup duration if ETA is missing
 * @returns {UseCaseTimerReturn} 
 */
export const useCaseTimer = (caseData: TimerCaseData, durationMinutes: number = 0): UseCaseTimerReturn => {

    const { start_date: startDate, start_time: startTime, eta } = caseData;
    
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [status, setStatus] = useState<'On Track' | 'Scheduled' | 'Overdue'>('On Track');
    const [progress, setProgress] = useState<number>(0);

    const alertState = useRef({ nearExceeded: false, exceeded: false });

    useEffect(() => {
        alertState.current = { nearExceeded: false, exceeded: false };
    }, [caseData.case_number, eta]);

    const timeDetails = useMemo(() => {
        let start: Date | null = null;

        if (startTime && typeof startTime === 'string' && startTime.includes('T')) {
            start = new Date(startTime);
        } else if (startDate && startTime) {
            start = new Date(`${startDate}T${startTime}`);
        }

        if (!start || isNaN(start.getTime())) return null;

        // Floor to the minute to match UI display (HH:mm) and user expectations
        start.setSeconds(0, 0);

        const effectiveDuration = Number(eta) || Number(durationMinutes) || 0;
        const totalDurationMs = effectiveDuration * 60000;
        const end = new Date(start.getTime() + totalDurationMs);

        return { start, end, totalDurationMs };
    }, [startDate, startTime, eta, durationMinutes]);

    useEffect(() => {
        if (!timeDetails) return;

        const tick = () => {
            const now = new Date();
            const timeUntilStart = timeDetails.start.getTime() - now.getTime();

            if (timeUntilStart > 0) {
                setTimeLeft(timeDetails.totalDurationMs);
                setStatus('Scheduled');
                setProgress(0);
                return;
            }

            const elapsed = now.getTime() - timeDetails.start.getTime();
            const remaining = timeDetails.end.getTime() - now.getTime();

            if (remaining > 0) {
                setTimeLeft(remaining);
                setStatus('On Track');
            } else {
                setTimeLeft(Math.abs(remaining));
                setStatus('Overdue');
            }

            let prog = 0;
            if (timeDetails.totalDurationMs > 0) {
                prog = (elapsed / timeDetails.totalDurationMs) * 100;
            }
            const boundedProgress = Math.min(100, Math.max(0, prog));
            setProgress(boundedProgress);

            const isWaitingEta = !eta || eta.toString().trim() === '';
            if (!isWaitingEta) {
                if (boundedProgress >= 75 && boundedProgress < 100 && !alertState.current.nearExceeded) {
                    alertState.current.nearExceeded = true;
                }

                if (boundedProgress >= 100 && !alertState.current.exceeded) {
                    alertState.current.exceeded = true;
                }
            }
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [timeDetails, eta]);
    const formatTime = (ms: number | null): string => {
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

    const isWaitingEta = !eta || eta.toString().trim() === '';

    return {
        timeLeft,
        status,
        progress,
        startTime: timeDetails?.start || null,
        endTime: timeDetails?.end || null,
        formatTime,
        isExceeded: status === 'Overdue' || isWaitingEta,
        isScheduled: status === 'Scheduled',
        isWaitingEta
    };
};