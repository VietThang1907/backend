const jwt = require("jsonwebtoken");
const User = require("../models/user");

// Cấu hình logging - đặt thành false để tắt tất cả các log
const DEBUG_MODE = false;

// Hàm helper để log có điều kiện
const debugLog = (...args) => {
  if (DEBUG_MODE) {
    console.log(...args);
  }
};

// Middleware cơ bản verify token
const verifyToken = async (req, res, next) => {
    try {
        // Lấy token từ header Authorization
        const authHeader = req.header("Authorization");
        debugLog("Auth header:", authHeader);

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            debugLog("Missing or invalid Authorization header format");
            return res.status(401).json({ error: "Truy cập bị từ chối. Token không hợp lệ!" });
        }

        // Loại bỏ "Bearer " để lấy token thực
        const token = authHeader.split(" ")[1];
        debugLog("Token:", token ? `${token.substring(0, 15)}...` : "null");

        if (!token || token === 'undefined' || token === 'null') {
            debugLog("Token is null/undefined or empty string");
            return res.status(401).json({ error: "Truy cập bị từ chối. Token không hợp lệ!" });
        }

        try {
            // Giải mã token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            debugLog("Decoded token:", decoded);
            
            if (!decoded || !decoded.userId) {
                debugLog("Token could not be decoded or doesn't contain userId");
                return res.status(401).json({ error: "Token không hợp lệ hoặc không chứa thông tin người dùng!" });
            }
            
            // THÊM MỚI: Kiểm tra trạng thái tài khoản trong cơ sở dữ liệu
            const user = await User.findById(decoded.userId);
            if (!user) {
                debugLog("User not found in database:", decoded.userId);
                return res.status(404).json({ error: "Không tìm thấy người dùng" });
            }

            // Kiểm tra trạng thái tài khoản
            if (user.isActive === false) {
                return res.status(403).json({ 
                    error: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.",
                    isAccountLocked: true 
                });
            }
            
            // Lưu thông tin user vào request - include the full user object and decoded token
            req.user = {
              ...decoded,
              ...user.toObject(),
              _id: user._id || decoded.userId // Ensure _id is available
            };
            
            debugLog("Token successfully verified for user:", decoded.userId);
            next();
        } catch (jwtError) {
            console.error("JWT Error:", jwtError.message);
            debugLog("JWT Error name:", jwtError.name);
            
            // For expired tokens, provide a clear message
            if (jwtError.name === "TokenExpiredError") {
                return res.status(401).json({ 
                    error: "Token đã hết hạn. Vui lòng đăng nhập lại.",
                    isExpired: true 
                });
            }
            
            // Thử lấy userId từ token mà không verify (can be used as fallback, but be careful)
            try {
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                    const base64Payload = tokenParts[1];
                    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));
                    debugLog("Unverified payload:", payload);
                    
                    if (payload && payload.userId) {
                        debugLog("Using userId from unverified token:", payload.userId);
                        
                        // THÊM MỚI: Kiểm tra trạng thái tài khoản ngay cả với token không xác thực
                        const user = await User.findById(payload.userId);
                        if (user && user.isActive === false) {
                            return res.status(403).json({ 
                                error: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.",
                                isAccountLocked: true 
                            });
                        }
                        
                        req.user = payload;
                        return next();
                    }
                }
            } catch (parseError) {
                console.error("Error parsing token:", parseError.message);
            }
            
            return res.status(401).json({ error: "Token không hợp lệ!" });
        }
    } catch (error) {
        console.error("Auth Middleware Error:", error.message);
        return res.status(500).json({ error: "Lỗi xác thực!" });
    }
};

// Add a new middleware function that also loads the full user from the database
const isAuthenticated = async (req, res, next) => {
    try {
        // Lấy token từ header Authorization
        const authHeader = req.header("Authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Truy cập bị từ chối. Token không hợp lệ!" });
        }

        // Loại bỏ "Bearer " để lấy token thực
        const token = authHeader.split(" ")[1];

        if (!token || token === 'undefined' || token === 'null') {
            return res.status(401).json({ error: "Truy cập bị từ chối. Token không hợp lệ!" });
        }

        let decoded;
        try {
            // Giải mã token
            decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            if (!decoded || !decoded.userId) {
                return res.status(401).json({ error: "Token không hợp lệ hoặc không chứa thông tin người dùng!" });
            }
        } catch (jwtError) {
            console.error("JWT Error:", jwtError.message);
            
            // For expired tokens, provide a clear message
            if (jwtError.name === "TokenExpiredError") {
                return res.status(401).json({ 
                    error: "Token đã hết hạn. Vui lòng đăng nhập lại.",
                    isExpired: true 
                });
            }
            
            // Thử lấy userId từ token mà không verify
            try {
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                    const base64Payload = tokenParts[1];
                    const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf8'));
                    
                    if (payload && payload.userId) {
                        debugLog("Using userId from unverified token:", payload.userId);
                        decoded = payload;
                    } else {
                        return res.status(401).json({ error: "Token không hợp lệ hoặc đã hết hạn" });
                    }
                } else {
                    return res.status(401).json({ error: "Token không đúng định dạng" });
                }
            } catch (parseError) {
                console.error("Error parsing token:", parseError.message);
                return res.status(401).json({ error: "Token không đúng định dạng" });
            }
        }

        // Tìm user trong database
        try {
            const user = await User.findById(decoded.userId);
            
            if (!user) {
                debugLog("User not found in database:", decoded.userId);
                return res.status(404).json({ error: "Không tìm thấy người dùng" });
            }

            // Kiểm tra trạng thái tài khoản
            if (user.isActive === false) {
                return res.status(403).json({ 
                    error: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.",
                    isAccountLocked: true 
                });
            }

            // Lưu thông tin user vào request
            req.user = {
                ...decoded,
                _id: user._id,
                email: user.email,
                fullname: user.fullname,
                role: user.role,
                isActive: user.isActive
            };

            debugLog("User authenticated:", user._id, user.email);
            next();
        } catch (dbError) {
            console.error("Database Error:", dbError.message);
            return res.status(500).json({ error: "Lỗi khi truy vấn database" });
        }
    } catch (error) {
        console.error("Authentication Error:", error.message);
        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({ error: "Token không hợp lệ hoặc đã hết hạn" });
        }
        return res.status(500).json({ error: "Lỗi xác thực" });
    }
};

// Add a middleware to check if user has a specific role
const hasRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Bạn cần đăng nhập để thực hiện chức năng này" });
        }
        
        const userRole = req.user.role;
        
        if (!roles.includes(userRole)) {
            return res.status(403).json({ error: "Bạn không có quyền thực hiện chức năng này" });
        }
        
        next();
    };
};

module.exports = { verifyToken, isAuthenticated, hasRole };
