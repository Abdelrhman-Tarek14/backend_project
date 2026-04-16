import React from 'react';
import { BiSearch } from 'react-icons/bi';

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
        <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '0.3rem 0.6rem',
            width: '180px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
            marginLeft: 'auto'
        }}>
            <BiSearch style={{ color: 'var(--color-text-muted)', marginRight: '0.4rem' }} />
            <input
                type="text"
                placeholder={placeholder}
                style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: '0.82rem',
                    background: 'transparent'
                }}
                value={value}
                onChange={onChange}
            />
        </div>
    );
};