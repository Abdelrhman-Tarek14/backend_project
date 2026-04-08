import { BiSearch } from 'react-icons/bi';

export const AdminSearchInput = ({ value, onChange, placeholder = "Search Case # or Agent..." }) => {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'white',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '0.4rem 0.8rem',
            width: '300px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            margin: '0 auto'
        }}>
            <BiSearch style={{ color: 'var(--color-text-muted)', marginRight: '0.5rem' }} />
            <input
                type="text"
                placeholder={placeholder}
                style={{
                    border: 'none',
                    outline: 'none',
                    width: '100%',
                    fontSize: '0.9rem',
                    background: 'transparent'
                }}
                value={value}
                onChange={onChange}
            />
        </div>
    );
};
