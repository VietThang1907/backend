const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const historyController = require("../controllers/historyController");

/**
 * @swagger
 * tags:
 *   name: History
 *   description: Quản lý lịch sử xem phim
 */

/**
 * @swagger
 * /api/history:
 *   post:
 *     summary: Thêm hoặc cập nhật lịch sử xem phim
 *     tags: [History]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - movieSlug
 *             properties:
 *               movieId:
 *                 type: string
 *                 description: ID của phim
 *               movieSlug:
 *                 type: string
 *                 description: Slug của phim
 *               movieData:
 *                 type: object
 *                 description: Dữ liệu chi tiết về phim
 *     responses:
 *       200:
 *         description: Lưu lịch sử thành công
 *       400:
 *         description: Thiếu thông tin
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.post("/", verifyToken, historyController.addHistory);

/**
 * @swagger
 * /api/history/{movieId}:
 *   post:
 *     summary: Thêm lịch sử xem phim bằng ID phim
 *     tags: [History]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của phim cần lưu vào lịch sử
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               movieSlug:
 *                 type: string
 *                 description: Slug của phim (nếu có)
 *               movieData:
 *                 type: object
 *                 description: Dữ liệu chi tiết về phim (nếu có)
 *     responses:
 *       200:
 *         description: Lưu lịch sử thành công
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.post("/:movieId", verifyToken, historyController.addHistoryByMovieId);

/**
 * @swagger
 * /api/history:
 *   get:
 *     summary: Lấy lịch sử xem phim của người dùng
 *     tags: [History]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng kết quả trả về
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, movies, series]
 *           default: all
 *         description: Lọc theo loại phim (tất cả, phim lẻ, phim bộ)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sắp xếp theo thời gian (mới nhất, cũ nhất)
 *     responses:
 *       200:
 *         description: Danh sách lịch sử xem phim
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.get("/", verifyToken, historyController.getUserHistory);

/**
 * @swagger
 * /api/history/users/{userId}:
 *   get:
 *     summary: Lấy danh sách phim đã xem của một người dùng cụ thể
 *     tags: [History]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của người dùng cần lấy lịch sử xem phim
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng kết quả trả về
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, movies, series]
 *           default: all
 *         description: Lọc theo loại phim (tất cả, phim lẻ, phim bộ)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sắp xếp theo thời gian (mới nhất, cũ nhất)
 *     responses:
 *       200:
 *         description: Danh sách lịch sử xem phim
 *       401:
 *         description: Không có quyền truy cập
 *       403:
 *         description: Không đủ quyền hạn để xem lịch sử của người dùng khác
 *       500:
 *         description: Lỗi server
 */
router.get("/users/:userId", verifyToken, historyController.getSpecificUserHistory);

/**
 * @swagger
 * /api/history/clear:
 *   delete:
 *     summary: Xóa toàn bộ lịch sử xem phim
 *     tags: [History]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Đã xóa toàn bộ lịch sử
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.delete("/clear", verifyToken, historyController.clearAllHistory);

/**
 * @swagger
 * /api/history/{id}:
 *   delete:
 *     summary: Xóa một mục lịch sử cụ thể
 *     tags: [History]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của mục lịch sử cần xóa
 *     responses:
 *       200:
 *         description: Đã xóa mục lịch sử
 *       401:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy mục lịch sử
 *       500:
 *         description: Lỗi server
 */
router.delete("/:id", verifyToken, historyController.deleteHistoryItem);

/**
 * @swagger
 * /api/history/public:
 *   get:
 *     summary: Public test endpoint - Lấy lịch sử xem phim (không cần xác thực - CHỈ DÙNG ĐỂ TEST)
 *     tags: [History]
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ID của người dùng cần lấy lịch sử (yêu cầu vì không có xác thực)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng kết quả trả về
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *     responses:
 *       200:
 *         description: Danh sách lịch sử xem phim
 *       400:
 *         description: Thiếu thông tin người dùng
 *       500:
 *         description: Lỗi server
 */
// Public endpoint for testing only - NOT FOR PRODUCTION
router.get("/public", async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: "Yêu cầu userId để xem lịch sử" 
      });
    }
    
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    console.log(`Public API: Getting history for user: ${userId}`);

    // Build query
    let query = { userId };
    
    // Determine sort order and field
    const sortField = { watchedAt: -1 }; // Newest first

    // Count total and get data
    const History = require("../models/history");
    const total = await History.countDocuments(query);
    console.log(`Total history items found: ${total}`);

    const histories = await History.find(query)
      .sort(sortField)
      .skip(skip)
      .limit(limit);
      
    console.log(`Retrieved ${histories.length} history items`);

    return res.status(200).json({
      success: true,
      message: "Lấy lịch sử xem phim thành công",
      data: {
        total,
        page,
        pages: Math.ceil(total / limit),
        histories
      }
    });
  } catch (error) {
    console.error("Lỗi khi lấy lịch sử xem phim:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Lỗi server", 
      message: error.message 
    });
  }
});

/**
 * @swagger
 * /api/history/watch-session/start:
 *   post:
 *     summary: Bắt đầu theo dõi thời gian xem phim
 *     tags: [History]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - movieId
 *             properties:
 *               movieId:
 *                 type: string
 *                 description: ID của phim
 *               movieSlug:
 *                 type: string
 *                 description: Slug của phim
 *               currentTime:
 *                 type: number
 *                 description: Vị trí hiện tại (giây) của video
 *               episode:
 *                 type: number
 *                 description: Tập phim (cho phim bộ)
 *     responses:
 *       200:
 *         description: Bắt đầu theo dõi thành công
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.post("/watch-session/start", verifyToken, historyController.startWatchSession);

/**
 * @swagger
 * /api/history/watch-session/end:
 *   post:
 *     summary: Kết thúc theo dõi thời gian xem phim
 *     tags: [History]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - movieId
 *             properties:
 *               movieId:
 *                 type: string
 *                 description: ID của phim
 *               currentTime:
 *                 type: number
 *                 description: Vị trí hiện tại (giây) của video
 *               duration:
 *                 type: number
 *                 description: Tổng thời lượng (giây) của video
 *               completed:
 *                 type: boolean
 *                 description: Đánh dấu đã xem xong video
 *               episode:
 *                 type: number
 *                 description: Tập phim (cho phim bộ)
 *     responses:
 *       200:
 *         description: Kết thúc theo dõi thành công
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.post("/watch-session/end", verifyToken, historyController.endWatchSession);

/**
 * @swagger
 * /api/history/watch-session/update:
 *   put:
 *     summary: Cập nhật vị trí xem phim hiện tại
 *     tags: [History]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - movieId
 *               - currentTime
 *             properties:
 *               movieId:
 *                 type: string
 *                 description: ID của phim
 *               currentTime:
 *                 type: number
 *                 description: Vị trí hiện tại (giây) của video
 *               episode:
 *                 type: number
 *                 description: Tập phim (cho phim bộ)
 *     responses:
 *       200:
 *         description: Cập nhật vị trí thành công
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.put("/watch-session/update", verifyToken, historyController.updateWatchPosition);

/**
 * @swagger
 * /api/history/total-watch-time:
 *   get:
 *     summary: Lấy tổng thời gian xem phim của người dùng
 *     tags: [History]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Tổng thời gian xem phim
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.get("/total-watch-time", verifyToken, historyController.getTotalWatchTime);

module.exports = router;