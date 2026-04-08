import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const PiPContext = createContext();

export const usePiP = () => {
    const context = useContext(PiPContext);
    if (!context) {
        throw new Error('usePiP must be used within a PiPProvider');
    }
    return context;
};

export const PiPProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState(null);
    const [pipWindow, setPipWindow] = useState(null);

    const closePiP = useCallback(() => {
        if (pipWindow) {
            pipWindow.close();
        }
        setIsOpen(false);
        setViewMode(null);
        setPipWindow(null);
    }, [pipWindow]);

    const openPiP = useCallback(async (mode, options = { width: 400, height: 500 }) => {
        if (!('documentPictureInPicture' in window)) {
            alert("Your browser does not support Picture-in-Picture windows.");
            return;
        }

        try {
            // CRITICAL: requestWindow must be called directly in the user gesture (click handler)
            const win = await window.documentPictureInPicture.requestWindow({
                width: options.width,
                height: options.height,
            });

            setPipWindow(win);
            setViewMode(mode);
            setIsOpen(true);

            win.addEventListener('pagehide', () => {
                setIsOpen(false);
                setViewMode(null);
                setPipWindow(null);
            });
        } catch (err) {
            console.error("Failed to open PiP window:", err);
        }
    }, []);

    const value = useMemo(() => ({
        isOpen,
        viewMode,
        pipWindow,
        openPiP,
        closePiP
    }), [isOpen, viewMode, pipWindow, openPiP, closePiP]);

    return (
        <PiPContext.Provider value={value}>
            {children}
        </PiPContext.Provider>
    );
};
