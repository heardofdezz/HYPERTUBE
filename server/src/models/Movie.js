const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

const magnetSchema = new mongoose.Schema({
    magnet: { type: String },
    seeds: { type: Number },
    title: { type: String, trim: true },
}, { _id: false });

const episodeSchema = new mongoose.Schema({
    episodeNumber: { type: Number, required: true },
    magnet: [magnetSchema],
}, { _id: false });

const seasonSchema = new mongoose.Schema({
    seasonNumber: { type: Number, required: true },
    magnet: [magnetSchema],       // season-level magnets (complete season packs)
    episodes: [episodeSchema],
}, { _id: false });

const movieSchema = new mongoose.Schema({
    contentType: {
        type: String,
        enum: ['movie', 'series'],
        default: 'movie'
    },
    provider: {
        type: String,
        trim: true
    },
    imdb_code: {
        type: String,
        trim: true
    },
    director: {
        type: String,
        trim: true
    },
    writer: {
        type: String,
        trim: true
    },
    title: {
        type: String,
        trim: true
    },
    cover: {
        type: String,
        trim: true
    },
    year: {
        type: Number
    },
    rating: {
        type: Number
    },
    runtime: {
        type: String,
        trim: true
    },
    totalSeasons: {
        type: Number
    },
    genres: [
        {
            type: String,
            trim: true
        }
    ],
    summary: {
        type: String,
        trim: true
    },
    actors: {
        type: String,
        trim: true
    },
    country: {
        type: String,
        trim: true
    },
    torrent: [],
    magnet: [magnetSchema],
    seasons: [seasonSchema],
    seriesMagnet: [magnetSchema],  // complete series packs
    filePath: {
        type: String,
        trim: true
    },
    seeds: {
        type: Number
    },
    subtitleFr: {
        type: String
    },
    subtitleEn: {
        type: String
    },
    isDownloaded: {
        type: Boolean,
        default: false
    },
    comments: [commentSchema],
    lastSearched: {
        type: Date,
        default: Date.now
    }
});

movieSchema.index({ title: 1, provider: 1 });
movieSchema.index({ title: 'text' });
movieSchema.index({ lastSearched: 1 });
movieSchema.index({ contentType: 1 });
movieSchema.index({ imdb_code: 1 });

const Movie = mongoose.model('Movie', movieSchema);

module.exports = Movie;
