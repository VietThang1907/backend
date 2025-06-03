const verifyRole = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            // Kiểm tra nếu req.user không tồn tại (JWT middleware chưa chạy hoặc token sai)
            if (!req.user || !req.user.role) {
                return res.status(403).json({ error: "Không có quyền truy cập!" });
            }

            const userRole = req.user.role; // Lấy role_id từ JWT
            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({ error: "Bạn không có quyền thực hiện hành động này!" });
            }

            next(); // Cho phép tiếp tục nếu role hợp lệ
        } catch (error) {
            return res.status(500).json({ error: "Lỗi phân quyền!" });
        }
    };
};

module.exports = verifyRole;
