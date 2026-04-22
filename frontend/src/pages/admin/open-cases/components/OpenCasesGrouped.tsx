import React from 'react';
import { CaseGroup } from '../CaseGroup';
import styles from '../OpenCases.module.css';

interface OpenCasesGroupedProps {
    groupedSharedCases: [string, any[]][];
    tick?: number;
}

export const OpenCasesGrouped: React.FC<OpenCasesGroupedProps> = ({ groupedSharedCases, tick = 0 }) => {
    return (
        <div className={styles.groupedSection}>
            {groupedSharedCases.map(([caseNum, groupCases]) => (
                <CaseGroup key={caseNum} caseNumber={caseNum} cases={groupCases} tick={tick} />
            ))}
            {groupedSharedCases.length === 0 && <div className={styles.emptyState}>No shared cases found.</div>}
        </div>
    );
};
