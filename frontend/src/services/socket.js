import { io } from 'socket.io-client';

const socketURL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

class SocketService {
    constructor() {
        this.socket = null;
        this.listeners = new Map();
    }

    connect() {
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

        this.socket.on('connect_error', (error) => {
            console.error('Socket Connection Error:', error);
        });

        // Re-attach all existing listeners if socket re-connects
        this.listeners.forEach((callbacks, event) => {
            callbacks.forEach(callback => {
                this.socket.on(event, callback);
            });
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);

        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
            if (this.listeners.get(event).size === 0) {
                this.listeners.delete(event);
            }
        }

        if (this.socket) {
            this.socket.off(event, callback);
        }
    }

    emit(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }
}

const socketService = new SocketService();
export default socketService;
