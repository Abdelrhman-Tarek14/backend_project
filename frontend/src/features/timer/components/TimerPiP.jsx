import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BiHash, BiTime } from 'react-icons/bi';
import { timerService } from '../services/timerService';
import { useCaseTimer } from '../hooks/useCaseTimer';
import { useAuth } from '../../auth/hooks/useAuth';
import { usePiP } from '../../../context/PiPContext';
import styles from './TimerPagePiPContent.module.css';

export const TimerPiP = () => {
    const { isOpen, pipWindow, closePiP } = usePiP();
    const { user } = useAuth();
    const [activeCase, setActiveCase] = useState(null);
    const [isReady, setIsReady] = useState(false);

    const { timeLeft, formatTime, isExceeded, startTime } = useCaseTimer(activeCase || {});

    // 1. Timer Data Subscription
    useEffect(() => {
        if (!user?.email || !isOpen) return;
        const unsub = timerService.subscribeToActiveCases(user.email, (cases) => {
            setActiveCase(cases && cases.length > 0 ? cases[0] : null);
        });
        return () => unsub();
    }, [user, isOpen]);

    // 2. PiP Window Management
    useEffect(() => {
        if (!isOpen || !pipWindow) {
            setIsReady(false);
            return;
        }

        const win = pipWindow;

        // Copy Styles
        const copyStyles = () => {
            [...document.styleSheets].forEach((styleSheet) => {
                try {
                    if (styleSheet.href) {
                        const newLink = win.document.createElement('link');
                        newLink.rel = 'stylesheet';
                        newLink.href = styleSheet.href;
                        win.document.head.appendChild(newLink);
                    } else if (styleSheet.cssRules) {
                        const newStyle = win.document.createElement('style');
                        [...styleSheet.cssRules].forEach((rule) => {
                            newStyle.appendChild(win.document.createTextNode(rule.cssText));
                        });
                        win.document.head.appendChild(newStyle);
                    }
                } catch (e) { }
            });

            Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]')).forEach(styleNode => {
                try {
                    win.document.head.appendChild(styleNode.cloneNode(true));
                } catch (e) { }
            });
        };

        copyStyles();

        // Window Bootstrap
        win.document.title = "Timer Assistant";
        win.document.documentElement.style.height = '100%';
        win.document.body.className = document.body.className;
        win.document.body.style.cssText = document.body.style.cssText;
        win.document.body.style.backgroundColor = getComputedStyle(document.body).backgroundColor;
        win.document.body.style.margin = '0';
        win.document.body.style.padding = '0';
        win.document.body.style.height = '100%';
        win.document.body.style.overflow = 'hidden';

        if (!win.document.getElementById('pip-root-container')) {
            const root = win.document.createElement('div');
            root.id = 'pip-root-container';
            root.style.height = '100%';
            win.document.body.appendChild(root);
        }

        // Theme Sync
        const themeObserver = new MutationObserver(() => {
            const theme = document.documentElement.getAttribute('data-theme');
            if (theme) win.document.documentElement.setAttribute('data-theme', theme);
            if (document.body.className) win.document.body.className = document.body.className;
            win.document.body.style.backgroundColor = getComputedStyle(document.body).backgroundColor;
        });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });

        const timer = setTimeout(() => setIsReady(true), 150);

        return () => {
            themeObserver.disconnect();
            clearTimeout(timer);
        };
    }, [isOpen, pipWindow]);

    if (!isOpen || !pipWindow || !isReady) return null;

    const target = pipWindow.document.getElementById('pip-root-container') || pipWindow.document.body;

    const renderContent = () => {
        if (!activeCase) {
            return (
                <div className={styles.container}>
                    <div className={styles.emptyState}>
                        <BiTime size={32} />
                        <p>No active case</p>
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.caseInfo}>
                        <BiHash size={14} color="#FF5722" />
                        <span className={styles.caseNumber}>{activeCase.case_number}</span>
                    </div>
                    <div className={styles.etaLabel}>
                        ETA: {activeCase.eta || activeCase.duration_minutes || 0}m
                    </div>
                </div>

                <div className={styles.mainDisplay}>
                    <div className={styles.timeLabel}>{isExceeded ? 'Exceeded' : 'Remaining'}</div>
                    <div className={`${styles.timeValue} ${isExceeded ? styles.overdue : ''}`}>
                        {formatTime(timeLeft)}
                    </div>
                </div>

                <div className={styles.footerGrid}>
                    <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Start</span>
                        <span className={styles.metaValue}>
                            {startTime ? startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    return createPortal(
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {renderContent()}
        </div>,
        target
    );
};
