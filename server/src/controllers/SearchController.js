const TorrentSearchService = require('../services/TorrentSearchService');
const ImdbService = require('../services/ImdbService');
const Movie = require('../models/Movie');
const Config = require('../config/Config');

// Parse a torrent title to extract a clean movie name
function cleanTitle(title) {
    return title
        .replace(/\.(mkv|avi|mp4|mov|wmv|flv|webm)$/i, '')
        .replace(/\./g, ' ')
        .replace(/\s*[\[(].*?[\])]\s*/g, ' ')
        .replace(/\s*(720p|1080p|2160p|4k|BluRay|BRRip|WEBRip|HDRip|DVDRip|x264|x265|HEVC|AAC|DTS|YIFY|YTS)\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

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
                // Fall back to whatever cache we have
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

            // Phase 3: Upsert results to MongoDB (with partial metadata)
            const results = [];
            for (const torrent of torrents) {
                const cleanedTitle = cleanTitle(torrent.title);
                if (!cleanedTitle) continue;

                try {
                    const movie = await Movie.findOneAndUpdate(
                        { title: { $regex: `^${cleanedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }, provider: torrent.provider },
                        {
                            $set: {
                                title: cleanedTitle,
                                provider: torrent.provider,
                                seeds: torrent.seeds,
                                lastSearched: new Date(),
                            },
                            $addToSet: torrent.magnet
                                ? { magnet: { magnet: torrent.magnet, seeds: torrent.seeds } }
                                : {},
                        },
                        { upsert: true, new: true, setDefaultsOnInsert: true }
                    );

                    const obj = movie.toObject();
                    delete obj.torrent;
                    results.push(obj);
                } catch (e) {
                    // Duplicate key or other write error — skip
                    if (e.code !== 11000) {
                        console.error('Failed to upsert movie:', e.message);
                    }
                }
            }

            // Phase 4: Kick off async IMDB enrichment (fire-and-forget)
            setImmediate(() => enrichResults(results));

            res.json({ results, fromCache: false, total: results.length });
        } catch (error) {
            console.error('Search error:', error);
            res.status(500).json({ error: 'Search failed' });
        }
    },
};

// Background IMDB enrichment — runs after response is sent
async function enrichResults(results) {
    for (const result of results) {
        if (result.cover && result.rating) continue; // Already enriched

        try {
            const metadata = result.imdb_code
                ? await ImdbService.enrichByImdbCode(result.imdb_code)
                : await ImdbService.enrichByTitle(result.title);

            if (metadata) {
                await Movie.updateOne(
                    { _id: result._id },
                    {
                        $set: {
                            ...metadata,
                            lastSearched: new Date(),
                        },
                    }
                );
            }
        } catch (e) {
            // Non-critical — enrichment will retry on next search
        }

        // Rate-limit delay between IMDB calls
        await new Promise((r) => setTimeout(r, 300));
    }
}
