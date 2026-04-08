import { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/hooks/useAuth';
import { useUserRole } from '../hooks/useUserRole';
import apiClient from '../services/apiClient';
import Swal from 'sweetalert2';
import {
    BiUser, BiPalette, BiCheck, BiTimeFive, BiHash,
    BiLoaderAlt, BiBell, BiShieldQuarter, BiCloudUpload, BiRocket
} from 'react-icons/bi';

import styles from './ProfilePage.module.css';

const ProfilePage = () => {
    const { user } = useAuth();
    const {
        displayName: backendName,
        colorTheme: backendTheme,
        loading: roleLoading,
        updateColorTheme
    } = useUserRole();

    const [displayName, setDisplayName] = useState('');
    const [theme, setTheme] = useState('orange');
    const [isSaving, setIsSaving] = useState(false);

    // Sync state with backend data once loaded
    useEffect(() => {
        if (!roleLoading && user) {
            setDisplayName(user.displayName || '');
            setTheme(backendTheme || 'orange');
        }
    }, [roleLoading, user, backendTheme]);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            // 1. Update Profile (Custom Display Name) via Backend
            await apiClient.patch('/users/me', {
                displayName: displayName || null
            });

            // 2. Update Theme (Centralized)
            if (theme !== 'baby-blue') {
                await updateColorTheme(theme);
            }

            Swal.fire({
                icon: 'success',
                title: 'Saved!',
                text: 'Profile updated successfully!',
                timer: 2000,
                showConfirmButton: false,
                background: 'var(--color-bg-white)',
                color: 'var(--color-text-main)'
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to update profile.',
                background: 'var(--color-bg-white)',
                color: 'var(--color-text-main)'
            });
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>
                    <BiUser /> My Settings
                </h1>

                <div className={styles.section} id="tour-profile-identity">
                    <h2 className={styles.sectionTitle}>My Identity</h2>
                    
                    <div className={styles.inputGroup}>
                        <label>Google Official Name</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={user?.name || ''}
                            readOnly
                            style={{ opacity: 0.7, cursor: 'not-allowed', backgroundColor: 'rgba(0,0,0,0.05)' }}
                        />
                        <small className={styles.hint}>This name comes from your Google account and cannot be changed here.</small>
                    </div>

                    <div className={styles.inputGroup} style={{ marginTop: '20px' }}>
                        <label>Custom Display Name</label>
                        <input
                            type="text"
                            className={styles.input}
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder={roleLoading ? "Loading..." : "How should we call you?"}
                            disabled={roleLoading}
                        />
                        <small className={styles.hint}>
                            If left empty, we will use your Google name: <strong>{user?.name}</strong>
                        </small>
                    </div>
                </div>

                <div className={styles.section} id="tour-profile-appearance">
                    <h2 className={styles.sectionTitle}>
                        <BiPalette style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                        Appearance & Theme
                    </h2>
                    <div className={styles.themeGrid}>
                        <div
                            className={`${styles.themeOption} ${theme === 'orange' ? styles.active : ''}`}
                            onClick={() => setTheme('orange')}
                        >
                            <div className={styles.colorPreview} style={{ background: '#FF5722' }} />
                            <span>Classic Orange</span>
                            {theme === 'orange' && <BiCheck size={20} color="#FF5722" />}
                        </div>

                        {/* Disabled Themes as per request */}
                        <div className={`${styles.themeOption} ${styles.disabled}`} title="Coming Soon">
                            <div className={styles.colorPreview} style={{ background: '#03A9F4' }} />
                            <span>Baby Blue</span>
                            <span className={styles.lockBadge}>Soon</span>
                        </div>

                        <div className={`${styles.themeOption} ${styles.disabled}`} title="Coming Soon">
                            <div className={styles.colorPreview} style={{ background: '#673AB7' }} />
                            <span>Royal Purple</span>
                            <span className={styles.lockBadge}>Soon</span>
                        </div>

                        <div className={`${styles.themeOption} ${styles.disabled}`} title="Coming Soon">
                            <div className={styles.colorPreview} style={{ background: '#4CAF50' }} />
                            <span>Forest Green</span>
                            <span className={styles.lockBadge}>Soon</span>
                        </div>

                        <div className={`${styles.themeOption} ${styles.disabled}`} title="Coming Soon">
                            <div className={styles.colorPreview} style={{ background: '#00695C' }} />
                            <span>Deep Sea</span>
                            <span className={styles.lockBadge}>Soon</span>
                        </div>
                    </div>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <BiBell style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                        Notification Settings
                    </h2>
                    <div className={styles.settingsGrid}>
                        <div className={`${styles.settingRow} ${styles.disabled}`}>
                            <div className={styles.settingInfo}>
                                <h3>Enable Sound</h3>
                                <p>Play a notification sound for alerts</p>
                            </div>
                            <div className={styles.togglePlaceholder} />
                        </div>
                        <div className={`${styles.settingRow} ${styles.disabled}`}>
                            <div className={styles.settingInfo}>
                                <h3>Sound Choice</h3>
                                <p>Select your preferred alert tone</p>
                            </div>
                            <div className={styles.selectPlaceholder}>Classic Ding</div>
                        </div>
                    </div>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>
                        <BiTimeFive style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                        Timer Performance
                    </h2>
                    <div className={styles.settingsGrid}>
                        <div className={`${styles.settingRow} ${styles.disabled}`}>
                            <div className={styles.settingInfo}>
                                <h3>Alert Threshold</h3>
                                <p>When should the timer start pulsing?</p>
                            </div>
                            <div className={styles.selectPlaceholder}>85% Capacity</div>
                        </div>
                        <div className={`${styles.settingRow} ${styles.disabled}`}>
                            <div className={styles.settingInfo}>
                                <h3>Auto-Alert</h3>
                                <p>Automatically notify when limit is reached</p>
                            </div>
                            <div className={styles.togglePlaceholder} />
                        </div>
                    </div>
                </div>

                <div className={styles.section} id="tour-profile-advanced">
                    <h2 className={styles.sectionTitle}>
                        <BiShieldQuarter style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                        Advanced & Future
                    </h2>
                    <div className={styles.settingsGrid}>
                        <div className={`${styles.settingRow} ${styles.disabled}`}>
                            <div className={styles.settingInfo}>
                                <BiCloudUpload />
                                <span>Live Performance Export (Google Sheet)</span>
                            </div>
                            <span className={styles.lockBadge}>Soon</span>
                        </div>
                        <div
                            className={`${styles.settingRow}`}
                            id="tour-profile-tour-btn"
                            onClick={() => window.dispatchEvent(new Event('start-termhub-tour'))}
                            style={{ cursor: 'pointer', borderColor: 'var(--color-primary)', background: 'rgba(var(--color-primary-rgb), 0.05)' }}
                        >
                            <div className={styles.settingInfo}>
                                <BiRocket color="var(--color-primary)" />
                                <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>Start Guided App Tour</span>
                            </div>
                            <span className={styles.lockBadge} style={{ background: 'var(--color-primary)', color: 'white' }}>Start</span>
                        </div>
                    </div>
                </div>

                <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={isSaving || roleLoading}
                >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
};

export default ProfilePage;
