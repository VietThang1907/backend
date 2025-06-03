const { ROLE_PERMISSIONS } = require('../constants/roles');

const hasPermission = (requiredPermission) => {
    return (req, res, next) => {
        try {
            if (!req.user || !req.user.role) {
                return res.status(403).json({ error: "Không có quyền truy cập!" });
            }

            const userRole = req.user.role;
            const userPermissions = ROLE_PERMISSIONS[userRole] || [];

            if (!userPermissions.includes(requiredPermission)) {
                return res.status(403).json({ 
                    error: "Bạn không có quyền thực hiện hành động này!",
                    requiredPermission,
                    userRole
                });
            }

            next();
        } catch (error) {
            console.error("Permission Middleware Error:", error);
            return res.status(500).json({ error: "Lỗi kiểm tra quyền!" });
        }
    };
};

const hasAnyPermission = (requiredPermissions) => {
    return (req, res, next) => {
        try {
            if (!req.user || !req.user.role) {
                return res.status(403).json({ error: "Không có quyền truy cập!" });
            }

            const userRole = req.user.role;
            const userPermissions = ROLE_PERMISSIONS[userRole] || [];

            const hasPermission = requiredPermissions.some(permission => 
                userPermissions.includes(permission)
            );

            if (!hasPermission) {
                return res.status(403).json({ 
                    error: "Bạn không có quyền thực hiện hành động này!",
                    requiredPermissions,
                    userRole
                });
            }

            next();
        } catch (error) {
            console.error("Permission Middleware Error:", error);
            return res.status(500).json({ error: "Lỗi kiểm tra quyền!" });
        }
    };
};

const hasAllPermissions = (requiredPermissions) => {
    return (req, res, next) => {
        try {
            if (!req.user || !req.user.role) {
                return res.status(403).json({ error: "Không có quyền truy cập!" });
            }

            const userRole = req.user.role;
            const userPermissions = ROLE_PERMISSIONS[userRole] || [];

            const hasAllRequired = requiredPermissions.every(permission => 
                userPermissions.includes(permission)
            );

            if (!hasAllRequired) {
                return res.status(403).json({ 
                    error: "Bạn không có đủ quyền thực hiện hành động này!",
                    requiredPermissions,
                    userRole
                });
            }

            next();
        } catch (error) {
            console.error("Permission Middleware Error:", error);
            return res.status(500).json({ error: "Lỗi kiểm tra quyền!" });
        }
    };
};

module.exports = {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
}; 