import React from 'react';
import { BiWifiOff } from 'react-icons/bi';
import { SiSalesforce } from 'react-icons/si';
import styles from '../OpenCases.module.css';

interface OpenCasesStatsProps {
    filterTab: string;
    onTabChange: (tab: string) => void;
    counts: {
        all: number;
        exceeded: number;
        nearExceeded: number;
        waitingEta: number;
        sharedCases: number;
        overloadedAgents: number;
    };
    isSalesforceConnected: boolean;
}

export const OpenCasesStats: React.FC<OpenCasesStatsProps> = ({
    filterTab,
    onTabChange,
    counts,
    isSalesforceConnected
}) => {
    return (
        <div className={styles.filterTabs}>
            <button className={`${styles.tabBtn} ${filterTab === 'all' ? styles.active : ''}`} onClick={() => onTabChange('all')}>
                All <span className={styles.tabCount}>{counts.all}</span>
            </button>
            <button className={`${styles.tabBtn} ${styles.exceededTab} ${filterTab === 'exceeded' ? styles.active : ''}`} onClick={() => onTabChange('exceeded')}>
                Exceeded <span className={`${styles.tabCount} ${counts.exceeded > 0 ? styles.pulse : ''}`}>{counts.exceeded}</span>
            </button>
            <button className={`${styles.tabBtn} ${styles.nearExceededTab} ${filterTab === 'near-exceeded' ? styles.active : ''}`} onClick={() => onTabChange('near-exceeded')}>
                Near Exceeded <span className={`${styles.tabCount} ${counts.nearExceeded > 0 ? styles.pulse : ''}`}>{counts.nearExceeded}</span>
            </button>
            <button className={`${styles.tabBtn} ${filterTab === 'waiting-eta' ? styles.active : ''}`} onClick={() => onTabChange('waiting-eta')}>
                Waiting for Form <span className={`${styles.tabCount} ${counts.waitingEta > 0 ? styles.pulse : ''}`}>{counts.waitingEta}</span>
            </button>
            <button className={`${styles.tabBtn} ${filterTab === 'shared-cases' ? styles.active : ''}`} onClick={() => onTabChange('shared-cases')}>
                Shared Cases <span className={`${styles.tabCount} ${counts.sharedCases > 0 ? styles.pulse : ''}`}>{counts.sharedCases}</span>
            </button>
            <button className={`${styles.tabBtn} ${filterTab === 'overloaded-agents' ? styles.active : ''}`} onClick={() => onTabChange('overloaded-agents')}>
                Queue <span className={`${styles.tabCount} ${counts.overloadedAgents > 0 ? styles.pulse : ''}`}>{counts.overloadedAgents}</span>
            </button>

            <div className={`${styles.connectionStatus} ${isSalesforceConnected ? styles.statusConnected : styles.statusDisconnected}`}>
                {!isSalesforceConnected && <BiWifiOff size={14} />}
                <SiSalesforce size={20} />
                <span>{isSalesforceConnected ? 'Salesforce Connected' : 'Salesforce Offline'}</span>
            </div>
        </div>
    );
};
