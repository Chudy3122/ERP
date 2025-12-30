import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * Socket.io client service for managing WebSocket connections
 * Singleton pattern - only one instance exists throughout the app
 */
class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Connect to Socket.io server with JWT authentication
   * @param token - JWT access token for authentication
   * @returns Socket instance
   */
  connect(token: string): Socket {
    if (this.socket?.connected) {
      console.log('⚠️ Socket already connected');
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventListeners();

    return this.socket;
  }

  /**
   * Setup basic connection event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔴 Socket connection error:', error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached. Please refresh the page.');
      }
    });

    this.socket.on('error', (error) => {
      console.error('🔴 Socket error:', error);
    });
  }

  /**
   * Disconnect from Socket.io server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
      console.log('🔌 Socket disconnected manually');
    }
  }

  /**
   * Get current Socket instance
   * @returns Socket instance or null if not connected
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is connected
   * @returns true if connected, false otherwise
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Emit an event to the server
   * @param event - Event name
   * @param data - Data to send
   */
  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ Cannot emit event: Socket not connected');
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * Listen to an event from the server
   * @param event - Event name
   * @param callback - Callback function
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.socket) {
      console.warn('⚠️ Cannot listen to event: Socket not initialized');
      return;
    }
    this.socket.on(event, callback);
  }

  /**
   * Remove event listener
   * @param event - Event name
   * @param callback - Optional specific callback to remove
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    if (!this.socket) return;
    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }
}

// Export singleton instance
export default new SocketService();
