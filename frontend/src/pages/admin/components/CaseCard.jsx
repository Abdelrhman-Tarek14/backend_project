import { BiCheckCircle, BiUser, BiLockAlt, BiLayer } from 'react-icons/bi';
import { MdQueue } from "react-icons/md";
import Swal from "sweetalert2";
import { timerService } from '../../../features/timer/services/timerService';
import { useCaseTimer } from '../../../features/timer/hooks/useCaseTimer';
import styles from './CaseCard.module.css';
import { StatusBadge } from './StatusBadge';
import { TimerDisplay } from './TimerDisplay';
import {
    StartTimeEditor,
    EtaEditor,
    CaseInfoEditor
} from './Editors';
import { formatAgentName } from '../../../utils/formatters';
import { useAuth } from '../../../features/auth/hooks/useAuth';
import { useUserRole } from '../../../hooks/useUserRole';
import { PERMISSIONS } from '../../../constants/permissions';

export const CaseCard = ({ data, isOpen, dragHandleProps, controls, isCMD }) => {
    const { user } = useAuth();
    const { hasPermission } = useUserRole();
    const {
        timeLeft, startTime, endTime, formatTime, isOverdue, isScheduled, isWaitingEta, progress
    } = useCaseTimer(data, data.duration_minutes);

    const activeCaseId = data.assignmentId || data.case_number;
    const caseType = data.case_type || data.status || '';

    const canDelete = hasPermission(PERMISSIONS.DELETE_CASE);
    const canComplete = hasPermission(PERMISSIONS.DELETE_CASE);
    const canEditTime = hasPermission(PERMISSIONS.EDIT_CASE);
    const canEditEta = hasPermission(PERMISSIONS.EDIT_CASE);

    // Badge styling helper
    const getBadgeStyle = (role) => {
        if (role === 'synced') return { bg: '#00BCD422', text: '#00BCD4', border: '#00BCD444', label: '⚡ Synced' };
        if (role === 'cmd') return { bg: '#FF572222', text: '#FF5722', border: '#FF572244', label: 'CMD' };
        if (role === 'admin') return { bg: '#4CAF5022', text: '#4CAF50', border: '#4CAF5044', label: 'Admin' };
        if (role === 'agent') return { bg: '#2196F322', text: '#2196F3', border: '#2196F344', label: 'Agent' };
        return { bg: '#9E9E9E22', text: '#9E9E9E', border: '#9E9E9E44', label: 'Not Edited' };
    };

    const badge = getBadgeStyle(data.edited_by);

    const handleCompleteCase = async () => {
        const result = await Swal.fire({
            title: "Complete Case?",
            text: "Are you sure you want to mark this case as completed?",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#4CAF50",
            cancelButtonColor: "#6c757d",
            confirmButtonText: "Yes, complete it!",
            background: "#1a1a1a",
            color: "#e2e2e5"
        });

        if (result.isConfirmed) {
            try {
                await timerService.completeCase(data);
            } catch (err) {
                console.error("Failed to process case", err);
                Swal.fire("Error", "Failed to complete case", "error");
            }
        }
    };

    const isNearExceeded = !isOverdue && progress >= 75 && !isWaitingEta;
    const isOwnerQueue = data.owner_name?.toLowerCase().includes('queue');
    const isBacklog = isOwnerQueue;
    const effectiveIsWaitingEta = isWaitingEta && !isOwnerQueue;

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <div className={styles.caseNumber}>{data.case_number}</div>
                <div className={styles.cardGrap} {...dragHandleProps}></div>
                <StatusBadge
                    isOverdue={isOverdue}
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

                {/* {data.account_name && (
                    <div className={styles.detailRow}>
                        <span>Account:</span>
                        <strong style={{ fontSize: '0.75rem' }}>{data.account_name}</strong>
                    </div>
                )} */}

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
                                fontSize: '0.65rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: badge.bg,
                                color: badge.text,
                                border: `1px solid ${badge.border}`,
                                // marginLeft: 'auto',
                                // marginRight: 'auto',
                                whiteSpace: 'nowrap'
                            }}>
                                {badge.label}
                            </span>

                            {canEditTime ? (
                                <StartTimeEditor
                                    caseId={activeCaseId}
                                    currentTimestamp={data.timestamp}
                                    startTime={startTime}
                                    editorRole={isCMD ? 'cmd' : 'admin'}
                                />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#666', fontSize: '0.85rem' }}>
                                    <span>{startTime ? `${startTime.getDate().toString().padStart(2, '0')}/${(startTime.getMonth() + 1).toString().padStart(2, '0')} - ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}` : '--:--'}</span>
                                    <BiLockAlt title="Editing Locked" size={14} />
                                </div>
                            )}
                        </div>

                        <div className={styles.detailRow}>
                            <span>ETA:</span>
                            {canEditEta ? (
                                <EtaEditor
                                    caseId={activeCaseId}
                                    currentEta={data.eta || 0}
                                />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#666' }}>
                                    <span>{data.eta} min</span>
                                    <BiLockAlt title="Editing Locked" size={14} />
                                </div>
                            )}
                        </div>

                        <div className={styles.detailRow}>
                            <span>Exp. Finish:</span>
                            <span>{endTime ? endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                        </div>

                        {/* Running Timer & Action */}
                        <div className={styles.timerRow}>
                            <TimerDisplay
                                timeStr={formatTime(timeLeft)}
                                isOverdue={isOverdue}
                                isWaitingEta={isWaitingEta}
                                isNearExceeded={isNearExceeded}
                            />

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>

                                {canDelete && (
                                    <button
                                        className={styles.completeBtn}
                                        onClick={handleCompleteCase}
                                        title="Delete Case"
                                        style={{
                                            opacity: 1,
                                            cursor: 'pointer'
                                        }}
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
                    {canEditTime && (
                        <CaseInfoEditor
                            caseId={activeCaseId}
                            currentType={caseType}
                        />
                    )}
                </div>
                <div className={styles.agentMain}>
                    {data.owner_name?.toLowerCase().includes('queue') ? (
                        <MdQueue size={14} color="#FF5722" />
                    ) : (
                        <BiUser size={14} />
                    )}
                    <span style={{
                        fontSize: formatAgentName(data.owner_name).length > 26 ? '0.70rem' : 'inherit',
                        color: data.owner_name?.toLowerCase().includes('queue') ? '#FF5722' : 'inherit',
                        fontWeight: 'bold',
                        lineHeight: '1.2'
                    }}>
                        {formatAgentName(data.owner_name)}
                    </span>
                </div>
            </div>
        </div>
    );
};