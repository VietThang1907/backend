const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Netflix Clone API",
            version: "1.0.0",
            description: "API cho hệ thống Netflix Clone - Phát video trực tuyến",
        },
        servers: [
            {
                url: "http://localhost:5000",
                description: "Local server"
            }
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT"
                }
            }
        },
        security: [{ BearerAuth: [] }], // 🛑 Thêm BearerAuth cho tất cả API
        tags: [ // Định nghĩa tag ở đây luôn cho chắc
            {
                name: "Search",
                description: "API tìm kiếm phim bằng Elasticsearch"
            },
            {
                name: "Favorites",
                description: "API quản lý phim yêu thích"
            },
            {
                name: "Email Notifications",
                description: "API quản lý và gửi thông báo email đến người dùng"
            },
            {
                name: "Bulk Email",
                description: "API gửi email hàng loạt đến người dùng"
            }
            // Thêm các tag khác nếu cần
        ],
        paths: { // Định nghĩa các đường dẫn API
            "/api/search": { // Đường dẫn API
                get: { // Phương thức GET
                    tags: ["Search"], // Gán tag
                    summary: "Tìm kiếm phim",
                    description: "Tìm kiếm phim theo từ khóa và có hỗ trợ lọc theo trường cụ thể với cú pháp 'field:value'",
                    parameters: [
                        {
                            name: "q",
                            in: "query",
                            description: "Từ khóa tìm kiếm phim hoặc cú pháp 'field:value' để tìm theo trường cụ thể",
                            required: true,
                            schema: { type: "string" }
                        },
                        {
                            name: "size",
                            in: "query",
                            description: "Số lượng kết quả trên một trang",
                            required: false,
                            schema: { type: "integer", default: 20 }
                        },
                        {
                            name: "from",
                            in: "query",
                            description: "Vị trí bắt đầu lấy kết quả (dùng cho phân trang)",
                            required: false,
                            schema: { type: "integer", default: 0 }
                        }
                    ],
                    responses: {
                        '200': {
                            description: "Thành công. Trả về mảng kết quả phim và thông tin meta.",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: {
                                                type: "boolean",
                                                example: true
                                            },
                                            data: {
                                                type: "array",
                                                items: {
                                                    type: "object"
                                                }
                                            },
                                            meta: {
                                                type: "object",
                                                properties: {
                                                    query: { type: "string" },
                                                    field: { type: "string", nullable: true },
                                                    from: { type: "integer" },
                                                    size: { type: "integer" },
                                                    total: { type: "integer" }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        '400': {
                            description: "Lỗi client - Thiếu tham số hoặc định dạng không hợp lệ",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: {
                                                type: "boolean",
                                                example: false
                                            },
                                            message: {
                                                type: "string"
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        '500': {
                            description: "Lỗi server",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: {
                                                type: "boolean",
                                                example: false
                                            },
                                            message: {
                                                type: "string"
                                            },
                                            error: {
                                                type: "string"
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                // Thêm các phương thức khác (post, put, delete) nếu có cho path này
            },
            "/api/favorites": {
                get: {
                    tags: ["Favorites"],
                    summary: "Lấy danh sách phim yêu thích",
                    description: "Lấy danh sách phim yêu thích của người dùng đã đăng nhập",
                    security: [{ BearerAuth: [] }],
                    responses: {
                        '200': {
                            description: "Thành công. Trả về mảng phim yêu thích.",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: {
                                                type: "boolean",
                                                example: true
                                            },
                                            data: {
                                                type: "array",
                                                items: {
                                                    type: "object",
                                                    properties: {
                                                        id: { type: "string" },
                                                        title: { type: "string" },
                                                        slug: { type: "string" },
                                                        thumbnail: { type: "string" },
                                                        year: { type: "string" },
                                                        rating: { type: "number" }
                                                    }
                                                }
                                            },
                                            message: { type: "string" }
                                        }
                                    }
                                }
                            }
                        },
                        '401': {
                            description: "Unauthorized - Không có quyền truy cập"
                        },
                        '500': {
                            description: "Lỗi server"
                        }
                    }
                },
                post: {
                    tags: ["Favorites"],
                    summary: "Thêm phim vào danh sách yêu thích",
                    description: "Thêm một bộ phim vào danh sách yêu thích của người dùng",
                    security: [{ BearerAuth: [] }],
                    requestBody: {
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        movieId: { type: "string", description: "ID của phim" },
                                        movieSlug: { type: "string", description: "Slug của phim" }
                                    },
                                    example: {
                                        movieSlug: "avengers-endgame"
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: "Thành công. Phim đã được thêm vào yêu thích."
                        },
                        '400': {
                            description: "Lỗi dữ liệu đầu vào"
                        },
                        '401': {
                            description: "Unauthorized - Không có quyền truy cập"
                        },
                        '404': {
                            description: "Không tìm thấy phim"
                        },
                        '500': {
                            description: "Lỗi server"
                        }
                    }
                }
            },
            "/api/favorites/{movieId}": {
                delete: {
                    tags: ["Favorites"],
                    summary: "Xóa phim khỏi danh sách yêu thích",
                    description: "Xóa một bộ phim khỏi danh sách yêu thích của người dùng",
                    security: [{ BearerAuth: [] }],
                    parameters: [
                        {
                            name: "movieId",
                            in: "path",
                            description: "ID của phim cần xóa",
                            required: true,
                            schema: { type: "string" }
                        }
                    ],
                    responses: {
                        '200': {
                            description: "Thành công. Phim đã được xóa khỏi yêu thích."
                        },
                        '401': {
                            description: "Unauthorized - Không có quyền truy cập"
                        },
                        '404': {
                            description: "Không tìm thấy phim trong danh sách yêu thích"
                        },
                        '500': {
                            description: "Lỗi server"
                        }
                    }
                }
            },
            "/api/favorites/check": {
                get: {
                    tags: ["Favorites"],
                    summary: "Kiểm tra trạng thái yêu thích của phim",
                    description: "Kiểm tra xem một phim có trong danh sách yêu thích của người dùng hay không",
                    security: [{ BearerAuth: [] }],
                    parameters: [
                        {
                            name: "movieId",
                            in: "query",
                            description: "ID của phim cần kiểm tra",
                            schema: { type: "string" }
                        },
                        {
                            name: "movieSlug",
                            in: "query",
                            description: "Slug của phim cần kiểm tra",
                            schema: { type: "string" }
                        }
                    ],
                    responses: {
                        '200': {
                            description: "Thành công. Trả về trạng thái yêu thích của phim.",
                            content: {
                                "application/json": {
                                    schema: {
                                        type: "object",
                                        properties: {
                                            success: {
                                                type: "boolean",
                                                example: true
                                            },
                                            data: {
                                                type: "object",
                                                properties: {
                                                    isFavorite: { 
                                                        type: "boolean",
                                                        description: "True nếu phim nằm trong danh sách yêu thích, ngược lại là false" 
                                                    }
                                                }
                                            },
                                            message: { type: "string" }
                                        }
                                    }
                                }
                            }
                        },
                        '400': {
                            description: "Thiếu thông tin phim để kiểm tra"
                        },
                        '401': {
                            description: "Unauthorized - Không có quyền truy cập"
                        },
                        '404': {
                            description: "Không tìm thấy phim"
                        },
                        '500': {
                            description: "Lỗi server"
                        }
                    }
                }
            }
            // Thêm các đường dẫn API khác nếu muốn định nghĩa ở đây
        }
        // --- HẾT PHẦN THÊM ---
    },
    apis: [
        "./src/routes/*.js", // Quét tất cả các file trong routes để lấy API Docs
        "./src/docs/*.js"    // Quét tất cả các file trong docs để lấy API Docs
    ],
};

const swaggerSpec = swaggerJsdoc(options);

const swaggerDocs = (app) => {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log("📄 Swagger Docs: http://localhost:5000/api-docs");
};

module.exports = swaggerDocs;