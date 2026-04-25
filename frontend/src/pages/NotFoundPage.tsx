import React from 'react';
import { m } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BiHomeAlt, BiGhost } from 'react-icons/bi';
import styles from './NotFoundPage.module.css';

export const NotFoundPage: React.FC = () => {
    return (
        <div className={styles.container}>
            {/* Animated Background Glows */}
            <m.div 
                animate={{ 
                    x: [0, 100, -100, 0], 
                    y: [0, -50, 50, 0],
                    scale: [1, 1.2, 0.8, 1]
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className={styles.glow} 
                style={{ top: '20%', left: '30%' }}
            />
            <m.div 
                animate={{ 
                    x: [0, -120, 80, 0], 
                    y: [0, 100, -80, 0],
                    scale: [1, 0.9, 1.3, 1]
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className={styles.glow} 
                style={{ bottom: '10%', right: '20%', background: 'rgba(168, 85, 247, 0.1)' }}
            />

            <m.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                <m.div 
                    animate={{ y: [0, -15, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className={styles.errorCode}
                >
                    404
                </m.div>

                <h1 className={styles.title}>Lost in Space?</h1>
                <p className={styles.message}>
                    The page you are looking for has vanished into a black hole or never existed in this dimension.
                </p>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Link to="/" className={styles.button}>
                        <BiHomeAlt className={styles.svgIcon} />
                        Back to Command Center
                    </Link>
                </div>
            </m.div>

            {/* Floating Ghost Icon */}
            <m.div
                animate={{ 
                    y: [0, -20, 0],
                    rotate: [0, 5, -5, 0],
                    opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                style={{ position: 'absolute', bottom: '15%', left: '15%', fontSize: '4rem', color: 'white', filter: 'blur(1px)' }}
            >
                <BiGhost />
            </m.div>
        </div>
    );
};
