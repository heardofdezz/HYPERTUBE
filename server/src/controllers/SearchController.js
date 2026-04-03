const TorrentSearchService = require('../services/TorrentSearchService');
const ImdbService = require('../services/ImdbService');
const Movie = require('../models/Movie');
const Config = require('../config/Config');

function cleanTitle(raw) {
    return raw
        .split('/').pop()
        .replace(/\.(mkv|avi|mp4|mov|torrent)$/i, '')
        .replace(/\./g, ' ')
        .replace(/\[.*?\]/g, '')
        .replace(/\((\d{4})\)/g, ' $1 ')
        .replace(/\([^)]*\)/g, '')
        .replace(/\b(720p|1080p|2160p|4k|BluRay|BRRip|BrRip|WEBRip|WEB-DL|HDRip|DVDRip|x264|x265|HEVC|AAC|DTS|DDP5|TrueHD|Atmos|REMUX|PROPER|IMAX|10bit|HDR|HDR10|DV|YIFY|YTS|RARBG|GalaxyRG\w*|FraMeSToR)\b/gi, '')
        .replace(/-\s*\w*$/, '')
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

            // Phase 3: Save results to MongoDB
            const results = [];
            for (const torrent of torrents) {
                const title = cleanTitle(torrent.title);
                if (!title || title.length < 2) continue;

                try {
                    const existing = await Movie.findOne({ title, provider: torrent.provider });
                    let movie;
                    if (existing) {
                        existing.seeds = torrent.seeds;
                        existing.lastSearched = new Date();
                        if (torrent.magnet && !existing.magnet.some(m => m.magnet === torrent.magnet)) {
                            existing.magnet.push({ magnet: torrent.magnet, seeds: torrent.seeds });
                        }
                        await existing.save();
                        movie = existing;
                    } else {
                        movie = await Movie.create({
                            title,
                            provider: torrent.provider,
                            seeds: torrent.seeds,
                            magnet: torrent.magnet ? [{ magnet: torrent.magnet, seeds: torrent.seeds }] : [],
                            lastSearched: new Date(),
                        });
                    }
                    const obj = movie.toObject();
                    delete obj.torrent;
                    results.push(obj);
                } catch (e) {
                    // Skip
                }
            }

            // Phase 4: Async IMDB enrichment
            setImmediate(() => enrichResults(results));

            res.json({ results, fromCache: false, total: results.length });
        } catch (error) {
            console.error('Search error:', error);
            res.status(500).json({ error: 'Search failed' });
        }
    },
};

async function enrichResults(results) {
    for (const result of results) {
        if (result.cover && result.rating) continue;

        try {
            const metadata = result.imdb_code
                ? await ImdbService.enrichByImdbCode(result.imdb_code)
                : await ImdbService.enrichByTitle(result.title);

            if (metadata) {
                await Movie.updateOne(
                    { _id: result._id },
                    { $set: { ...metadata, lastSearched: new Date() } }
                );
            }
        } catch (e) {
            // Non-critical
        }

        await new Promise((r) => setTimeout(r, 300));
    }
}
