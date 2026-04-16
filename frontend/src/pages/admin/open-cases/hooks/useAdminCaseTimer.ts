import { useState, useEffect, useMemo } from 'react';
import type { CaseData } from '../CaseCard';

interface TimeDetails {
    start: Date;
    end: Date;
    totalDurationMs: number;
}

interface AdminCaseTimerResult {
    startTime: Date | null;
    endTime: Date | null;
    isExceeded: boolean;
    isScheduled: boolean;
    isNearExceeded: boolean;
    isWaitingEta: boolean;
    timeDetails: TimeDetails | null;
}

export const useAdminCaseTimer = (
    caseData: Partial<CaseData>,
    fallbackDuration: number = 0 // تغيير المسمى ليكون واضحاً أنه "احتياطي" فقط
): AdminCaseTimerResult => {

    const { start_date: startDate, start_time: startTime, eta, timestamp } = caseData;

    const [isExceeded, setIsExceeded] = useState<boolean>(false);
    const [isNearExceeded, setIsNearExceeded] = useState<boolean>(false);
    const [isScheduled, setIsScheduled] = useState<boolean>(false);

    // التحقق من وجود الـ ETA وصلاحيتها كقيمة منطقية
    const isWaitingEta = useMemo(() => {
        if (eta === undefined || eta === null) return true;
        const etaStr = eta.toString().trim();
        return etaStr === '' || Number(etaStr) <= 0;
    }, [eta]);

    // 1. حساب تفاصيل الوقت اعتماداً على الـ ETA
    const timeDetails = useMemo<TimeDetails | null>(() => {
        let start: Date | null = null;

        if (startTime && typeof startTime === 'string' && startTime.includes('T')) {
            start = new Date(startTime);
        } else if (startDate && startTime) {
            start = new Date(`${startDate}T${startTime}`);
        } else if (timestamp) {
            start = new Date(timestamp);
        }

        if (!start || isNaN(start.getTime())) return null;

        // الأولوية القصوى لـ eta، وإذا لم توجد نستخدم الـ fallback
        const effectiveDuration = !isWaitingEta ? Number(eta) : fallbackDuration;
        const totalDurationMs = effectiveDuration * 60000;
        const end = new Date(start.getTime() + totalDurationMs);

        return { start, end, totalDurationMs };
    }, [startDate, startTime, eta, isWaitingEta, fallbackDuration, timestamp]);

    // 2. مراقبة العتبات (Thresholds)
    useEffect(() => {
        if (!timeDetails) return;

        const checkThresholds = () => {
            const now = new Date().getTime();
            const startMs = timeDetails.start.getTime();
            const endMs = timeDetails.end.getTime();

            const timeUntilStart = startMs - now;

            // أ. حالة الجدولة (Scheduled)
            if (timeUntilStart > 0) {
                if (!isScheduled) setIsScheduled(true);
                if (isExceeded) setIsExceeded(false);
                if (isNearExceeded) setIsNearExceeded(false);
                return;
            }

            if (isScheduled) setIsScheduled(false);

            const remaining = endMs - now;
            const elapsed = now - startMs;

            let prog = 0;
            if (timeDetails.totalDurationMs > 0) {
                prog = (elapsed / timeDetails.totalDurationMs) * 100;
            }
            const boundedProgress = Math.min(100, Math.max(0, prog));

            // ب. حالة تجاوز الوقت (Overdue) 
            // تعتبر متجاوزة إذا انتهى الوقت أو إذا كانت تنتظر ETA (حسب منطق الـ Badge عندك)
            const currentlyOverdue = remaining <= 0 || isWaitingEta;
            if (isExceeded !== currentlyOverdue) {
                setIsExceeded(currentlyOverdue);
            }

            // ج. حالة القرب من التجاوز (Near Exceeded)
            const currentlyNear = !currentlyOverdue && boundedProgress >= 75 && !isWaitingEta;
            if (isNearExceeded !== currentlyNear) {
                setIsNearExceeded(currentlyNear);
            }
        };

        checkThresholds();
        const interval = setInterval(checkThresholds, 1000);
        return () => clearInterval(interval);
    }, [timeDetails, isWaitingEta, isExceeded, isNearExceeded, isScheduled]);

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