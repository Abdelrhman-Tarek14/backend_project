import React from 'react';
import styles from './CaseGroup.module.css';
import { CaseCard } from './CaseCard';
import type { CaseData } from './CaseCard';
import { FiUser } from 'react-icons/fi';
import { formatAgentName } from '../../../utils/formatters';

interface AgentGroupProps {
    agentName: string;
    cases: CaseData[];
    isQueueGroup?: boolean;
    tick?: number;
}

export const AgentGroup: React.FC<AgentGroupProps> = ({ agentName, cases, isQueueGroup, tick = 0 }) => {
    const caseCount = cases.length;
    const displayName = formatAgentName(agentName);

    return (
        <div className={`${styles.caseGroup} ${styles.queueGroup}`}>
            <div className={styles.groupHeader}>
                <div className={styles.groupInfo}>
                    <span className={styles.groupCaseNumber}>
                        {isQueueGroup ? `🗂️ Queue: ${displayName}` : `👤 ${displayName}`}
                    </span>
                    <div className={styles.groupBadge}>
                        <FiUser size={14} />
                        <span>{caseCount} {caseCount === 1 ? 'Case' : 'Cases'}</span>
                    </div>
                </div>
                <div className={styles.groupLine}></div>
            </div>
            <div className={styles.groupGrid}>
                {cases.map((c) => (
                    <CaseCard
                        key={c.assignmentId || `${c.case_number}-${c.ownerEmail}`}
                        data={c}
                        isOpen={true}
                        tick={tick}
                    />
                ))}
            </div>
        </div>
    );
};
