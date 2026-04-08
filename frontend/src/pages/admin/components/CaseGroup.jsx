import styles from '../../AdminPage.module.css';
import { CaseCard } from './CaseCard';
import { BiGroup } from 'react-icons/bi';

export const CaseGroup = ({ caseNumber, cases, controls, isCMD }) => {
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
                        key={c.assignmentId || c.case_number + c.agent_email}
                        data={c}
                        isOpen={true}
                        controls={controls}
                        isCMD={isCMD}
                        dragHandleProps={null} // Disable drag for grouped view
                    />
                ))}
            </div>
        </div>
    );
};
