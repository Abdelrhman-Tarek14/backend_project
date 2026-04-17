import React from 'react';
import { CaseGroup } from '../CaseGroup';
import styles from '../OpenCases.module.css';

interface OpenCasesGroupedProps {
    groupedSharedCases: [string, any[]][];
}

export const OpenCasesGrouped: React.FC<OpenCasesGroupedProps> = ({ groupedSharedCases }) => {
    return (
        <div className={styles.groupedSection}>
            {groupedSharedCases.map(([caseNum, groupCases]) => (
                <CaseGroup key={caseNum} caseNumber={caseNum} cases={groupCases} />
            ))}
            {groupedSharedCases.length === 0 && <div className={styles.emptyState}>No shared cases found.</div>}
        </div>
    );
};
