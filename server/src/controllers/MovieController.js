const Movie = require('../models/Movie');

// Escape special regex characters to prevent regex injection
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
    async MoviesIndex(req, res, next) {
        try {
            const query = req.query ? req.query.query : undefined;
            const limit = Math.min(Number(req.query.limit) || 20, 100);
            const skip = Math.max((Number(req.query.page) || 1) - 1, 0);
            const provider = req.query ? req.query.provider : undefined;
            const category = req.query && req.query.category && req.query.category.length > 0
                ? escapeRegex(req.query.category)
                : undefined;

            let sort = {};
            if (req.query && req.query.sort) {
                if (req.query.sort.match(/^year$/i)) {
                    sort = { year: -1 };
                } else if (req.query.sort.match(/^rating$/i)) {
                    sort = { rating: -1 };
                }
            }

            let filters = query && query.length > 0
                ? { title: { $regex: escapeRegex(query), $options: 'i' } }
                : {};
            filters = provider && (provider === 'yts' || provider === 'eztv')
                ? { ...filters, provider }
                : filters;
            filters = category
                ? { ...filters, genres: { $all: [new RegExp('^' + category + '$', 'i')] } }
                : filters;

            const movies = await Movie.find(filters, [], {
                skip,
                limit,
                sort
            });

            const results = movies.map((movie) => {
                const obj = movie.toObject();
                delete obj.torrent;
                delete obj.magnet;
                return obj;
            });

            res.json(results);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch movies' });
        }
    },
}
