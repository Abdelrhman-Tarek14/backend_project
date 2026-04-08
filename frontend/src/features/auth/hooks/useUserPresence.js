import { useEffect } from 'react';
import socketService from '../../../services/socket';

/**
 * Hook to manage user presence via WebSockets.
 * The backend automatically marks the user as online/offline
 * when the socket connects or disconnects.
 */
export function useUserPresence(user) {
    useEffect(() => {
        if (!user) {
            socketService.disconnect();
            return;
        }

        // Connect to realtime gateway
        socketService.connect();

        // No need for manual heartbeats as the WebSocket connection itself
        // is monitored by the backend (RealtimeGateway handleConnection/handleDisconnect)
        
        return () => {
            // socketService.disconnect(); 
            // Usually we keep the socket alive across pages if the user is the same
        };
    }, [user]);

}
