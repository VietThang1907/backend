// services/ophimService.js
const axios = require('axios');

const BASE_URL = 'https://ophim1.com';

// Lấy danh sách phim mới cập nhật

// Lấy danh sách phim mới cập nhật với page được truyền vào
const getNewestMovies = async (page) => {
    try {
        // Check if page is provided, otherwise set a default value (optional)
        const response = await axios.get(`${BASE_URL}/danh-sach/phim-moi-cap-nhat`, {
            params: { page }
        });
        return response.data;
    } catch (error) {
        console.error('Lỗi khi lấy danh sách phim mới:', error);
        throw error;
    }
};
// const getNewestMovies = async (page = 1) => {
//     try {
//         const response = await axios.get(`${BASE_URL}/danh-sach/phim-moi-cap-nhat`, {
//             params: { page }
//         });
//         return response.data;
//     } catch (error) {
//         console.error('Lỗi khi lấy danh sách phim mới:', error);
//         throw error;
//     }
// };

// Lấy danh sách phim mới cập nhật
const getAllNewestMovies = async () => {
    let page = 1;
    let allMovies = [];

    try {
        // Loop to fetch all pages of movies
        while (true) {
            const response = await axios.get(`${BASE_URL}/danh-sach/phim-moi-cap-nhat`, {
                params: { page }
            });

            // If there are no more movies, break the loop
            if (!response.data || !response.data.data || !Array.isArray(response.data.data.items) || response.data.data.items.length === 0) {
                break;
            }

            // Add current page's movies to the result
            allMovies = allMovies.concat(response.data.data.items);
            page++; // Move to next page
        }

        return allMovies;
    } catch (error) {
        console.error('Lỗi khi lấy danh sách phim từ OPhim:', error);
        throw error;
    }
};

// Lấy thông tin chi tiết phim và danh sách tập phim
const getMovieDetails = async (slug) => {
    try {
        const response = await axios.get(`${BASE_URL}/phim/${slug}`);
        return response.data;
    } catch (error) {
        console.error('Lỗi khi lấy thông tin phim:', error);
        throw error;
    }
};

module.exports = { getNewestMovies, getMovieDetails };
