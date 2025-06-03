const express = require('express');
const router = express.Router();
const movieCrawlController = require('../controllers/movieCrawlController');

/**
 * @swagger
 * tags:
 *   name: Movie Crawl
 *   description: Dịch vụ crawl dữ liệu phim từ OPhim
 */

/**
 * @swagger
 * /api/crawl/movies:
 *   post:
 *     summary: Crawl dữ liệu phim từ OPhim và lưu vào cơ sở dữ liệu
 *     tags: [Movie Crawl]
 *     parameters:
 *       - in: query
 *         name: page
 *         description: Số trang cần crawl (default là 1)
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Crawl dữ liệu phim thành công
 *       500:
 *         description: Lỗi khi crawl dữ liệu từ OPhim
 */
router.post('/crawl/movies', movieCrawlController.crawlMovies);

/**
 * @swagger
 * /api/crawl/moviesall:
 *   post:
 *     summary: Crawl dữ liệu phim từ OPhim và lưu vào cơ sở dữ liệu
 *     tags: [Movie Crawl]
 *     responses:
 *       200:
 *         description: Crawl dữ liệu phim thành công
 *       500:
 *         description: Lỗi khi crawl dữ liệu từ OPhim
 */
router.post('/crawl/moviesall', movieCrawlController.crawlMoviesAllPage);

module.exports = router;
