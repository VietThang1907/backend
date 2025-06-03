#!/usr/bin/env node

/**
 * Script đồng bộ dữ liệu phim từ MongoDB lên Elasticsearch
 * Sử dụng để khởi tạo hoặc cập nhật toàn bộ dữ liệu trong Elastic Cloud
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Movie = require('../src/models/movie');
const { initClient, indexDocument } = require('../src/services/elasticsearchService');

async function syncMoviesToElasticsearch() {
  try {
    console.log('🚀 Bắt đầu đồng bộ dữ liệu phim lên Elasticsearch...');

    // Kết nối MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Đã kết nối MongoDB');

    // Khởi tạo Elasticsearch client
    const esClient = await initClient();
    if (!esClient) {
      throw new Error('Không thể khởi tạo Elasticsearch client');
    }
    console.log('✅ Đã kết nối Elasticsearch');

    // Lấy tất cả phim từ MongoDB
    const totalMovies = await Movie.countDocuments();
    console.log(`📊 Tổng số phim cần đồng bộ: ${totalMovies}`);

    const batchSize = 100;
    let processed = 0;
    let errors = 0;

    for (let skip = 0; skip < totalMovies; skip += batchSize) {
      const movies = await Movie.find({})
        .populate('category_id')
        .skip(skip)
        .limit(batchSize)
        .lean();

      console.log(`📋 Đang xử lý batch ${Math.floor(skip / batchSize) + 1}/${Math.ceil(totalMovies / batchSize)}`);

      for (const movie of movies) {
        try {
          // Chuẩn bị dữ liệu cho Elasticsearch
          const movieDoc = {
            ...movie,
            // Đảm bảo các trường cần thiết
            name: movie.name || '',
            origin_name: movie.origin_name || '',
            slug: movie.slug || '',
            content: movie.content || '',
            type: movie.type || 'single',
            status: movie.status || 'completed',
            year: movie.year || new Date().getFullYear(),
            view: movie.view || 0,
            // Xử lý category
            category: Array.isArray(movie.category) ? movie.category : [],
            // Xử lý country  
            country: Array.isArray(movie.country) ? movie.country : [],
            // Xử lý actor và director
            actor: Array.isArray(movie.actor) ? movie.actor : [],
            director: Array.isArray(movie.director) ? movie.director : [],
            // Metadata
            created_at: movie.createdAt || new Date(),
            updated_at: movie.updatedAt || new Date()
          };

          await indexDocument(movieDoc);
          processed++;
          
          if (processed % 50 === 0) {
            console.log(`✅ Đã xử lý ${processed}/${totalMovies} phim`);
          }
        } catch (error) {
          console.error(`❌ Lỗi khi index phim ${movie.slug}:`, error.message);
          errors++;
        }
      }
    }

    console.log('\n🎉 Hoàn thành đồng bộ dữ liệu!');
    console.log(`✅ Số phim đã đồng bộ: ${processed}`);
    console.log(`❌ Số lỗi: ${errors}`);
    console.log(`📊 Tỷ lệ thành công: ${((processed / totalMovies) * 100).toFixed(2)}%`);

  } catch (error) {
    console.error('💥 Lỗi trong quá trình đồng bộ:', error);
  } finally {
    // Đóng kết nối
    await mongoose.disconnect();
    console.log('🔌 Đã đóng kết nối MongoDB');
  }
}

// Chạy script
if (require.main === module) {
  syncMoviesToElasticsearch()
    .then(() => {
      console.log('🏁 Script hoàn thành');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script thất bại:', error);
      process.exit(1);
    });
}

module.exports = { syncMoviesToElasticsearch };
