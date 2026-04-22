import React from 'react';
import type { FC } from 'react';
import { BiCheckCircle, BiUser } from 'react-icons/bi';
import { MdQueue } from "react-icons/md";
import Swal from "sweetalert2";
import { timerService } from '../../../features/timer/services/timerService';
import { useAdminCaseTimer } from './hooks/useAdminCaseTimer';
import styles from './CaseCard.module.css';
import { StatusBadge } from './StatusBadge';
import { TimerDisplay } from './TimerDisplay';
import { UnifiedCaseEditor } from './Editors';
import { formatAgentName } from '../../../utils/formatters';
import { useUserRole } from '../../../hooks/useUserRole';
import { ROLES } from '../../../constants/roles';
import type { UserRole } from '../../../constants/roles';

export interface CaseData {
    assignmentId?: string | number;
    case_number: string | number;
    case_type: string;
    assignedBy?: string | null;
    owner_name?: string | null;
    ownerEmail?: string | null;
    country?: string | null;
    eta?: number | string | null;
    timestamp_closed_iso?: string | null;
    tl_name?: string | null;
    start_time?: string | null;
    start_date?: string | null;
    timestamp?: string | null;
    [key: string]: any;
}

interface CaseCardProps {
    data: CaseData;
    isOpen: boolean;
    dragHandleProps?: Record<string, any>;
    onUpdate?: () => void;
}

interface BadgeStyle {
    bg: string;
    text: string;
    border: string;
    label: string;
}

