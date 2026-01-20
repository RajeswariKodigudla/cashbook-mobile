/**
 * Real-Time Notification Service
 * Supports Firebase Cloud Messaging (FCM), WebSockets, and Server-Sent Events (SSE)
 */

import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/api';
import { getAuthToken } from '../config/api';

export type NotificationType = 
  | 'INVITATION' 
  | 'INVITATION_ACCEPTED' 
  | 'TRANSACTION_ADDED' 
  | 'TRANSACTION_EDITED' 
  | 'PERMISSION_CHANGED' 
  | 'MEMBER_REMOVED';

export interface RealTimeNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  accountId?: string;
  accountName?: string;
  triggeredBy: string;
  triggeredByUser?: {
    id: string;
    username: string;
  };
  timestamp: string;
  payload?: Record<string, any>;
}

type NotificationCallback = (notification: RealTimeNotification) => void;

class NotificationService {
  private ws: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private callbacks: NotificationCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private isConnecting = false;
  private fcmToken: string | null = null;
  // DISABLED: WebSocket/SSE endpoints don't exist on backend - set to true to prevent attempts
  private websocketFailed = true; // Set to true to disable WebSocket attempts
  private sseFailed = true; // Set to true to disable SSE attempts

  /**
   * Initialize real-time notifications
   * Tries WebSocket first, falls back to SSE, then FCM
   * NOTE: WebSocket/SSE endpoints may not exist on backend - handled gracefully
   */
  async initialize(onNotification: NotificationCallback) {
    this.addCallback(onNotification);

    // DISABLED: WebSocket/SSE attempts - backend doesn't have these endpoints
    // Set flags immediately to prevent any connection attempts
    this.websocketFailed = true;
    this.sseFailed = true;
    
    // This prevents browser-level console errors from WebSocket connection attempts
    // Polling fallback (60s interval) will handle notifications instead
    
    // Uncomment below if backend adds WebSocket/SSE support in the future:
    /*
    // Skip WebSocket if we know it doesn't exist (prevents console errors)
    if (!this.websocketFailed) {
      // Try WebSocket first (best for real-time)
      if (await this.tryWebSocket()) {
        console.log('✅ Real-time notifications: WebSocket connected');
        return;
      }
      // Mark as failed so we don't try again
      this.websocketFailed = true;
    }

    // Skip SSE if we know it doesn't exist (prevents console errors)
    if (!this.sseFailed) {
      // Fallback to Server-Sent Events
      if (await this.trySSE()) {
        console.log('✅ Real-time notifications: SSE connected');
        return;
      }
      // Mark as failed so we don't try again
      this.sseFailed = true;
    }
    */

    // Fallback to FCM (for mobile)
    if (Platform.OS !== 'web') {
      await this.initializeFCM();
      if (this.fcmToken) {
        console.log('✅ Real-time notifications: FCM initialized');
        return;
      }
    }

    // Silently fall back to polling - no console log needed
    // Polling will handle notifications via 60s interval
  }

