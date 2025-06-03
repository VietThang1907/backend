// controllers/movieCrawlController.js
const movieCrawlService = require('../services/movieCrawlService');
const { successResponse, serverErrorResponse, createdResponse } = require('../utils/responseHelper');

class MovieCrawlController {
    // Hàm để crawl dữ liệu phim từ OPhim và lưu vào cơ sở dữ liệu
    async crawlMovies(req, res) {
        const page = parseInt(req.query.page) || 1; // Get page from query parameter, default to 1 if not provided

        try {
            const movieCrawl = await movieCrawlService.crawlMovies(page); // Pass page to the service
            createdResponse(res, 'Crawl dữ liệu phim thành công!', movieCrawl);
        } catch (error) {
            serverErrorResponse(res, 'Lỗi khi crawl dữ liệu phim', error.message);
        }
    }
    // Hàm để crawl dữ liệu phim từ OPhim và lưu vào cơ sở dữ liệu
    async crawlMoviesAllPage(req, res) {
        try {
            const movieCrawl = await movieCrawlService.crawlMoviesAllPage(); // Gọi service crawl
            if (movieCrawl.errors.length > 0) {
                successResponse(res, 'Crawl dữ liệu phim thành công với lỗi!', { allMovies: movieCrawl, errors: movieCrawl.errors });
            } else {
                createdResponse(res, 'Crawl dữ liệu phim thành công!', movieCrawl);
            }
        } catch (error) {
            serverErrorResponse(res, 'Lỗi khi crawl dữ liệu phim', error.message);
        }
    }
}

module.exports = new MovieCrawlController();