export const CaseCard: FC<CaseCardProps> = React.memo(({ data, isOpen, dragHandleProps, onUpdate }) => {
    const { role } = useUserRole() as { role: UserRole | null };

    const {
        startTime, endTime, isExceeded, isScheduled, isWaitingEta, isNearExceeded, timeDetails
    } = useAdminCaseTimer(data, 0);

    const isManagement = role ? ([ROLES.SUPER_USER, ROLES.ADMIN, ROLES.CMD] as UserRole[]).includes(role) : false;

    const caseType = data.case_type;

    const getBadgeStyle = (assignedBy?: string | null): BadgeStyle | undefined => {
        if (!assignedBy) return undefined;

        const source = assignedBy.toLowerCase();
        if (source === 'synced') return { bg: '#00BCD422', text: '#00BCD4', border: '#00BCD444', label: '⚡ Synced' };

        let label = assignedBy;
        if (assignedBy.includes('@')) {
            const namePart = assignedBy.split('@')[0];
            const segments = namePart.split('.');
            if (segments.length >= 2) {
                const s1 = segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
                const s2 = segments[1].charAt(0).toUpperCase() + segments[1].slice(1);
                label = `${s1} ${s2}`;
            } else {
                label = namePart;
            }
        }

        return {
            bg: '#4CAF5022',
            text: '#4CAF50',
            border: '#4CAF5044',
            label
        };
    };

    const badge = getBadgeStyle(data.assignedBy);

    const handleCompleteCase = async () => {
        const result = await Swal.fire({
            title: "Close Assignment?",
            text: "Are you sure you want to close this assignment?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#4CAF50",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Yes, Close it",
            background: "#1a1a1a",
            color: "#e2e2e5"
        });

        if (result.isConfirmed) {
            try {

                if (data.assignmentId) {
                    await timerService.updateAssignment(data.assignmentId, {
                        status: 'CLOSED',
                        closedAt: new Date().toISOString()
                    });

                    Swal.fire({
                        title: "Closed!",
                        icon: "success",
                        timer: 1000,
                        showConfirmButton: false,
                        background: "#1a1a1a",
                        color: "#e2e2e5"
                    });
                }
                if (onUpdate) onUpdate();
            } catch (err) {
                console.error("Failed to close case", err);
                Swal.fire("Error", "Failed to close assignment", "error");
            }
        }
    };

    const ownerNameLower = (data.owner_name || '').toLowerCase();
    const ownerEmailLower = (data.ownerEmail || '').toLowerCase();
    const isOwnerQueue = ownerNameLower.includes('queue') || ownerEmailLower.includes('queue');
    const isBacklog = !!isOwnerQueue;
    const effectiveIsWaitingEta = isWaitingEta && !isOwnerQueue;

    const formattedStartTime = startTime && !isNaN(startTime.getTime())
        ? `${startTime.getDate().toString().padStart(2, '0')}/${(startTime.getMonth() + 1).toString().padStart(2, '0')} - ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
        : '--:--';

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div className={styles.caseNumber}>{data.case_number}</div>
                </div>
                {dragHandleProps && <div className={styles.cardGrap} {...dragHandleProps}></div>}
                <StatusBadge
                    isExceeded={isExceeded}
                    isScheduled={isScheduled}
                    isOpen={isOpen}
                    isWaitingEta={effectiveIsWaitingEta}
                    isNearExceeded={isNearExceeded}
                    isBacklog={isBacklog}
                />
            </div>

            <div className={styles.cardDetails}>
                <div className={styles.detailRow}>
                    <span>Type:</span>
                    <strong style={{
                        fontSize: caseType.length > 30 ? '0.55rem' : '0.65rem',
                        lineHeight: '1.2'
                    }}>
                        {caseType}
                    </strong>
                </div>

                <div className={styles.detailRow}>
                    <span>Country:</span>
                    <strong style={{
                        fontSize: '0.75rem',
                        color: data.country?.toLowerCase() === 'oman' ? '#FF9800' : 'inherit'
                    }}>
                        {data.country || "Not Found"}
                    </strong>
                </div>

                {isOpen ? (
                    <>
                        <div className={styles.detailRow}>
                            <span>Started:</span>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {badge && (
                                    <span className={styles.caseBadgeDynamic} style={{
                                        fontSize: badge.label.length > 18 ? '0.50rem' : '0.55rem',
                                        backgroundColor: badge.bg,
                                        color: badge.text,
                                        border: `1px solid ${badge.border}`
                                    }}>
                                        {badge.label}
                                    </span>
                                )}
                            </div>
                            <span style={{ color: '#666', fontSize: '0.60rem' }}>{formattedStartTime}</span>
                        </div>

                        <div className={styles.detailRow}>
                            <span>ETA:</span>
                            <span style={{ color: '#666' }}>
                                {data.eta ? `${data.eta} min` : "Form Not Submitted"}
                            </span>
                        </div>

                        <div className={styles.detailRow}>
                            <span>Exp. Finish:</span>
                            <span>{endTime ? endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                        </div>

                        <div className={styles.timerRow}>
                            <div style={{ flex: 1 }}>
                                <TimerDisplay
                                    timeDetails={timeDetails}
                                    isScheduled={isScheduled}
                                    isExceeded={isExceeded}
                                    isWaitingEta={isWaitingEta}
                                    isNearExceeded={isNearExceeded}
                                    isBacklog={isBacklog}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {isManagement && (
                                    <button
                                        className={styles.completeBtn}
                                        onClick={handleCompleteCase}
                                        title="Complete Case"
                                    >
                                        <BiCheckCircle />
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.detailRow}>
                            <span>ETA:</span>
                            <span>{data.eta} min</span>
                        </div>
                        <div className={styles.detailRow}>
                            <span>Closed:</span>
                            <span>{data.timestamp_closed_iso ? new Date(data.timestamp_closed_iso).toLocaleDateString() : 'N/A'}</span>
                        </div>
                    </>
                )}
            </div>

            <div className={styles.agent}>
                <div className={styles.agentHeader} style={{
                    visibility: isOwnerQueue ? 'hidden' : 'visible'
                }}>
                    <span className={styles.tlBadge}>TL: {data.tl_name || 'N/A'}</span>
                    {isManagement && <UnifiedCaseEditor data={data} onUpdate={onUpdate} />}
                </div>
                <div className={styles.agentMain}>
                    {isOwnerQueue ? <MdQueue size={14} color="#FF5722" /> : <BiUser size={14} />}
                    <span style={{
                        fontSize: formatAgentName(data.ownerEmail || '').length > 26 ? '0.70rem' : 'inherit',
                        color: isOwnerQueue ? '#FF5722' : 'inherit',
                        fontWeight: 'bold'
                    }}>
                        {formatAgentName(data.ownerEmail || undefined)}
                    </span>
                </div>
            </div>
        </div>
    );
});

CaseCard.displayName = 'CaseCard';