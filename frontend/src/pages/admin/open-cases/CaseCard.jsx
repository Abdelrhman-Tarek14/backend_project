import React from 'react';
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
import { PERMISSIONS } from '../../../constants/permissions';

export const CaseCard = React.memo(({ data, isOpen, dragHandleProps }) => {
    const { hasPermission } = useUserRole();
    const {
        startTime, endTime, isExceeded, isScheduled, isWaitingEta, isNearExceeded, timeDetails
    } = useAdminCaseTimer(data, data.duration_minutes);

    const caseType = data.formType || data.case_type || '';
    const canEdit = hasPermission(PERMISSIONS.EDIT_CASE);

    // Badge styling helper
    const getBadgeStyle = (assignedBy) => {
        if (!assignedBy) return { bg: '#9E9E9E22', text: '#9E9E9E', border: '#9E9E9E44', label: 'Not Edited' };

        const source = assignedBy.toLowerCase();
        if (source === 'synced') return { bg: '#00BCD422', text: '#00BCD4', border: '#00BCD444', label: '⚡ Synced' };

        // If it's a manual assignment (email or role)
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
            text: "Are you sure you want to close this assignment and mark it as completed?",
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
                await timerService.updateAssignment(data.assignmentId, {
                    status: 'CLOSED',
                    closedAt: new Date().toISOString()
                });

                Swal.fire({
                    title: "Closed!",
                    text: "Assignment has been closed successfully.",
                    icon: "success",
                    timer: 1000,
                    showConfirmButton: false,
                    background: "#1a1a1a",
                    color: "#e2e2e5"
                });
            } catch (err) {
                console.error("Failed to close case", err);
                Swal.fire("Error", "Failed to close assignment", "error");
            }
        }
    };

    const isOwnerQueue = data.owner_name?.toLowerCase().includes('queue');
    const isBacklog = isOwnerQueue;
    const effectiveIsWaitingEta = isWaitingEta && !isOwnerQueue;

    const formattedStartTime = startTime && !isNaN(startTime.getTime())
        ? `${startTime.getDate().toString().padStart(2, '0')}/${(startTime.getMonth() + 1).toString().padStart(2, '0')} - ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
        : '--:--';

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className={styles.caseNumber}>{data.case_number}</div>
                </div>
                <div className={styles.cardGrap} {...dragHandleProps}></div>
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
                        fontSize: caseType.length > 30 ? '0.55rem' : '0.75rem',
                        lineHeight: '1.2'
                    }}>
                        {caseType}
                    </strong>
                </div>

                {data.country && (
                    <div className={styles.detailRow}>
                        <span>Country:</span>
                        <strong style={{
                            fontSize: '0.65rem',
                            color: data.country.toLowerCase() === 'oman' ? '#FF9800' : 'inherit'
                        }}>
                            {data.country}
                        </strong>
                    </div>
                )}
                {isOpen ? (
                    <>
                        <div className={styles.detailRow}>
                            <span>Started:</span>
                            <span style={{
                                fontSize: badge.label.length > 18 ? '0.45rem' : '0.65rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: badge.bg,
                                color: badge.text,
                                border: `1px solid ${badge.border}`,
                                whiteSpace: 'nowrap'
                            }}>
                                {badge.label}
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#666', fontSize: '0.85rem' }}>
                                <span>{formattedStartTime}</span>
                            </div>
                        </div>

                        <div className={styles.detailRow}>
                            <span>ETA:</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#666' }}>
                                <span>{data.eta || 0} min</span>
                            </div>
                        </div>

                        <div className={styles.detailRow}>
                            <span>Exp. Finish:</span>
                            <span>{endTime ? endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                        </div>

                        {/* Running Timer & Action */}
                        <div className={styles.timerRow}>
                            <TimerDisplay
                                timeDetails={timeDetails}
                                isScheduled={isScheduled}
                                isExceeded={isExceeded}
                                isWaitingEta={isWaitingEta}
                                isNearExceeded={isNearExceeded}
                            />

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    className={styles.completeBtn}
                                    onClick={handleCompleteCase}
                                    title="Complete Case"
                                    style={{ opacity: 1, cursor: 'pointer' }}
                                >
                                    <BiCheckCircle />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className={styles.detailRow}>
                            <span>Duration:</span>
                            <span>{data.duration_minutes} min</span>
                        </div>
                        <div className={styles.detailRow}>
                            <span>Closed:</span>
                            <span>{new Date(data.timestamp_closed_iso).toLocaleDateString()}</span>
                        </div>
                    </>
                )}
            </div>
            <div className={styles.agent}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    visibility: data.owner_name?.toLowerCase().includes('queue') ? 'hidden' : 'visible'
                }}>
                    <span className={styles.tlBadge}>TL: {data.tl_name || 'N/A'}</span>
                    {canEdit && <UnifiedCaseEditor data={data} />}
                </div>
                <div className={styles.agentMain}>
                    {data.owner_name?.toLowerCase().includes('queue') ? (
                        <MdQueue size={14} color="#FF5722" />
                    ) : (
                        <BiUser size={14} />
                    )}
                    <span style={{
                        fontSize: formatAgentName(data.ownerEmail).length > 26 ? '0.70rem' : 'inherit',
                        color: data.owner_name?.toLowerCase().includes('queue') ? '#FF5722' : 'inherit',
                        fontWeight: 'bold',
                        lineHeight: '1.2'
                    }}>
                        {formatAgentName(data.ownerEmail)}
                    </span>
                </div>
            </div>
        </div>
    );
});