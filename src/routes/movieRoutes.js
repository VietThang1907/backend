// routes/movieRoutes.js
const express = require("express");
const router = express.Router();
const MovieController = require("../controllers/movieController");

/**
 * @swagger
 * tags:
 *   name: Movie
 *   description: Quản lý phim
 */

/**
 * @swagger
 * /api/movies:
 *   post:
 *     summary: Thêm mới phim
 *     tags: [Movie]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - origin_name
 *               - slug
 *               - content
 *               - type
 *               - status
 *               - year
 *               - quality
 *               - lang
 *               - category
 *               - country
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên phim tiếng Việt
 *                 minLength: 1
 *               origin_name:
 *                 type: string
 *                 description: Tên gốc của phim
 *                 minLength: 1
 *               slug:
 *                 type: string
 *                 description: Slug URL duy nhất của phim
 *                 minLength: 1
 *               content:
 *                 type: string
 *                 description: Mô tả tóm tắt nội dung phim
 *                 minLength: 1
 *               type:
 *                 type: string
 *                 enum: [movie, series, tv]
 *                 description: Loại phim (movie, series, tv)
 *               status:
 *                 type: string
 *                 enum: [completed, updating]
 *                 description: Trạng thái phim (completed, updating)
 *               thumb_url:
 *                 type: string
 *                 description: URL hình ảnh thumbnail
 *               poster_url:
 *                 type: string
 *                 description: URL hình ảnh poster
 *               trailer_url:
 *                 type: string
 *                 description: URL trailer phim
 *               time:
 *                 type: string
 *                 description: Thời lượng phim (ví dụ "90 phút", "60 phút/tập")
 *               episode_current:
 *                 type: string
 *                 description: Tập hiện tại (đối với series)
 *               episode_total:
 *                 type: string
 *                 description: Tổng số tập (đối với series)
 *               quality:
 *                 type: string
 *                 enum: [HD, FHD, SD]
 *                 description: Chất lượng phim
 *               lang:
 *                 type: string
 *                 enum: [Vietsub, Thuyết minh]
 *                 description: Ngôn ngữ/Phụ đề
 *               notify:
 *                 type: string
 *                 description: Thông báo
 *               showtimes:
 *                 type: string
 *                 description: Lịch chiếu (nếu có)
 *               year:
 *                 type: integer
 *                 description: Năm sản xuất
 *                 minimum: 1900
 *                 maximum: 2100
 *               actor:
 *                 type: array
 *                 description: Danh sách diễn viên
 *                 items:
 *                   type: string
 *               director:
 *                 type: array
 *                 description: Danh sách đạo diễn
 *                 items:
 *                   type: string
 *               category:
 *                 type: array
 *                 description: Danh sách thể loại phim
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - name
 *                     - slug
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: ID thể loại
 *                     name:
 *                       type: string
 *                       description: Tên thể loại
 *                     slug:
 *                       type: string
 *                       description: Slug thể loại
 *               country:
 *                 type: array
 *                 description: Danh sách quốc gia
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - name
 *                     - slug
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: ID quốc gia
 *                     name:
 *                       type: string
 *                       description: Tên quốc gia
 *                     slug:
 *                       type: string
 *                       description: Slug quốc gia
 *               is_copyright:
 *                 type: boolean
 *                 description: Phim có bản quyền
 *                 default: false
 *               chieurap:
 *                 type: boolean
 *                 description: Phim chiếu rạp
 *                 default: false
 *               sub_docquyen:
 *                 type: boolean
 *                 description: Phim có phụ đề độc quyền
 *                 default: false
 *               episodes:
 *                 type: array
 *                 description: Danh sách các tập phim
 *                 items:
 *                   type: object
 *                   required:
 *                     - server_name
 *                     - server_data
 *                   properties:
 *                     server_name:
 *                       type: string
 *                       description: Tên server (ví dụ "Vietsub #1")
 *                     server_data:
 *                       type: array
 *                       description: Danh sách các link phát của server
 *                       items:
 *                         type: object
 *                         required:
 *                           - name
 *                           - slug
 *                           - filename
 *                           - link_embed
 *                           - link_m3u8
 *                         properties:
 *                           name:
 *                             type: string
 *                             description: Tên tập (ví dụ "1", "2")
 *                           slug:
 *                             type: string
 *                             description: Slug của tập
 *                           filename:
 *                             type: string
 *                             description: Tên file hiển thị
 *                           link_embed:
 *                             type: string
 *                             description: Link nhúng video
 *                           link_m3u8:
 *                             type: string
 *                             description: Link m3u8 để phát video
 *             example:
 *               {
 *                 "name": "Ten Phim Moi",
 *                 "origin_name": "Original Movie Title",
 *                 "slug": "ten-phim-moi",
 *                 "content": "Day la noi dung mo ta cho bo phim moi",
 *                 "type": "movie",
 *                 "status": "completed",
 *                 "thumb_url": "https://example.com/thumbs/ten-phim-moi.jpg",
 *                 "poster_url": "https://example.com/posters/ten-phim-moi.jpg",
 *                 "trailer_url": "https://youtube.com/watch?v=example",
 *                 "time": "90 phut",
 *                 "episode_current": "Hoan Tat (12/12)",
 *                 "episode_total": "12 Tap",
 *                 "quality": "FHD",
 *                 "lang": "Vietsub",
 *                 "notify": "",
 *                 "showtimes": "",
 *                 "year": 2024,
 *                 "actor": ["Dien vien A", "Dien vien B"],
 *                 "director": ["Dao dien C"],
 *                 "category": [
 *                   {
 *                     "id": "id-hanh-dong",
 *                     "name": "Hanh Dong",
 *                     "slug": "hanh-dong"
 *                   }
 *                 ],
 *                 "country": [
 *                   {
 *                     "id": "id-my",
 *                     "name": "My",
 *                     "slug": "my"
 *                   }
 *                 ],
 *                 "is_copyright": false,
 *                 "chieurap": false,
 *                 "sub_docquyen": false,
 *                 "episodes": [
 *                   {
 *                     "server_name": "Vietsub #1",
 *                     "server_data": [
 *                       {
 *                         "name": "1",
 *                         "slug": "1",
 *                         "filename": "Tap 1 - Vietsub",
 *                         "link_embed": "https://example.com/embed/ep1",
 *                         "link_m3u8": "https://example.com/hls/ep1/index.m3u8"
 *                       }
 *                     ]
 *                   }
 *                 ]
 *               }
 *     responses:
 *       201:
 *         description: Thêm phim thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Thêm phim thành công"
 *                 data:
 *                   $ref: '#/components/schemas/Movie'
 *       400:
 *         description: Dữ liệu đầu vào không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Dữ liệu không hợp lệ"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Lỗi hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi hệ thống"
 */
