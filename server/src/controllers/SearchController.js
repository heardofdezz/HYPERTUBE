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

            // Phase 3: Save results, dedup by imdb_code
            const results = [];
            const seen = new Set();

            for (const torrent of torrents) {
                const title = cleanTitle(torrent.title);
                if (!title || title.length < 2) continue;

                try {
                    // Try IMDB enrichment to get imdb_code for dedup
                    const metadata = await ImdbService.enrichByTitle(title);
                    let movie;

                    if (metadata && metadata.imdb_code) {
                        if (seen.has(metadata.imdb_code)) {
                            // Already handled in this batch — just add magnet
                            const existing = await Movie.findOne({ imdb_code: metadata.imdb_code });
                            if (existing && torrent.magnet && !existing.magnet.some(m => m.magnet === torrent.magnet)) {
                                existing.magnet.push({ magnet: torrent.magnet, seeds: torrent.seeds });
                                if (torrent.seeds > (existing.seeds || 0)) existing.seeds = torrent.seeds;
                                await existing.save();
                            }
                            continue;
                        }
                        seen.add(metadata.imdb_code);

                        const existing = await Movie.findOne({ imdb_code: metadata.imdb_code });
                        if (existing) {
                            if (torrent.magnet && !existing.magnet.some(m => m.magnet === torrent.magnet)) {
                                existing.magnet.push({ magnet: torrent.magnet, seeds: torrent.seeds });
                            }
                            if (torrent.seeds > (existing.seeds || 0)) existing.seeds = torrent.seeds;
                            existing.lastSearched = new Date();
                            await existing.save();
                            movie = existing;
                        } else {
                            movie = await Movie.create({
                                ...metadata,
                                provider: torrent.provider,
                                seeds: torrent.seeds,
                                magnet: torrent.magnet ? [{ magnet: torrent.magnet, seeds: torrent.seeds }] : [],
                                lastSearched: new Date(),
                            });
                        }
                    } else {
                        // No IMDB match — save by title
                        if (seen.has(title.toLowerCase())) continue;
                        seen.add(title.toLowerCase());

                        const existing = await Movie.findOne({ title });
                        if (existing) {
                            if (torrent.magnet && !existing.magnet.some(m => m.magnet === torrent.magnet)) {
                                existing.magnet.push({ magnet: torrent.magnet, seeds: torrent.seeds });
                            }
                            existing.lastSearched = new Date();
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
                    }

                    const obj = movie.toObject();
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
