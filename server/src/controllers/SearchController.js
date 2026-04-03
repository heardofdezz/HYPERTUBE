const TorrentSearchService = require('../services/TorrentSearchService');
const { ingestTorrent } = require('../services/TorrentIngestionService');
const Movie = require('../models/Movie');
const Config = require('../config/Config');

module.exports = {
    async search(req, res) {
        try {
            const query = (req.query.query || '').trim();
            if (query.length < 2) {
                return res.status(400).json({ error: 'Search query must be at least 2 characters' });
            }

            const category = req.query.category || 'All';
            const limit = Math.min(Number(req.query.limit) || Config.torrent.defaultLimit, 100);

            // Phase 1: Check cache
            const cacheCutoff = new Date(Date.now() - Config.torrent.cacheTTLHours * 60 * 60 * 1000);
            const cached = await Movie.find(
                {
                    title: { $regex: query, $options: 'i' },
                    lastSearched: { $gte: cacheCutoff },
                },
                null,
                { limit, sort: { rating: -1 } }
            );

            if (cached.length >= limit) {
                const results = cached.map((m) => {
                    const obj = m.toObject();
                    delete obj.torrent;
                    return obj;
                });
                return res.json({ results, fromCache: true, total: results.length });
            }

            // Phase 2: Live search
            let torrents = [];
            try {
                torrents = await TorrentSearchService.search(query, category, limit);
            } catch (err) {
                console.error('Live torrent search failed:', err.message);
                if (cached.length > 0) {
                    const results = cached.map((m) => {
                        const obj = m.toObject();
                        delete obj.torrent;
                        return obj;
                    });
                    return res.json({ results, fromCache: true, total: results.length });
                }
                return res.status(503).json({ error: 'Torrent search temporarily unavailable' });
            }

            // Phase 3: Ingest results (dedup by imdb_code, series-aware)
            const results = [];
            const seen = new Set();

            for (const torrent of torrents) {
                try {
                    const result = await ingestTorrent(torrent);
                    if (!result) continue;

                    const key = result.movie.imdb_code || result.movie._id.toString();
                    if (seen.has(key)) continue;
                    seen.add(key);

                    const obj = result.movie.toObject();
                    delete obj.torrent;
                    results.push(obj);
                } catch (e) {
                    // Skip
                }
            }

            res.json({ results, fromCache: false, total: results.length });
        } catch (error) {
            console.error('Search error:', error);
            res.status(500).json({ error: 'Search failed' });
        }
    },
};
