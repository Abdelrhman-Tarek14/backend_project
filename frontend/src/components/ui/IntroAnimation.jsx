
import { useEffect, useState } from 'react';
import styles from './IntroAnimation.module.css';
import { BiLayer } from 'react-icons/bi';

// Smart Intro Animation: Controlled by 'isLoading' prop
export function IntroAnimation({ onComplete, isLoading = false }) {
    const [exiting, setExiting] = useState(false);
    const [minTimeElapsed, setMinTimeElapsed] = useState(false);

    // 1. Minimum Display Time (0.5s) - Quick & Snappy
    useEffect(() => {
        const timer = setTimeout(() => {
            setMinTimeElapsed(true);
        }, 1400);
        return () => clearTimeout(timer);
    }, []);

    // 2. Trigger Exit Condition
    useEffect(() => {
        // Exit ONLY if: Minimum time passed AND We are done loading AND Not already exiting
        if (minTimeElapsed && !isLoading && !exiting) {
            setExiting(true);
        }
    }, [minTimeElapsed, isLoading, exiting]);

    // 3. Handle Completion after Exit Animation
    useEffect(() => {
        if (exiting) {
            const completeTimer = setTimeout(() => {
                onComplete();
            }, 500); // 0.5s for CSS transition
            return () => clearTimeout(completeTimer);
        }
    }, [exiting, onComplete]);

    return (
        <div className={`${styles.container} ${exiting ? styles.exit : ''}`}>
            <div className={styles.content}>
                <div className={styles.logoWrapper}>
                    <BiLayer className={styles.logo} />
                </div>
                <div className={styles.textWrapper}>
                    <span className={styles.title}>TermHub</span>
                </div>
            </div>
        </div>
    );
}
