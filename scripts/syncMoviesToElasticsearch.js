/**
 * Script đồng bộ dữ liệu phim từ MongoDB sang Elasticsearch
 * Sử dụng: node scripts/syncMoviesToElasticsearch.js
 */

const mongoose = require('mongoose');
const Movie = require('../src/models/movie');
const elasticsearchService = require('../src/services/elasticsearchService');
require('dotenv').config();

// Kết nối MongoDB
async function connectDB() {
    try {
        const dbURI = process.env.MONGODB_URI || "mongodb://localhost:27017/netflix-clone";
        await mongoose.connect(dbURI);
        console.log("✅ Kết nối MongoDB thành công!");
    } catch (error) {
        console.error("❌ Lỗi kết nối MongoDB:", error);
        process.exit(1);
    }
}

// Hàm chuyển đổi movie document sang format Elasticsearch
function transformMovieForES(movie) {
    return {
        name: movie.name,
        origin_name: movie.origin_name,
        content: movie.content,
        actor: Array.isArray(movie.actor) ? movie.actor.join(', ') : movie.actor,
        director: Array.isArray(movie.director) ? movie.director.join(', ') : movie.director,
        slug: movie.slug,
        type: movie.type,
        status: movie.status,
        quality: movie.quality,
        lang: movie.lang,
        year: movie.year,
        view: movie.view || 0,
        is_copyright: movie.is_copyright,
        chieurap: movie.chieurap,
        sub_docquyen: movie.sub_docquyen,
        tmdb: movie.tmdb || {},
        imdb: movie.imdb || {},
        created: movie.created || {},
        modified: movie.modified || {},
        category: movie.category || [],
        country: movie.country || [],
        poster_url: movie.poster_url,
        thumb_url: movie.thumb_url,
        trailer_url: movie.trailer_url,
        time: movie.time,
        episode_current: movie.episode_current,
        episode_total: movie.episode_total,
        showtimes: movie.showtimes || []
    };
}

// Hàm sync dữ liệu
async function syncMovies() {
    try {
        console.log("🔄 Bắt đầu đồng bộ dữ liệu phim...");

        // Khởi tạo Elasticsearch client
        const esClient = await elasticsearchService.initClient();
        console.log(esClient)
        if (!esClient) {
            console.error("❌ Không thể kết nối Elasticsearch!");
            return;
        }


        // Lấy tất cả phim từ MongoDB
        console.log("📥 Đang lấy dữ liệu phim từ MongoDB...");
        const movies = await Movie.find({}).lean();
        console.log(`📊 Tìm thấy ${movies.length} phim trong MongoDB`);

        if (movies.length === 0) {
            console.log("⚠️ Không có phim nào để đồng bộ!");
            return;
        }

        // Đồng bộ từng phim
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < movies.length; i++) {
            const movie = movies[i];
            
            try {
                // Chuyển đổi format cho Elasticsearch
                const esMovie = transformMovieForES(movie);
                
                // Đồng bộ sang Elasticsearch
                await elasticsearchService.indexMovie(esMovie, movie._id.toString());
                
                successCount++;
                console.log(`✅ Đồng bộ thành công phim "${successCount}"`);
                if (successCount % 10 === 0) {
                    console.log(`✅ Đã đồng bộ ${successCount}/${movies.length} phim...`);
                }
                
            } catch (error) {
                console.error(`❌ Lỗi đồng bộ phim "${movie.name}":`, error.message);
                errorCount++;
            }
        }

        console.log("\n🎉 Hoàn thành đồng bộ!");
        console.log(`✅ Thành công: ${successCount} phim`);
        console.log(`❌ Thất bại: ${errorCount} phim`);
        
        // Kiểm tra số lượng document trong Elasticsearch
        const esStats = await elasticsearchService.getStats();
        console.log(`📊 Elasticsearch hiện có: ${esStats.totalMovies} phim`);

    } catch (error) {
        console.error("❌ Lỗi trong quá trình đồng bộ:", error);
    }
}

// Chạy script
async function main() {
    try {
        await connectDB();
        await syncMovies();
    } catch (error) {
        console.error("❌ Lỗi:", error);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Đã ngắt kết nối MongoDB");
        process.exit(0);
    }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
    main();
}

module.exports = { syncMovies, transformMovieForES };
