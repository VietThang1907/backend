const { body, param, query, validationResult } = require('express-validator');

// Validation cho user
const userValidation = {
    register: [
        body('email')
            .isEmail()
            .withMessage('Email không hợp lệ')
            .normalizeEmail(),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Mật khẩu phải có ít nhất 6 ký tự')
            .matches(/\d/)
            .withMessage('Mật khẩu phải chứa ít nhất 1 số'),
        body('fullname')
            .trim()
            .isLength({ min: 2 })
            .withMessage('Họ tên phải có ít nhất 2 ký tự')
    ],
    
    login: [
        body('email')
            .isEmail()
            .withMessage('Email không hợp lệ')
            .normalizeEmail(),
        body('password')
            .notEmpty()
            .withMessage('Mật khẩu không được để trống')
    ]
};

// Validation cho movie
const movieValidation = {
    create: [
        body('title')
            .trim()
            .isLength({ min: 2 })
            .withMessage('Tiêu đề phải có ít nhất 2 ký tự'),
        body('description')
            .trim()
            .isLength({ min: 10 })
            .withMessage('Mô tả phải có ít nhất 10 ký tự'),
        body('category')
            .isMongoId()
            .withMessage('Danh mục không hợp lệ'),
        body('releaseYear')
            .isInt({ min: 1900, max: new Date().getFullYear() })
            .withMessage('Năm phát hành không hợp lệ')
    ],
    
    update: [
        param('id')
            .isMongoId()
            .withMessage('ID phim không hợp lệ'),
        body('title')
            .optional()
            .trim()
            .isLength({ min: 2 })
            .withMessage('Tiêu đề phải có ít nhất 2 ký tự'),
        body('description')
            .optional()
            .trim()
            .isLength({ min: 10 })
            .withMessage('Mô tả phải có ít nhất 10 ký tự')
    ]
};

// Validation cho comment
const commentValidation = {
    create: [
        body('content')
            .trim()
            .isLength({ min: 1, max: 500 })
            .withMessage('Nội dung bình luận phải từ 1 đến 500 ký tự'),
        body('movieId')
            .isMongoId()
            .withMessage('ID phim không hợp lệ')
    ]
};

// Middleware xử lý kết quả validation
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Dữ liệu không hợp lệ',
            details: errors.array()
        });
    }
    next();
};

// Subscription validation middlewares - định nghĩa các middleware riêng lẻ
// Middleware cho đăng ký gói
const validatePackageId = body('packageId')
    .isMongoId()
    .withMessage('ID gói đăng ký không hợp lệ');

const validatePaymentMethod = body('paymentMethod')
    .isIn(['credit_card', 'bank_transfer', 'e_wallet', 'momo', 'zalopay'])
    .withMessage('Phương thức thanh toán không hợp lệ');

// Middleware cho tạo gói
const validatePackageName = body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Tên gói phải từ 2 đến 50 ký tự');

const validatePackageDescription = body('description')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Mô tả phải có ít nhất 10 ký tự');

const validatePackagePrice = body('price')
    .isNumeric()
    .withMessage('Giá phải là số')
    .isFloat({ min: 0 })
    .withMessage('Giá không được âm');

const validatePackageDuration = body('durationDays')
    .isInt({ min: 1 })
    .withMessage('Thời hạn phải là số nguyên dương');

const validateAccountTypeId = body('accountTypeId')
    .isMongoId()
    .withMessage('ID loại tài khoản không hợp lệ');

module.exports = {
    userValidation,
    movieValidation,
    commentValidation,
    validate,
    // Xuất các middleware riêng lẻ
    validatePackageId,
    validatePaymentMethod,
    validatePackageName,
    validatePackageDescription,
    validatePackagePrice,
    validatePackageDuration,
    validateAccountTypeId
};