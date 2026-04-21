import React from 'react';
import { BiWifiOff } from 'react-icons/bi';
import { SiSalesforce } from 'react-icons/si';
import styles from '../OpenCases.module.css';

interface OpenCasesStatsProps {
    filterTab: string;
    onTabChange: (tab: string) => void;
    counts: {
        all: number;
        onTime: number;
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
            <button
                className={`${styles.tabBtn} ${filterTab === 'on-time' ? styles.active : ''}`}
                onClick={() => onTabChange('on-time')}
            >
                On Time <span className={`${styles.tabCount} ${filterTab !== 'on-time' && counts.onTime > 0 ? styles.countOnTime : ''}`}>{counts.onTime}</span>
            </button>

            <button
                className={`${styles.tabBtn} ${filterTab === 'exceeded' ? styles.active : ''}`}
                onClick={() => onTabChange('exceeded')}
            >
                Exceeded <span className={`${styles.tabCount} ${filterTab !== 'exceeded' && counts.exceeded > 0 ? styles.countExceeded : ''}`}>{counts.exceeded}</span>
            </button>

            <button
                className={`${styles.tabBtn} ${filterTab === 'near-exceeded' ? styles.active : ''}`}
                onClick={() => onTabChange('near-exceeded')}
            >
                Near Exceeded <span className={`${styles.tabCount} ${filterTab !== 'near-exceeded' && counts.nearExceeded > 0 ? styles.countNear : ''}`}>{counts.nearExceeded}</span>
            </button>

            <button
                className={`${styles.tabBtn} ${filterTab === 'waiting-eta' ? styles.active : ''}`}
                onClick={() => onTabChange('waiting-eta')}
            >
                Waiting for Form <span className={`${styles.tabCount} ${filterTab !== 'waiting-eta' && counts.waitingEta > 0 ? styles.countWaiting : ''}`}>{counts.waitingEta}</span>
            </button>

            <button
                className={`${styles.tabBtn} ${filterTab === 'shared-cases' ? styles.active : ''}`}
                onClick={() => onTabChange('shared-cases')}
            >
                Shared Cases <span className={`${styles.tabCount} ${filterTab !== 'shared-cases' && counts.sharedCases > 0 ? styles.countShared : ''}`}>{counts.sharedCases}</span>
            </button>

            <button
                className={`${styles.tabBtn} ${filterTab === 'overloaded-agents' ? styles.active : ''}`}
                onClick={() => onTabChange('overloaded-agents')}
            >
                Queue <span className={`${styles.tabCount} ${filterTab !== 'overloaded-agents' && counts.overloadedAgents > 0 ? styles.countQueue : ''}`}>{counts.overloadedAgents}</span>
            </button>

            <button className={`${styles.tabBtn} ${filterTab === 'all' ? styles.active : ''}`} onClick={() => onTabChange('all')}>
                All <span className={`${styles.tabCount} ${styles.countAll}`}>{counts.all}</span>
            </button>

            <div className={`${styles.connectionStatus} ${isSalesforceConnected ? styles.statusConnected : styles.statusDisconnected}`}>
                {!isSalesforceConnected && <BiWifiOff size={14} />}
                <SiSalesforce size={20} />
                <span>{isSalesforceConnected ? 'Salesforce Connected' : 'Salesforce Offline'}</span>
            </div>
        </div>
    );
};
