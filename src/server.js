const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

// --- Hàm khởi động Server ---"cors");
const path = require("path");
const http = require("http"); // Thêm module http
const { Server } = require("socket.io"); // Thêm Socket.IO
const { connectDB } = require("./config/db");
// Thêm Elasticsearch Service
const { initClient: initElasticsearchClient } = require('./services/elasticsearchService');
const swaggerDocs = require("./config/swaggerConfig");
const setupWebSocket = require('./utils/websocket'); // Thêm module WebSocket
const { setupCronJobs } = require('./config/cronJobs'); // Thêm cron jobs
const movieRoutes = require("./routes/movieRoutes");
const movieCrawlRoutes = require('./routes/movieCrawlRoutes');
const commentRoutes = require("./routes/comments");
const ratingRoutes = require("./routes/ratings");
const historyRoutes = require("./routes/histories");
const authRoutes = require("./routes/auth");
const searchRoutes = require('./routes/search');
const searchHistoryRoutes = require('./routes/searchHistory');
const userStatsRoutes = require('./routes/userStatsRoutes'); 
const subscriptionRoutes = require('./routes/subscriptionRoutes'); // Kích hoạt route subscription
// admin
const adminMovieRoutes = require("./routes/adminMovieRoutes");
const adminRoutes = require('./routes/adminRoutes');
const adminSearchRoutes = require('./routes/adminSearchRoutes');
const adminRatingRoutes = require('./routes/adminRatingRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const reportRoutes = require('./routes/reportRoutes');
const upcomingMovieRoutes = require('./routes/upcomingMovieRoutes');
const publicUpcomingMovieRoutes = require('./routes/publicUpcomingMovieRoutes');
const notificationEmailRoutes = require('./routes/notificationEmailRoutes');
const bulkEmailRoutes = require('./routes/bulkEmailRoutes');

dotenv.config();
const app = express();
const movieViewRoutes = require('./routes/movieViewRoutes'); 
const favoritesRoutes = require('./routes/favorites');
const likesRoutes = require('./routes/likes');
const watchlistRoutes = require('./routes/watchlist');
// Cấu hình CORS đầy đủ hơn
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5000', '*'], // Hoặc domain cụ thể của frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'access-control-allow-methods', 'access-control-allow-origin', 'access-control-allow-headers'],
  exposedHeaders: ['Content-Length', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 giờ
}));

app.use(express.json());

// Cấu hình phục vụ file tĩnh - không hiển thị log
const uploadsDir = path.join(__dirname, '../uploads');

// Cấu hình đúng đường dẫn tĩnh
app.use('/uploads', express.static(uploadsDir));

// Thêm middleware để ghi log các request có chứa file uploads
app.use((req, res, next) => {
  if (req.method === 'POST' && req.url === '/api/auth/upload-avatar') {
    // Chỉ log khi có yêu cầu upload avatar
    console.log('📤 Upload avatar request received');
  }
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", movieRoutes);   
app.use('/api', movieCrawlRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/history', historyRoutes); 
app.use('/api/histories', historyRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/search-history', searchHistoryRoutes); 
app.use('/api/movie-views', movieViewRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/likes', likesRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/subscription', subscriptionRoutes); // Kích hoạt route subscription
app.use('/api/upcoming-movies', publicUpcomingMovieRoutes); // Thêm route công khai cho phim sắp ra mắt
app.use("/api/admin", adminMovieRoutes); // Sửa lại đúng đường dẫn admin movie routes
app.use("/api/admin", adminRoutes); // Thêm route quản lý người dùng, vai trò và loại tài khoản
app.use("/api/admin", adminSearchRoutes); // Thêm route tìm kiếm admin với Elasticsearch
app.use("/api/admin", adminRatingRoutes); // Thêm route quản lý đánh giá phim
app.use("/api/admin/upcoming-movies", upcomingMovieRoutes); // Thêm route quản lý phim sắp ra mắt
app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/api/admin/notifications", notificationEmailRoutes); // Thêm route gửi thông báo email
app.use("/api/admin/notifications", bulkEmailRoutes); // Thêm route gửi email hàng loạt
// Đăng ký các routes cho feedback
app.use("/api/admin/feedback", feedbackRoutes); 
app.use("/api/feedback", feedbackRoutes);
app.use("/api/user-stats", userStatsRoutes);
app.use('/api/reports', reportRoutes); // Thêm route cho báo cáo
app.use('/api/advertisements', require('./routes/advertisementRoutes')); // Thêm route quảng cáo

// Simple health check endpoint for API connectivity tests
app.get('/api/health-check', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// --- Hàm khởi động Server ---
async function startServer() {
  try {
      // 🟢 Kết nối MongoDB
      await connectDB();
      console.log("✅ MongoDB connected successfully");

      // 🟢 Khởi tạo Elasticsearch Client
      await initElasticsearchClient();
      console.log("✅ Elasticsearch client initialized");

      // 🟢 Kiểm tra cấu hình email
      const { verifyEmailConfig } = require('./config/email');
      const emailConfigOk = await verifyEmailConfig();
      if (emailConfigOk) {
          console.log("✅ Email service configured successfully");
      } else {
          console.warn("⚠️ Email service not configured correctly. Email notifications may not work.");
      }

      // 🟢 Kích hoạt Swagger Docs
      swaggerDocs(app);

      // 🟢 Thiết lập Cron Jobs
      setupCronJobs();
      console.log("✅ Cron jobs setup completed");

      // 🟢 Khởi động server Express với Socket.IO
      const PORT = process.env.PORT || 5000;
      const server = http.createServer(app);
      
      // Khởi tạo Socket.IO
      const io = new Server(server, {
          cors: {
              origin: ['http://localhost:3000', 'http://localhost:5000', '*'],
              methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
              credentials: true
          }
      });
      
      // Xử lý kết nối Socket.IO
      io.on('connection', (socket) => {
          console.log('🔌 New client connected:', socket.id);
          
          // Lắng nghe sự kiện adminDataUpdate từ client
          socket.on('adminDataUpdate', (data) => {
              console.log('📊 Admin data updated:', data);
              // Gửi sự kiện đến tất cả clients đang kết nối
              io.emit('dashboardUpdate', { type: data.type, message: 'Dashboard data updated' });
          });
          
          // Xử lý khi client ngắt kết nối
          socket.on('disconnect', () => {
              console.log('🔌 Client disconnected:', socket.id);
          });
      });
      
      // Lưu io vào app để có thể sử dụng ở các routes
      app.set('io', io);
      
      // Thiết lập WebSocket riêng cho đồng bộ dữ liệu
      const wsInstance = setupWebSocket(server);
      app.set('websocket', wsInstance);
      console.log('🔌 WebSocket server đã được thiết lập thành công');
      
      server.listen(PORT, () => {
          console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
          console.log(`🔌 Socket.IO đã sẵn sàng nhận kết nối`);
      });

  } catch (error) {
      console.error("❌ Failed to start server:", error);
      process.exit(1); // Thoát ứng dụng nếu không khởi động được DB hoặc ES
  }
}

startServer();