  /**
   * Try WebSocket connection
   * DISABLED: Backend doesn't have WebSocket endpoint
   */
  private async tryWebSocket(): Promise<boolean> {
    // Early return - WebSocket endpoint doesn't exist on backend
    if (this.websocketFailed) {
      return false;
    }
    
    try {
      const token = await getAuthToken();
      if (!token) return false;

      // Convert HTTP URL to WebSocket URL
      const wsUrl = API_BASE_URL.replace(/^https?:\/\//, 'ws://').replace(/^https:\/\//, 'wss://');
      const wsEndpoint = `${wsUrl}/ws/notifications/?token=${token}`;

      return new Promise((resolve) => {
        // Suppress console errors during WebSocket connection attempt
        const originalError = console.error;
        const originalWarn = console.warn;
        const suppressErrors = () => {
          console.error = () => {}; // Suppress WebSocket connection errors
          console.warn = () => {}; // Suppress WebSocket warnings
        };
        const restoreErrors = () => {
          console.error = originalError;
          console.warn = originalWarn;
        };
        
        try {
          suppressErrors();
          
          this.ws = new WebSocket(wsEndpoint);
          
          // Restore console after connection attempt (suppress browser-level errors)
          setTimeout(() => {
            restoreErrors();
          }, 3000); // Longer delay to catch browser-level SSE errors

          this.ws.onopen = () => {
            restoreErrors();
            console.log('🔌 WebSocket connected');
            this.reconnectAttempts = 0;
            this.isConnecting = false;
            this.websocketFailed = false; // Reset flag on success
            resolve(true);
          };

          this.ws.onmessage = (event) => {
            try {
              const notification: RealTimeNotification = JSON.parse(event.data);
              this.handleNotification(notification);
            } catch (error) {
              // Only log parsing errors, not connection errors
              console.error('Error parsing WebSocket message:', error);
            }
          };

          this.ws.onerror = (error) => {
            restoreErrors();
            // Silently handle errors - backend may not have WebSocket endpoint
            // Don't log - this is expected when WebSocket endpoints don't exist
            this.isConnecting = false;
            this.websocketFailed = true; // Mark as failed
            resolve(false);
          };

          this.ws.onclose = (event) => {
            restoreErrors();
            // Silently handle close - backend may not have WebSocket endpoint
            // Don't log - this is expected when WebSocket endpoints don't exist
            this.ws = null;
            this.isConnecting = false;
            this.websocketFailed = true; // Mark as failed
            // Don't attempt reconnect - WebSocket endpoint doesn't exist
            resolve(false);
          };

          // Timeout after 5 seconds
          setTimeout(() => {
            if (this.isConnecting) {
              restoreErrors();
              this.ws?.close();
              this.isConnecting = false;
              this.websocketFailed = true; // Mark as failed
              resolve(false);
            }
          }, 5000);
        } catch (error) {
          restoreErrors();
          // Silently handle errors - backend may not have WebSocket endpoint
          // Don't log - this is expected
          this.websocketFailed = true; // Mark as failed
          resolve(false);
        }
      });
    } catch (error) {
      // Silently handle initialization errors - backend may not have WebSocket endpoint
      // Don't log - this is expected
      return false;
    }
  }

  /**
   * Try Server-Sent Events (SSE)
   * DISABLED: Backend doesn't have SSE endpoint
   */
  private async trySSE(): Promise<boolean> {
    // Early return - SSE endpoint doesn't exist on backend
    if (this.sseFailed) {
      return false;
    }
    
    try {
      const token = await getAuthToken();
      if (!token) return false;

      // SSE endpoint
      const sseUrl = `${API_BASE_URL}/notifications/stream/?token=${token}`;

      return new Promise((resolve) => {
        try {
          // Suppress console errors during SSE connection attempt
          const originalError = console.error;
          const originalWarn = console.warn;
          const suppressErrors = () => {
            console.error = () => {}; // Suppress SSE connection errors
            console.warn = () => {}; // Suppress SSE warnings
          };
          const restoreErrors = () => {
            console.error = originalError;
            console.warn = originalWarn;
          };
          
          suppressErrors();
          
          this.eventSource = new EventSource(sseUrl);
          
          // Restore console after connection attempt (suppress browser-level errors)
          setTimeout(() => {
            restoreErrors();
          }, 3000); // Longer delay to catch browser-level SSE errors

          this.eventSource.onopen = () => {
            restoreErrors();
            console.log('📡 SSE connected');
            this.reconnectAttempts = 0;
            this.sseFailed = false; // Reset flag on success
            resolve(true);
          };

          this.eventSource.onmessage = (event) => {
            try {
              const notification: RealTimeNotification = JSON.parse(event.data);
              this.handleNotification(notification);
            } catch (error) {
              // Only log parsing errors, not connection errors
              console.error('Error parsing SSE message:', error);
            }
          };

          this.eventSource.onerror = (error) => {
            restoreErrors();
            // Silently handle errors - backend may not have SSE endpoint
            this.eventSource?.close();
            this.eventSource = null;
            this.sseFailed = true; // Mark as failed
            resolve(false);
          };

          // Timeout after 5 seconds
          setTimeout(() => {
            if (this.eventSource && this.eventSource.readyState !== EventSource.OPEN) {
              restoreErrors();
              this.eventSource.close();
              this.eventSource = null;
              this.sseFailed = true; // Mark as failed
              resolve(false);
            }
          }, 5000);
        } catch (error) {
          restoreErrors();
          // Silently handle errors - backend may not have SSE endpoint
          // Don't log - this is expected
          this.sseFailed = true; // Mark as failed
          resolve(false);
        }
      });
    } catch (error) {
      // Silently handle initialization errors - backend may not have SSE endpoint
      // Don't log - this is expected
      this.sseFailed = true; // Mark as failed
      return false;
    }
  }

  /**
   * Initialize Firebase Cloud Messaging (for mobile)
   * Uses dynamic require to prevent Metro from bundling on web
   */
  private async initializeFCM(): Promise<void> {
    try {
      // Skip FCM on web platform
      if (Platform.OS === 'web') {
        return;
      }

      // Use dynamic require to prevent Metro from statically analyzing
      // This prevents bundling errors on web
      try {
        // @ts-ignore - Dynamic require that Metro can't analyze
        const dynamicRequire = new Function('moduleName', 'return require(moduleName)');
        const messagingModule = dynamicRequire('@react-native-firebase/messaging');
        
        if (!messagingModule || !messagingModule.default) {
          console.warn('FCM module not available');
          return;
        }

        const messaging = messagingModule.default;
        
        // Request permission
        const authStatus = await messaging().requestPermission();
        const authorized = authStatus === 1 || authStatus === 2; // AUTHORIZED or PROVISIONAL
        
        if (authorized) {
          // Get FCM token
          this.fcmToken = await messaging().getToken();
          console.log('📱 FCM Token:', this.fcmToken);

          // Register token with backend
          await this.registerFCMToken(this.fcmToken);

          // Listen for foreground messages
          messaging().onMessage(async (remoteMessage: any) => {
            if (remoteMessage.data) {
              const notification: RealTimeNotification = {
                id: remoteMessage.messageId || Date.now().toString(),
                type: remoteMessage.data.type as NotificationType,
                title: remoteMessage.notification?.title || remoteMessage.data.title || 'New Notification',
                message: remoteMessage.notification?.body || remoteMessage.data.message || '',
                accountId: remoteMessage.data.accountId,
                accountName: remoteMessage.data.accountName,
                triggeredBy: remoteMessage.data.triggeredBy || '',
                timestamp: remoteMessage.sentTime || new Date().toISOString(),
                payload: remoteMessage.data,
              };
              this.handleNotification(notification);
            }
          });

          // Handle background/quit state messages
          messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
            console.log('📱 Background FCM message:', remoteMessage);
            // Handle background notification
          });
        }
      } catch (requireError) {
        // FCM package not installed - this is fine, we'll use other methods
        console.log('ℹ️ FCM not available (package not installed or not configured)');
      }
    } catch (error) {
      console.warn('FCM initialization error:', error);
    }
  }

  /**
   * Register FCM token with backend
   */
  private async registerFCMToken(token: string): Promise<void> {
    try {
      const authToken = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/notifications/register-fcm/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ fcm_token: token }),
      });

      if (response.ok) {
        console.log('✅ FCM token registered');
      }
    } catch (error) {
      console.error('Error registering FCM token:', error);
    }
  }

  /**
   * Attempt to reconnect
   * DISABLED: WebSocket/SSE endpoints don't exist - no reconnection needed
   */
  private attemptReconnect(): void {
    // DISABLED: Don't attempt reconnection - backend doesn't have WebSocket/SSE endpoints
    // Polling fallback handles notifications instead
    return;
    
    /* Original reconnection logic - disabled
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // Silently stop - backend endpoint likely doesn't exist
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    // Only log first attempt
    if (this.reconnectAttempts === 1) {
      console.log('🔄 Attempting to reconnect real-time notifications...');
    }

    setTimeout(() => {
      if (!this.ws && !this.eventSource) {
        this.initialize(() => {}); // Reinitialize
      }
    }, delay);
    */
  }

  /**
   * Handle incoming notification
   */
  private handleNotification(notification: RealTimeNotification): void {
    console.log('🔔 Real-time notification received:', notification);
    
    // Call all registered callbacks
    this.callbacks.forEach((callback) => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });
  }

  /**
   * Add notification callback
   */
  addCallback(callback: NotificationCallback): void {
    if (!this.callbacks.includes(callback)) {
      this.callbacks.push(callback);
    }
  }

  /**
   * Remove notification callback
   */
  removeCallback(callback: NotificationCallback): void {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
  }

  /**
   * Disconnect all real-time connections
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.callbacks = [];
    this.reconnectAttempts = 0;
  }

  /**
   * Check if real-time connection is active
   */
  isConnected(): boolean {
    return (
      (this.ws?.readyState === WebSocket.OPEN) ||
      (this.eventSource?.readyState === EventSource.OPEN) ||
      (this.fcmToken !== null)
    );
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

