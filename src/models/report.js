// src/models/report.js
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'contentType',
    required: false
  },
  contentType: {
    type: String,
    enum: ['Movie', 'User', 'Comment'],
    required: false
  },
  // Thêm thông tin phim để dễ quản lý
  movieInfo: {

    id: { type: String, default: '' },      // ID của phim
    name: { type: String, default: '' },    // Tên phim
    slug: { type: String, default: '' },    // Slug của phim
    thumb: { type: String, default: '' },   // Thumbnail phim
    episode: { type: Number, default: 1 }   // Tập phim đang xem khi báo cáo lỗi
  },  
  reason: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved', 'rejected'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;