router.post("/movies", MovieController.create);

/**
 * @swagger
 * /api/movies:
 *   get:
 *     summary: Lấy danh sách phim có phân trang
 *     tags: [Movie]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Trang hiện tại
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 24
 *         description: Số lượng phim mỗi trang
 *     responses:
 *       200:
 *         description: Trả về danh sách phim và thông tin phân trang
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Danh sách phim"
 *                 data:
 *                   type: object
 *                   properties:
 *                     movies:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Movie'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *                         totalMovies:
 *                           type: integer
 *                           example: 100
 *                         moviesPerPage:
 *                           type: integer
 *                           example: 24
 *       500:
 *         description: Lỗi hệ thống
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Lỗi khi lấy danh sách phim"
 */
router.get("/movies", MovieController.getAll); // Lấy tất cả phim với phân trang

/**
 * @swagger
 * /api/movies/{slug}:
 *   get:
 *     summary: Lấy thông tin phim theo slug
 *     tags: [Movie]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         description: Slug của phim (ví dụ "cung-tuong-yem")
 *         schema:
 *           type: string
 *           example: "cung-tuong-yem"
 *     responses:
 *       200:
 *         description: Thông tin phim
 *       404:
 *         description: Phim không tồn tại
 *       500:
 *         description: Lỗi hệ thống
 */
router.get("/movies/:slug", MovieController.getBySlug);  // Lấy phim theo slug

/**
 * @swagger
 * /api/movies/id/{movieId}:
 *   get:
 *     summary: Lấy thông tin phim theo ID
 *     tags: [Movie]
 *     parameters:
 *       - in: path
 *         name: movieId
 *         required: true
 *         description: ID của phim cần lấy thông tin
 *         schema:
 *           type: string
 *           example: "60c72b2f5f1b2b001f9a2b3c"
 *     responses:
 *       200:
 *         description: Thông tin phim
 *       404:
 *         description: Phim không tồn tại
 *       500:
 *         description: Lỗi hệ thống
 */
router.get("/movies/id/:movieId", MovieController.getById);  // Lấy phim theo ID (giữ lại để tương thích ngược)

