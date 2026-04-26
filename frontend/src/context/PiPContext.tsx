import React, { createContext, useContext, useState, useCallback, useMemo} from 'react';
import type {ReactNode } from 'react';

interface PiPOptions {
    width?: number;
    height?: number;
}

export interface PiPContextType {
    isOpen: boolean;
    viewMode: string | null;
    pipWindow: Window | null;
    pipData: any | null;
    openPiP: (mode: string, options?: PiPOptions, data?: any) => Promise<void>;
    closePiP: () => void;
}

declare global {
    interface Window {
        documentPictureInPicture: {
            requestWindow: (options: PiPOptions) => Promise<Window>;
        };
    }
}

const PiPContext = createContext<PiPContextType | undefined>(undefined);

export const usePiP = (): PiPContextType => {
    const context = useContext(PiPContext);
    if (!context) {
        throw new Error('usePiP must be used within a PiPProvider');
    }
    return context;
};

interface PiPProviderProps {
    children: ReactNode;
}

export const PiPProvider: React.FC<PiPProviderProps> = ({ children }) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [viewMode, setViewMode] = useState<string | null>(null);
    const [pipWindow, setPipWindow] = useState<Window | null>(null);
    const [pipData, setPipData] = useState<any | null>(null);

    const closePiP = useCallback(() => {
        if (pipWindow) {
            pipWindow.close();
        }
        setIsOpen(false);
        setViewMode(null);
        setPipWindow(null);
        setPipData(null);
    }, [pipWindow]);

    const openPiP = useCallback(async (mode: string, options: PiPOptions = { width: 400, height: 500 }, data: any = null) => {
        if (!('documentPictureInPicture' in window)) {
            alert("Your browser does not support Picture-in-Picture windows.");
            return;
        }

        try {
            const win = await window.documentPictureInPicture.requestWindow({
                width: options.width,
                height: options.height,
            });

            setPipWindow(win);
            setViewMode(mode);
            setPipData(data);
            setIsOpen(true);

            win.addEventListener('pagehide', () => {
                setIsOpen(false);
                setViewMode(null);
                setPipWindow(null);
                setPipData(null);
            });
        } catch (err) {
            console.error("Failed to open PiP window:", err);
        }
    }, []);

    const value: PiPContextType = useMemo(() => ({
        isOpen,
        viewMode,
        pipWindow,
        pipData,
        openPiP,
        closePiP
    }), [isOpen, viewMode, pipWindow, pipData, openPiP, closePiP]);

    return (
        <PiPContext.Provider value={value}>
            {children}
        </PiPContext.Provider>
    );
};