import { io, Socket } from 'socket.io-client';

// Socket MUST hit the same backend as the REST API. We derive it from
// VITE_API_BASE_URL (which is known-good — the API works) by stripping the
// trailing /api. This is the source of truth, so a wrong/stale VITE_SOCKET_URL
// can't break real-time chat. VITE_SOCKET_URL is only a last-resort fallback.
const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
const SOCKET_URL =
  (apiBase && apiBase.replace(/\/api\/?$/, '')) ||
  import.meta.env.VITE_SOCKET_URL ||
  'http://localhost:5000';

/**
 * Socket.io client service for managing WebSocket connections
 * Singleton pattern - only one instance exists throughout the app
 */
class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;

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
      reconnectionDelayMax: 10000,
      // Never give up reconnecting. The backend (Render free tier) can take
      // 30–60s to wake from sleep; a low cap made the socket give up before the
      // server was back, leaving the user with no real-time chat until a manual
      // page refresh. Infinity keeps retrying so it recovers automatically.
      reconnectionAttempts: Infinity,
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
      this.reconnectAttempts++; // socket.io keeps retrying (reconnectionAttempts: Infinity)
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
