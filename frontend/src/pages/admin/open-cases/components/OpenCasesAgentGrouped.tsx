import React from 'react';
import { AgentGroup } from '../AgentGroup';
import styles from '../OpenCases.module.css';

interface OpenCasesAgentGroupedProps {
    groupedAgentCases: [string, any[], boolean?][];
    tick?: number;
}

export const OpenCasesAgentGrouped: React.FC<OpenCasesAgentGroupedProps> = ({ groupedAgentCases, tick = 0 }) => {
    return (
        <div className={styles.groupedSection}>
            {groupedAgentCases.map(([agentName, cases, isQueueGroup]) => (
                <AgentGroup
                    key={agentName}
                    agentName={agentName}
                    cases={cases}
                    isQueueGroup={isQueueGroup}
                    tick={tick}
                />
            ))}
            {groupedAgentCases.length === 0 && (
                <div className={styles.emptyState}>No overloaded agents or queue cases found.</div>
            )}
        </div>
    );
};
