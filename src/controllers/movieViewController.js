const Movie = require('../models/movie');
const MovieView = require('../models/movieView');
const responseHelper = require('../utils/responseHelper');
const mongoose = require('mongoose');

// Record a movie view when a user clicks to watch a movie
exports.recordMovieView = async (req, res) => {
  try {
    const { movieId } = req.body;
    
    if (!movieId) {
      return responseHelper.badRequestResponse(res, 'Movie ID is required');
    }

    // Validate that movieId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      return responseHelper.badRequestResponse(res, 'Invalid movie ID format');
    }

    // Check if the movie exists
    const movieExists = await Movie.exists({ _id: movieId });
    if (!movieExists) {
      return responseHelper.notFoundResponse(res, 'Movie not found');
    }

    // Create new view record
    const movieView = new MovieView({
      movieId,
      // If user is authenticated, store their ID
      userId: req.user ? req.user._id : null,
      // Store IP address for anonymous users
      ipAddress: req.ip || req.connection.remoteAddress
    });

    await movieView.save();

    return responseHelper.successResponse(res, 'View recorded successfully');
  } catch (error) {
    console.error('Error recording movie view:', error);
    return responseHelper.serverErrorResponse(res, error.message);
  }
};

// Get most viewed movies for today
exports.getMostViewedMovies = async (req, res) => {
  try {
    const { days = 1, limit = 10 } = req.query;
    
    // Calculate the date from which to count views
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    // Aggregate to get most viewed movies since the start date
    const mostViewedMovies = await MovieView.aggregate([
      {
        $match: {
          viewDate: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: "$movieId",
          viewCount: { $sum: 1 }
        }
      },
      {
        $sort: { viewCount: -1 }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $lookup: {
          from: "movies",
          localField: "_id",
          foreignField: "_id",
          as: "movieDetails"
        }
      },
      {
        $unwind: "$movieDetails"
      },
      {
        $project: {
          _id: "$movieDetails._id",
          name: "$movieDetails.name",
          origin_name: "$movieDetails.origin_name",
          slug: "$movieDetails.slug",
          year: "$movieDetails.year",
          thumb_url: "$movieDetails.thumb_url",
          poster_url: "$movieDetails.poster_url",
          backdrop_url: "$movieDetails.backdrop_url",
          type: "$movieDetails.type",
          quality: "$movieDetails.quality",
          lang: "$movieDetails.lang",
          episodes: "$movieDetails.episodes",
          viewCount: 1
        }
      }
    ]);

    return responseHelper.successResponse(res, 'Most viewed movies retrieved successfully', { movies: mostViewedMovies });
  } catch (error) {
    console.error('Error getting most viewed movies:', error);
    return responseHelper.serverErrorResponse(res, error.message);
  }
};

// Get view statistics for a specific movie
exports.getMovieViewStats = async (req, res) => {
  try {
    const { movieId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(movieId)) {
      return responseHelper.badRequestResponse(res, 'Invalid movie ID format');
    }
    
    // Calculate different time periods
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const startOfMonth = new Date(today);
    startOfMonth.setDate(1);
    
    // Get view counts for different time periods
    const todayCount = await MovieView.countDocuments({
      movieId,
      viewDate: { 
        $gte: new Date(today.setHours(0, 0, 0, 0)) 
      }
    });
    
    const yesterdayCount = await MovieView.countDocuments({
      movieId,
      viewDate: { 
        $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
        $lt: new Date(today)
      }
    });
    
    const weekCount = await MovieView.countDocuments({
      movieId,
      viewDate: { 
        $gte: new Date(startOfWeek.setHours(0, 0, 0, 0))
      }
    });
    
    const monthCount = await MovieView.countDocuments({
      movieId,
      viewDate: { 
        $gte: new Date(startOfMonth.setHours(0, 0, 0, 0))
      }
    });
    
    const allTimeCount = await MovieView.countDocuments({ movieId });
    
    return responseHelper.successResponse(res, 'Movie view statistics retrieved successfully', {
      movieId,
      stats: {
        today: todayCount,
        yesterday: yesterdayCount,
        thisWeek: weekCount,
        thisMonth: monthCount,
        allTime: allTimeCount
      }
    });
  } catch (error) {
    console.error('Error getting movie view stats:', error);
    return responseHelper.serverErrorResponse(res, error.message);
  }
};