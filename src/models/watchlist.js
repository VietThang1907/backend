const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const watchlistSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    movieIds: [{
        type: Schema.Types.ObjectId,
        ref: 'Movie'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Create a compound index to ensure a user can only have one watchlist
watchlistSchema.index({ userId: 1 }, { unique: true });

// Create an index for faster queries
watchlistSchema.index({ userId: 1, movieIds: 1 });

module.exports = mongoose.model('Watchlist', watchlistSchema);
