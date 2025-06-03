const rateLimit = require('express-rate-limit');

// Giới hạn chung cho tất cả các route
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 100, // Giới hạn 100 request trong 15 phút
    message: {
        error: "Quá nhiều request từ IP này, vui lòng thử lại sau 15 phút"
    },
    standardHeaders: true, // Trả về thông tin rate limit trong header
    legacyHeaders: false, // Không sử dụng header cũ
});

// Giới hạn cho các route đăng nhập/đăng ký
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 giờ
    max: 5, // Giới hạn 5 lần thử đăng nhập trong 1 giờ
    message: {
        error: "Quá nhiều lần thử đăng nhập, vui lòng thử lại sau 1 giờ"
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Giới hạn cho các route API quan trọng
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 phút
    max: 30, // Giới hạn 30 request trong 1 phút
    message: {
        error: "Quá nhiều request đến API, vui lòng thử lại sau 1 phút"
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Giới hạn cho việc tải lên file
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 giờ
    max: 10, // Giới hạn 10 lần tải lên trong 1 giờ
    message: {
        error: "Quá nhiều lần tải lên file, vui lòng thử lại sau 1 giờ"
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Tạo rateLimiter tùy chỉnh theo tham số
const rateLimiter = (options) => {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000, // Mặc định 15 phút
        max: options.max || 100, // Mặc định 100 request
        message: {
            error: options.message || "Quá nhiều request, vui lòng thử lại sau"
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
};

module.exports = {
    globalLimiter,
    authLimiter,
    apiLimiter,
    uploadLimiter,
    rateLimiter // Thêm rateLimiter vào export
};