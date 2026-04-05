const Movie = require('../models/Movie');

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
    async MoviesIndex(req, res, next) {
        try {
            const query = req.query ? req.query.query : undefined;
            const limit = Math.min(Number(req.query.limit) || 20, 100);
            const skip = Math.max((Number(req.query.page) || 1) - 1, 0);
            const category = req.query && req.query.category && req.query.category.length > 0
                ? escapeRegex(req.query.category)
                : undefined;
            const type = req.query ? req.query.type : undefined;

            let sort = { rating: -1, seeds: -1 };
            if (req.query && req.query.sort) {
                if (req.query.sort.match(/^year$/i)) sort = { year: -1 };
                else if (req.query.sort.match(/^rating$/i)) sort = { rating: -1 };
                else if (req.query.sort.match(/^latest$/i)) sort = { lastSearched: -1 };
            }

            let filters = {};
            if (query && query.length > 0) {
                filters.title = { $regex: escapeRegex(query), $options: 'i' };
            }
            if (category) {
                filters.genres = { $all: [new RegExp('^' + category + '$', 'i')] };
            }
            if (type === 'movie' || type === 'series') {
                filters.contentType = type;
            }

            const movies = await Movie.find(filters, {
                title: 1,
                contentType: 1,
                cover: 1,
                year: 1,
                rating: 1,
                genres: 1,
                seeds: 1,
                summary: 1,
                runtime: 1,
                imdb_code: 1,
                totalSeasons: 1,
                lastSearched: 1,
            }, { skip, limit, sort });

            res.json(movies);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch movies' });
        }
    },
};
