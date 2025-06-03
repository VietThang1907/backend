# WebSocket Client Implementation Guide

## Lỗi Token Expired và Cách Xử Lý

Khi bạn gặp lỗi `TokenExpiredError: jwt expired`, điều này có nghĩa là JWT token đã hết hạn. Đây là cách xử lý:

## 1. Xử lý Error Types từ WebSocket

Server sẽ gửi các loại error sau:

```javascript
// Token hết hạn
{
  "type": "authentication_error",
  "message": "Token has expired. Please login again.",
  "code": "TOKEN_EXPIRED",
  "details": "jwt expired"
}

// Token không hợp lệ
{
  "type": "authentication_error", 
  "message": "Invalid token format",
  "code": "INVALID_TOKEN"
}

// Thiếu token
{
  "type": "authentication_error",
  "message": "Token is required", 
  "code": "MISSING_TOKEN"
}

// Chưa xác thực
{
  "type": "error",
  "message": "Authentication required",
  "code": "NOT_AUTHENTICATED" 
}
```

## 2. Client-side Implementation

```javascript
class WebSocketClient {
  constructor(serverUrl) {
    this.serverUrl = serverUrl;
    this.ws = null;
    this.token = localStorage.getItem('authToken');
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    try {
      this.ws = new WebSocket(this.serverUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Gửi token để xác thực
        if (this.token) {
          this.authenticate();
        }
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }

  authenticate() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'authenticate',
        token: this.token
      }));
    }
  }

  handleMessage(data) {
    switch (data.type) {
      case 'connection_status':
        if (data.status === 'connected') {
          console.log('Authentication successful');
          this.onAuthenticated(data);
        }
        break;

      case 'authentication_error':
        this.handleAuthError(data);
        break;

      case 'token_warning':
        this.handleTokenWarning(data);
        break;

      case 'error':
        if (data.code === 'NOT_AUTHENTICATED') {
          this.authenticate();
        }
        break;

      case 'pong':
        console.log('Pong received');
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }

  handleAuthError(data) {
    console.error('Authentication error:', data);
    
    switch (data.code) {
      case 'TOKEN_EXPIRED':
        this.handleTokenExpired();
        break;
        
      case 'INVALID_TOKEN':
      case 'MISSING_TOKEN':
        this.redirectToLogin();
        break;
        
      default:
        console.error('Unknown auth error:', data);
    }
  }

  handleTokenExpired() {
    console.log('Token expired, attempting to refresh...');
    
    // Thử refresh token
    this.refreshToken()
      .then((newToken) => {
        this.token = newToken;
        localStorage.setItem('authToken', newToken);
        this.authenticate();
      })
      .catch((error) => {
        console.error('Failed to refresh token:', error);
        this.redirectToLogin();
      });
  }

  handleTokenWarning(data) {
    console.warn('Token expiring soon:', data.message);
    
    // Hiển thị thông báo cho user
    this.showTokenWarning();
    
    // Tự động refresh token
    this.refreshToken()
      .then((newToken) => {
        this.token = newToken;
        localStorage.setItem('authToken', newToken);
      })
      .catch(console.error);
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    return data.accessToken;
  }

  redirectToLogin() {
    // Xóa tokens cũ
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    
    // Redirect về trang login
    window.location.href = '/login';
  }

  showTokenWarning() {
    // Hiển thị toast notification hoặc modal
    // Implement theo UI framework bạn đang sử dụng
    console.log('Session expiring soon, please refresh');
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, 2000 * this.reconnectAttempts); // Exponential backoff
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Gửi ping để kiểm tra kết nối
  ping() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'ping' }));
    }
  }

  // Gửi heartbeat
  heartbeat() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'heartbeat' }));
    }
  }

  onAuthenticated(data) {
    // Callback khi xác thực thành công
    console.log('User authenticated:', data);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Sử dụng
const wsClient = new WebSocketClient('ws://localhost:3000');
wsClient.connect();

// Ping định kỳ để duy trì kết nối
setInterval(() => {
  wsClient.ping();
}, 30000); // 30 giây

// Heartbeat định kỳ
setInterval(() => {
  wsClient.heartbeat();
}, 60000); // 1 phút
```

## 3. React Hook Implementation

```javascript
import { useEffect, useRef, useState } from 'react';

export const useWebSocket = (serverUrl) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      wsRef.current = new WebSocket(serverUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        // Authenticate
        wsRef.current.send(JSON.stringify({
          type: 'authenticate',
          token
        }));
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connection_status' && data.status === 'connected') {
          setIsAuthenticated(true);
        } else if (data.type === 'authentication_error') {
          if (data.code === 'TOKEN_EXPIRED') {
            // Handle token refresh
            handleTokenExpired();
          }
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setIsAuthenticated(false);
        
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };
    };

    const handleTokenExpired = async () => {
      try {
        const newToken = await refreshToken();
        localStorage.setItem('authToken', newToken);
        connect();
      } catch (error) {
        // Redirect to login
        window.location.href = '/login';
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [serverUrl]);

  const sendMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  return {
    isConnected,
    isAuthenticated,
    sendMessage
  };
};
```

## 4. Error Codes Reference

| Code | Description | Action |
|------|-------------|--------|
| `TOKEN_EXPIRED` | JWT token đã hết hạn | Refresh token hoặc login lại |
| `INVALID_TOKEN` | Token không hợp lệ | Login lại |
| `MISSING_TOKEN` | Thiếu token | Login lại |
| `NOT_AUTHENTICATED` | Chưa xác thực | Gửi lại authentication |
| `TOKEN_EXPIRING_SOON` | Token sắp hết hạn | Refresh token |

## 5. Best Practices

1. **Always handle token expiration gracefully**
2. **Implement automatic token refresh**
3. **Use exponential backoff for reconnection**
4. **Show user-friendly error messages**
5. **Clear stored tokens on authentication failure**
6. **Implement heartbeat to maintain connection**
