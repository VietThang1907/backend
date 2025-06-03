const mongoose = require('mongoose');

const movieViewSchema = new mongoose.Schema({
  movieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  viewDate: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Add an index for efficient querying of views by date
movieViewSchema.index({ viewDate: -1 });
// Add a compound index for movie and date for the most viewed queries
movieViewSchema.index({ movieId: 1, viewDate: -1 });

const MovieView = mongoose.model('MovieView', movieViewSchema);

module.exports = MovieView;