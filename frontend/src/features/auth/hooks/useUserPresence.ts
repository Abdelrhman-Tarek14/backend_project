import { useEffect } from 'react';
import socketService from '../../../services/socket';

interface PresenceUser {
    email?: string;
    name?: string;
    [key: string]: any;
}

/**
 * Hook to manage user presence via WebSockets.
 * The backend automatically marks the user as online/offline
 * when the socket connects or disconnects.
 * * @param {PresenceUser | null | undefined} user - The authenticated user object
 */
export function useUserPresence(user: PresenceUser | null | undefined): void {
    useEffect(() => {
        if (!user) {
            socketService.disconnect();
            return;
        }

        socketService.connect();

        return () => {
        };
    }, [user]);
}