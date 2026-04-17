import React, { useEffect, useReducer } from 'react';
import { createPortal } from 'react-dom';
import { timerService } from '../services/timerService';
import { useCaseTimer } from '../hooks/useCaseTimer';
import type { TimerCaseData } from '../hooks/useCaseTimer';
import { useAuth } from '../../auth/hooks/useAuth';
import { usePiP } from '../../../context/PiPContext';
import styles from './TimerPagePiPContent.module.css';
import { PiPContent } from './PiPContent';

type PiPState = {
    activeCase: TimerCaseData | null;
    isReady: boolean;
};

type PiPAction = 
    | { type: 'SET_ACTIVE_CASE'; payload: TimerCaseData | null }
    | { type: 'SET_READY'; payload: boolean };

const pipReducer = (state: PiPState, action: PiPAction): PiPState => {
    switch (action.type) {
        case 'SET_ACTIVE_CASE':
            return { ...state, activeCase: action.payload };
        case 'SET_READY':
            return { ...state, isReady: action.payload };
        default:
            return state;
    }
};

export const TimerPiP: React.FC = () => {
    const { isOpen, pipWindow } = usePiP() as { isOpen: boolean; pipWindow: Window | null; closePiP: () => void };
    const { user } = useAuth() as any;

    const [state, dispatch] = useReducer(pipReducer, {
        activeCase: null,
        isReady: false
    });

    const { activeCase, isReady } = state;
    const { timeLeft, formatTime, isExceeded, startTime } = useCaseTimer(activeCase || ({} as TimerCaseData));

    useEffect(() => {
        if (!user?.email || !isOpen) return;
        const unsub = timerService.subscribeToActiveCases(user.email, (cases) => {
            dispatch({ type: 'SET_ACTIVE_CASE', payload: cases && cases.length > 0 ? (cases[0] as TimerCaseData) : null });
        });
        return () => unsub();
    }, [user, isOpen]);

    useEffect(() => {
        if (!isOpen || !pipWindow) {
            dispatch({ type: 'SET_READY', payload: false });
            return;
        }

        const win = pipWindow;

        const copyStyles = () => {
            Array.from(document.styleSheets).forEach((styleSheet) => {
                try {
                    if (styleSheet.href) {
                        const newLink = win.document.createElement('link');
                        newLink.rel = 'stylesheet';
                        newLink.href = styleSheet.href;
                        win.document.head.appendChild(newLink);
                    } else if (styleSheet.cssRules) {
                        const newStyle = win.document.createElement('style');
                        Array.from(styleSheet.cssRules).forEach((rule) => {
                            newStyle.appendChild(win.document.createTextNode(rule.cssText));
                        });
                        win.document.head.appendChild(newStyle);
                    }
                } catch (e) {
                }
            });

            Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]')).forEach(styleNode => {
                try {
                    win.document.head.appendChild(styleNode.cloneNode(true));
                } catch (e) { }
            });
        };

        copyStyles();

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

        const themeObserver = new MutationObserver(() => {
            const theme = document.documentElement.getAttribute('data-theme');
            if (theme) win.document.documentElement.setAttribute('data-theme', theme);
            if (document.body.className) win.document.body.className = document.body.className;
            win.document.body.style.backgroundColor = getComputedStyle(document.body).backgroundColor;
        });
        
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });

        const timer = setTimeout(() => dispatch({ type: 'SET_READY', payload: true }), 150);

        return () => {
            themeObserver.disconnect();
            clearTimeout(timer);
        };
    }, [isOpen, pipWindow]);

    if (!isOpen || !pipWindow || !isReady) return null;

    const target = pipWindow.document.getElementById('pip-root-container') || pipWindow.document.body;

    return createPortal(
        <div className={styles.rootContainer}>
            <PiPContent 
                activeCase={activeCase}
                isExceeded={isExceeded}
                timeLeft={timeLeft || 0}
                formatTime={formatTime}
                startTime={startTime}
            />
        </div>,
        target
    );
};