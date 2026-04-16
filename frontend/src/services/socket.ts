import { io, Socket } from 'socket.io-client';

const socketURL: string = import.meta.env.VITE_SOCKET_URL || '';

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Set<Function>> = new Map();

    constructor() {
        this.socket = null;
        this.listeners = new Map();

        this.connect();
    }

    connect(): void {
        if (this.socket) return;

        this.socket = io(socketURL, {
            withCredentials: true,
            transports: ['websocket'],
            autoConnect: true,
        });

        this.socket.on('connect', () => {
            console.log('Connected to Realtime Gateway');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from Realtime Gateway');
        });

        this.socket.on('connect_error', (error: Error) => {
            console.error('Socket Connection Error:', error);
        });

        // Re-attach all existing listeners if socket re-connects
        this.listeners.forEach((callbacks, event) => {
            callbacks.forEach(callback => {
                this.socket?.on(event, callback as any);
            });
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    on(event: string, callback: (data: any) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)?.add(callback);

        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event: string, callback: (data: any) => void): void {
        if (this.listeners.has(event)) {
            this.listeners.get(event)?.delete(callback);
            if (this.listeners.get(event)?.size === 0) {
                this.listeners.delete(event);
            }
        }

        if (this.socket) {
            this.socket.off(event, callback);
        }
    }

    emit(event: string, data: any): void {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }
}

const socketService = new SocketService();
export default socketService;