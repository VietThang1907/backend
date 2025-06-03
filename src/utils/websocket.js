const WebSocket = require('ws');
const http = require('http');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

function setupWebSocket(server) {
  // Tạo WebSocket server
  const wss = new WebSocket.Server({ server });
  
  // Lưu trữ các kết nối active
  const clients = new Map();
  const adminClients = new Set();
  
  // Xử lý khi có client kết nối
  wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');
    
    // Xử lý xác thực
    let userId = null;
    let isAdmin = false;
    let isAuthenticated = false;
    
    // Xử lý tin nhắn từ client
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
          // Xử lý xác thực
        if (data.type === 'authenticate') {
          // Kiểm tra xem token có được gửi không
          if (!data.token) {
            ws.send(JSON.stringify({
              type: 'authentication_error',
              message: 'Token is required',
              code: 'MISSING_TOKEN'
            }));
            ws.close(1008, 'Token is required');
            return;
          }

          // Xác thực token
          try {
            const decoded = jwt.verify(data.token, JWT_SECRET);
            userId = decoded.userId || decoded._id;
            isAdmin = decoded.role === 'admin' || decoded.isAdmin === true;
            isAuthenticated = true;
            
            // Lưu kết nối theo userId
            clients.set(userId, ws);
            
            // Thêm vào danh sách admin nếu là admin
            if (isAdmin) {
              adminClients.add(ws);
              console.log(`Admin connected: ${userId}`);
            } else {
              console.log(`User connected: ${userId}`);
            }
            
            // Gửi xác nhận kết nối thành công
            ws.send(JSON.stringify({
              type: 'connection_status',
              status: 'connected',
              userId,
              isAdmin
            }));
          } catch (err) {
            console.error('Authentication error:', err);
            
            // Xử lý các loại lỗi khác nhau
            let errorMessage = 'Authentication failed';
            let errorCode = 'AUTH_FAILED';
            
            if (err.name === 'TokenExpiredError') {
              errorMessage = 'Token has expired. Please login again.';
              errorCode = 'TOKEN_EXPIRED';
            } else if (err.name === 'JsonWebTokenError') {
              errorMessage = 'Invalid token format';
              errorCode = 'INVALID_TOKEN';
            } else if (err.name === 'NotBeforeError') {
              errorMessage = 'Token not active yet';
              errorCode = 'TOKEN_NOT_ACTIVE';
            }
            
            // Gửi thông báo lỗi cụ thể
            ws.send(JSON.stringify({
              type: 'authentication_error',
              message: errorMessage,
              code: errorCode,
              details: err.message            }));
            
            // Đóng kết nối sau một khoảng thời gian ngắn
            setTimeout(() => {
              ws.close(1008, errorMessage);
            }, 1000);
          }
        } else {
          // Kiểm tra xem client đã được xác thực chưa
          if (!isAuthenticated) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Authentication required',
              code: 'NOT_AUTHENTICATED'
            }));
            return;
          }
          
          // Xử lý các loại message khác
          switch (data.type) {
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
            case 'heartbeat':
              ws.send(JSON.stringify({ 
                type: 'heartbeat_response',
                timestamp: Date.now()
              }));
              break;
            default:
              console.log(`Unknown message type: ${data.type}`);
          }
        }
      } catch (err) {
        console.error('Error parsing message:', err);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          code: 'INVALID_MESSAGE_FORMAT'
        }));
      }
    });
    
    // Xử lý ngắt kết nối
    ws.on('close', () => {
      if (userId) {
        clients.delete(userId);
        console.log(`Client disconnected: ${userId}`);
      }
      
      // Xóa khỏi danh sách admin
      if (isAdmin) {
        adminClients.delete(ws);
        console.log('Admin disconnected');
      }
    });
  });
  
  // Helper function để kiểm tra token sắp hết hạn
  const isTokenExpiringSoon = (token) => {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return false;
      
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - currentTime;
      
      // Cảnh báo nếu token sẽ hết hạn trong vòng 5 phút (300 giây)
      return timeUntilExpiry <= 300;
    } catch (err) {
      return false;
    }
  };

  // Trả về các phương thức để tương tác với WebSocket server
  return {
    // Gửi thông báo đến tất cả clients
    broadcast: (message) => {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    },
    
    // Gửi thông báo đến một user cụ thể
    sendToUser: (userId, message) => {
      const client = clients.get(userId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    },
    
    // Gửi thông báo đến tất cả admin
    notifyAdmins: (message) => {
      adminClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    },
    
    // Thông báo khi có đăng ký Premium mới
    notifyNewPremium: (subscriptionData) => {
      adminClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'premium_subscription',
            action: 'new',
            data: subscriptionData
          }));
        }
      });
    },
    
    // Thông báo khi trạng thái đăng ký Premium thay đổi
    notifyPremiumStatusChange: (subscriptionId, newStatus, userId) => {
      // Thông báo cho admin
      adminClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'premium_subscription',
            action: 'status_change',
            subscriptionId,
            newStatus
          }));
        }
      });
      
      // Thông báo cho người dùng liên quan
      if (userId) {
        const userClient = clients.get(userId);
        if (userClient && userClient.readyState === WebSocket.OPEN) {
          userClient.send(JSON.stringify({
            type: 'premium_subscription',
            action: 'status_change',
            subscriptionId,
            newStatus
          }));
        }
      }
    },
    
    // Kiểm tra xem user có đang online không
    isUserOnline: (userId) => {
      const client = clients.get(userId);
      return client && client.readyState === WebSocket.OPEN;
    },
    
    // Lấy danh sách user online
    getOnlineUsers: () => {
      return Array.from(clients.keys()).filter(userId => {
        const client = clients.get(userId);
        return client && client.readyState === WebSocket.OPEN;
      });
    },
    
    // Lấy số lượng kết nối hiện tại
    getConnectionCount: () => {
      return clients.size;
    },
    
    // Gửi cảnh báo token sắp hết hạn
    notifyTokenExpiring: (userId) => {
      const client = clients.get(userId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'token_warning',
          message: 'Your session will expire soon. Please refresh your login.',
          code: 'TOKEN_EXPIRING_SOON'
        }));
      }
    }
  };
}

module.exports = setupWebSocket;