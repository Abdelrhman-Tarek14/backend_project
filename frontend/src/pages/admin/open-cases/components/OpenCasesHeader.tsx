import React from 'react';
import { AdminSearchInput } from '../AdminSearchInput';
import styles from '../OpenCases.module.css';

interface OpenCasesHeaderProps {
    title: string;
    description: string;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    count: number;
}

export const OpenCasesHeader: React.FC<OpenCasesHeaderProps> = ({
    title,
    description,
    searchTerm,
    onSearchChange,
    count
}) => {
    return (
        <div className={styles.headerContainer}>
            <div className={styles.titleArea}>
                <h2 className={styles.sectionTitle}>
                    {title} ({count})
                </h2>
            </div>
            <span className={styles.tabDescriptionPill}>
                💡 {description}
            </span>
            <AdminSearchInput
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search..."
            />
        </div>
    );
};
