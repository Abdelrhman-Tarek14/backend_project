
import { useEffect, useReducer } from 'react';
import styles from './IntroAnimation.module.css';
import { BiLayer } from 'react-icons/bi';

type AnimationState = {
    exiting: boolean;
    minTimeElapsed: boolean;
};

type AnimationAction = 
    | { type: 'MIN_TIME_REACHED' }
    | { type: 'START_EXIT' };

const introReducer = (state: AnimationState, action: AnimationAction): AnimationState => {
    switch (action.type) {
        case 'MIN_TIME_REACHED':
            return { ...state, minTimeElapsed: true };
        case 'START_EXIT':
            return { ...state, exiting: true };
        default:
            return state;
    }
};

export function IntroAnimation({ onComplete, isLoading = false }: { onComplete: () => void; isLoading?: boolean }) {
    const [state, dispatch] = useReducer(introReducer, {
        exiting: false,
        minTimeElapsed: false
    });

    const { exiting, minTimeElapsed } = state;

    useEffect(() => {
        let timer: any;
        let completeTimer: any;

        if (!minTimeElapsed) {
            timer = setTimeout(() => {
                dispatch({ type: 'MIN_TIME_REACHED' });
            }, 1400);
        }

        if (minTimeElapsed && !isLoading && !exiting) {
            dispatch({ type: 'START_EXIT' });
        }

        if (exiting) {
            completeTimer = setTimeout(() => {
                onComplete();
            }, 500);
        }

        return () => {
            clearTimeout(timer);
            clearTimeout(completeTimer);
        };
    }, [minTimeElapsed, isLoading, exiting, onComplete]);

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
