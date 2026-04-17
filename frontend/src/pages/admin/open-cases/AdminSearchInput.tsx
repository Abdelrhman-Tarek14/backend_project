import React from 'react';
import { BiSearch } from 'react-icons/bi';
import styles from './AdminSearchInput.module.css';

interface AdminSearchInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
}

export const AdminSearchInput: React.FC<AdminSearchInputProps> = ({ 
    value, 
    onChange, 
    placeholder = "Search ..." 
}) => {
    return (
        <div className={styles.searchWrapper}>
            <BiSearch className={styles.searchIcon} />
            <input
                type="text"
                placeholder={placeholder}
                className={styles.searchInput}
                value={value}
                onChange={onChange}
                aria-label={placeholder}
            />
        </div>
    );
};