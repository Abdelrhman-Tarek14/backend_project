import React from 'react';
import styles from './CaseGroup.module.css';
import { CaseCard } from './CaseCard';
import type { CaseData } from './CaseCard'; 
import { BiGroup } from 'react-icons/bi';

interface CaseGroupProps {
    caseNumber: string | number;
    cases: CaseData[]; 
}

export const CaseGroup: React.FC<CaseGroupProps> = ({ caseNumber, cases }) => {
    const agentCount = cases.length;

    return (
        <div className={styles.caseGroup}>
            <div className={styles.groupHeader}>
                <div className={styles.groupInfo}>
                    <span className={styles.groupCaseNumber}>Case #{caseNumber}</span>
                    <div className={styles.groupBadge}>
                        <BiGroup size={14} />
                        <span>{agentCount} {agentCount === 1 ? 'Agent' : 'Agents'}</span>
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
                    />
                ))}
            </div>
        </div>
    );
};