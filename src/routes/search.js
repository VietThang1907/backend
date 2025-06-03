// src/routes/search.js
const express = require('express');
const searchController = require('../controllers/searchController'); // Import controller
const router = express.Router(); // Tạo router của Express

// Định nghĩa route GET cho đường dẫn gốc ('/') của router này
// Khi có request GET /api/search, hàm handleSearch sẽ được gọi
router.get('/', searchController.handleSearch);

// Định nghĩa route GET cho gợi ý tìm kiếm (autocomplete)
// Khi có request GET /api/search/suggestions, hàm handleGetSuggestions sẽ được gọi
router.get('/suggestions', searchController.handleGetSuggestions);

module.exports = router; // Export router để sử dụng trong server.js