module.exports = {
    // 🟢 Trả về phản hồi thành công (200 OK)
    successResponse: (res, message, data = null, statusCode = 200) => {
        return res.status(statusCode).json({
            statusCode,
            message,
            data
        });
    },

    // 🟢 Trả về phản hồi khi tài nguyên đã được tạo (201 Created)
    createdResponse: (res, message, data = null) => {
        return res.status(201).json({
            statusCode: 201,
            message,
            data
        });
    },

    // 🟡 Trả về phản hồi khi yêu cầu được chấp nhận nhưng chưa xử lý xong (202 Accepted)
    acceptedResponse: (res, message, data = null) => {
        return res.status(202).json({
            statusCode: 202,
            message,
            data
        });
    },

    // 🟡 Trả về phản hồi với thông tin không chính thức (203 Non-Authoritative Information)
    nonAuthoritativeResponse: (res, message, data = null) => {
        return res.status(203).json({
            statusCode: 203,
            message,
            data
        });
    },

    // 🔴 Trả về lỗi do người dùng (400 Bad Request)
    badRequestResponse: (res, message) => {
        return res.status(400).json({
            statusCode: 400,
            message,
            data: null
        });
    },

    // 🔴 Trả về lỗi khi không tìm thấy tài nguyên (404 Not Found)
    notFoundResponse: (res, message) => {
        return res.status(404).json({
            statusCode: 404,
            message,
            data: null
        });
    },

    // 🔴 Trả về lỗi khi người dùng chưa xác thực (401 Unauthorized)
    unauthorizedResponse: (res, message) => {
        return res.status(401).json({
            statusCode: 401,
            message,
            data: null
        });
    },

    // 🔴 Trả về lỗi khi người dùng không có quyền truy cập (403 Forbidden)
    forbiddenResponse: (res, message) => {
        return res.status(403).json({
            statusCode: 403,
            message,
            data: null
        });
    },

    // 🔴 Trả về lỗi do xung đột dữ liệu (409 Conflict)
    conflictResponse: (res, message) => {
        return res.status(409).json({
            statusCode: 409,
            message,
            data: null
        });
    },

    // 🔴 Trả về lỗi do server (500 Internal Server Error)
    serverErrorResponse: (res, message) => {
        return res.status(500).json({
            statusCode: 500,
            message,
            data: null
        });
    }
};
