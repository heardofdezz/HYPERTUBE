const Movie = require('../models/Movie');
const ImdbService = require('./ImdbService');
const { parseEpisodeInfo, isLikelyTVContent } = require('./EpisodeParser');

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

/**
 * Detect video quality from torrent title
 */
function detectQuality(title) {
    if (!title) return null;
    if (/2160p|4k|UHD/i.test(title)) return '4K';
    if (/1080p/i.test(title)) return '1080p';
    if (/720p/i.test(title)) return '720p';
    if (/480p/i.test(title)) return '480p';
    if (/REMUX/i.test(title)) return '4K REMUX';
    if (/BluRay|BrRip/i.test(title)) return '1080p';
    if (/WEBRip|WEB-DL|WEB/i.test(title)) return '1080p';
    if (/HDRip/i.test(title)) return '720p';
    if (/DVDRip|CAM|TS/i.test(title)) return 'SD';
    return null;
}

/**
 * Add a magnet link to the correct slot in a series document
 */
function addEpisodeMagnet(movie, episodeInfo, magnet, seeds, rawTitle) {
    if (!magnet) return;

    const quality = detectQuality(rawTitle);
    const magnetEntry = { magnet, seeds, title: rawTitle, quality };

    // Complete series pack
    if (episodeInfo.isCompleteSeries) {
        if (!movie.seriesMagnet.some(m => m.magnet === magnet)) {
            movie.seriesMagnet.push(magnetEntry);
        }
        return;
    }

    if (episodeInfo.season == null) {
        // Can't determine season — add to flat magnet array
        if (!movie.magnet.some(m => m.magnet === magnet)) {
            movie.magnet.push(magnetEntry);
        }
        return;
    }

    // Find or create season
    let season = movie.seasons.find(s => s.seasonNumber === episodeInfo.season);
    if (!season) {
        season = { seasonNumber: episodeInfo.season, magnet: [], episodes: [] };
        movie.seasons.push(season);
        movie.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
        // Re-find after push (Mongoose subdoc reference)
        season = movie.seasons.find(s => s.seasonNumber === episodeInfo.season);
    }

    // Complete season pack
    if (episodeInfo.isCompleteSeason || episodeInfo.episode == null) {
        if (!season.magnet.some(m => m.magnet === magnet)) {
            season.magnet.push(magnetEntry);
        }
        return;
    }

    // Specific episode
    let episode = season.episodes.find(e => e.episodeNumber === episodeInfo.episode);
    if (!episode) {
        episode = { episodeNumber: episodeInfo.episode, magnet: [] };
        season.episodes.push(episode);
        season.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
        episode = season.episodes.find(e => e.episodeNumber === episodeInfo.episode);
    }

    if (!episode.magnet.some(m => m.magnet === magnet)) {
        episode.magnet.push(magnetEntry);
    }
}

/**
 * Ingest a torrent result — handles both movies and series.
 * Returns { movie, isNew } or null on skip.
 */
async function ingestTorrent(torrent) {
    const title = cleanTitle(torrent.title);
    if (!title || title.length < 2) return null;

    const rawTitle = torrent.title;

    // Try OMDB enrichment
    let metadata = null;
    if (ImdbService.isQuotaAvailable()) {
        metadata = await ImdbService.enrichByTitle(title);
    }

    const isSeries = (metadata && metadata.contentType === 'series') || isLikelyTVContent(rawTitle);
    const episodeInfo = isSeries ? parseEpisodeInfo(rawTitle) : null;

    if (metadata && metadata.imdb_code) {
        // Check if already exists
        const existing = await Movie.findOne({ imdb_code: metadata.imdb_code });

        if (existing) {
            if (isSeries && episodeInfo) {
                addEpisodeMagnet(existing, episodeInfo, torrent.magnet, torrent.seeds, rawTitle);
            } else {
                if (torrent.magnet && !existing.magnet.some(m => m.magnet === torrent.magnet)) {
                    existing.magnet.push({ magnet: torrent.magnet, seeds: torrent.seeds, title: rawTitle, quality: detectQuality(rawTitle) });
                }
            }
            if (torrent.seeds > (existing.seeds || 0)) existing.seeds = torrent.seeds;
            existing.lastSearched = new Date();
            await existing.save();
            return { movie: existing, isNew: false };
        }

        // Create new
        const doc = {
            ...metadata,
            provider: torrent.provider,
            seeds: torrent.seeds,
            magnet: [],
            seasons: [],
            seriesMagnet: [],
            lastSearched: new Date(),
        };

        if (isSeries && episodeInfo) {
            const movie = new Movie(doc);
            addEpisodeMagnet(movie, episodeInfo, torrent.magnet, torrent.seeds, rawTitle);
            await movie.save();
            return { movie, isNew: true };
        } else {
            doc.magnet = torrent.magnet ? [{ magnet: torrent.magnet, seeds: torrent.seeds, title: rawTitle, quality: detectQuality(rawTitle) }] : [];
            const movie = await Movie.create(doc);
            return { movie, isNew: true };
        }
    }

    // No OMDB match — save by title
    const existing = await Movie.findOne({ title });
    if (existing) {
        if (isSeries && episodeInfo) {
            if (existing.contentType !== 'series') existing.contentType = 'series';
            addEpisodeMagnet(existing, episodeInfo, torrent.magnet, torrent.seeds, rawTitle);
        } else {
            if (torrent.magnet && !existing.magnet.some(m => m.magnet === torrent.magnet)) {
                existing.magnet.push({ magnet: torrent.magnet, seeds: torrent.seeds, title: rawTitle, quality: detectQuality(rawTitle) });
            }
        }
        if (torrent.seeds > (existing.seeds || 0)) existing.seeds = torrent.seeds;
        existing.lastSearched = new Date();
        await existing.save();
        return { movie: existing, isNew: false };
    }

    // Create new without metadata
    const doc = {
        title,
        contentType: isSeries ? 'series' : 'movie',
        provider: torrent.provider,
        seeds: torrent.seeds,
        magnet: [],
        seasons: [],
        seriesMagnet: [],
        lastSearched: new Date(),
    };

    if (isSeries && episodeInfo) {
        const movie = new Movie(doc);
        addEpisodeMagnet(movie, episodeInfo, torrent.magnet, torrent.seeds, rawTitle);
        await movie.save();
        return { movie, isNew: true };
    } else {
        doc.magnet = torrent.magnet ? [{ magnet: torrent.magnet, seeds: torrent.seeds, title: rawTitle, quality: detectQuality(rawTitle) }] : [];
        const movie = await Movie.create(doc);
        return { movie, isNew: true };
    }
}

module.exports = { ingestTorrent, addEpisodeMagnet, cleanTitle };
