const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

const movieSchema = new mongoose.Schema({
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
    magnet: [
        {
            magnet: {
                type: String
            },
            seeds: {
                type: Number
            }
        }
    ],
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

const Movie = mongoose.model('Movie', movieSchema);

module.exports = Movie;