/**
 * @swagger
 * /api/movies/{id}:
 *   put:
 *     summary: Cập nhật thông tin phim
 *     tags: [Movie]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của phim cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tên phim tiếng Việt
 *               origin_name:
 *                 type: string
 *                 description: Tên gốc của phim
 *               slug:
 *                 type: string
 *                 description: Slug URL duy nhất của phim
 *               content:
 *                 type: string
 *                 description: Mô tả tóm tắt nội dung phim
 *               type:
 *                 type: string
 *                 enum: [movie, series, tv]
 *                 description: Loại phim (movie, series, tv)
 *               status:
 *                 type: string
 *                 enum: [completed, updating]
 *                 description: Trạng thái phim (completed, updating)
 *               thumb_url:
 *                 type: string
 *                 description: URL hình ảnh thumbnail
 *               poster_url:
 *                 type: string
 *                 description: URL hình ảnh poster
 *               trailer_url:
 *                 type: string
 *                 description: URL trailer phim
 *               time:
 *                 type: string
 *                 description: Thời lượng phim
 *               episode_current:
 *                 type: string
 *                 description: Tập hiện tại (đối với series)
 *               episode_total:
 *                 type: string
 *                 description: Tổng số tập (đối với series)
 *               quality:
 *                 type: string
 *                 enum: [HD, FHD, SD]
 *                 description: Chất lượng phim
 *               lang:
 *                 type: string
 *                 enum: [Vietsub, Thuyết minh]
 *                 description: Ngôn ngữ/Phụ đề
 *               year:
 *                 type: integer
 *                 description: Năm sản xuất
 *               actor:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Danh sách diễn viên
 *               director:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Danh sách đạo diễn
 *               category:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     slug:
 *                       type: string
 *                 description: Danh sách thể loại phim
 *               country:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     slug:
 *                       type: string
 *                 description: Danh sách quốc gia
 *               is_copyright:
 *                 type: boolean
 *                 description: Phim có bản quyền
 *               chieurap:
 *                 type: boolean
 *                 description: Phim chiếu rạp
 *               sub_docquyen:
 *                 type: boolean
 *                 description: Phim có phụ đề độc quyền
 *               episodes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     server_name:
 *                       type: string
 *                     server_data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           slug:
 *                             type: string
 *                           filename:
 *                             type: string
 *                           link_embed:
 *                             type: string
 *                           link_m3u8:
 *                             type: string
 *     responses:
 *       200:
 *         description: Cập nhật phim thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cập nhật phim thành công"
 *                 data:
 *                   $ref: '#/components/schemas/Movie'
 *       404:
 *         description: Không tìm thấy phim
 *       500:
 *         description: Lỗi hệ thống
 */
router.put("/movies/:id", MovieController.update);

/**
 * @swagger
 * /api/movies/{id}:
 *   delete:
 *     summary: Xóa phim
 *     tags: [Movie]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của phim cần xóa
 *     responses:
 *       200:
 *         description: Xóa phim thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Xóa phim thành công"
 *       404:
 *         description: Không tìm thấy phim
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Phim không tồn tại"
 *       500:
 *         description: Lỗi hệ thống
 */
router.delete("/movies/:id", MovieController.delete);  // Xóa phim

/**
 * @swagger
 * /api/ophim/movies:
 *   get:
 *     summary: Lấy danh sách phim mới từ OPhim
 *     tags: [Movie]
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         description: Số trang để lấy phim (default là 1)
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Danh sách phim từ OPhim
 *       500:
 *         description: Lỗi khi lấy dữ liệu từ OPhim
 */
router.get('/ophim/movies', MovieController.getOphimMovies);  // Lấy danh sách phim từ OPhim

/**
 * @swagger
 * /api/ophim/movies/all:
 *   get:
 *     summary: Lấy tất cả phim từ OPhim
 *     tags: [Movie]
 *     responses:
 *       200:
 *         description: Danh sách tất cả phim từ OPhim
 *       500:
 *         description: Lỗi khi lấy dữ liệu từ OPhim
 */
router.get('/ophim/movies/all', MovieController.getAllOphimMovies);

/**
 * @swagger
 * /api/ophim/movies/{slug}:
 *   get:
 *     summary: Lấy thông tin chi tiết phim từ OPhim theo slug
 *     tags: [Movie]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         description: Slug của phim cần lấy thông tin chi tiết
 *         schema:
 *           type: string
 *           example: "avengers-endgame"
 *     responses:
 *       200:
 *         description: Thông tin chi tiết phim từ OPhim
 *       500:
 *         description: Lỗi khi lấy thông tin từ OPhim
 */
router.get('/ophim/movies/:slug', MovieController.getOphimMovieDetails);  // Lấy thông tin chi tiết phim từ OPhim

/**
 * @swagger
 * /api/movies/most-viewed:
 *   get:
 *     summary: Lấy danh sách phim xem nhiều nhất
 *     tags: [Movie]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số ngày để lọc dữ liệu (mặc định là 1 ngày - ngày hôm nay)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng phim trả về tối đa
 *     responses:
 *       200:
 *         description: Danh sách phim xem nhiều nhất
 *       500:
 *         description: Lỗi hệ thống
 */
router.get('/most-viewed', MovieController.getMostViewedMovies);  // Lấy phim xem nhiều nhất

module.exports = router;
