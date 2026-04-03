const TorrentSearchService = require('../services/TorrentSearchService');
const ImdbService = require('../services/ImdbService');
const Movie = require('../models/Movie');

const SEED_QUERIES = [
    'interstellar', 'inception', 'avatar', 'the dark knight', 'pulp fiction',
    'breaking bad', 'game of thrones', 'stranger things', 'the witcher',
    'naruto', 'one piece', 'attack on titan', 'demon slayer', 'jujutsu kaisen',
    'oppenheimer', 'dune', 'barbie', 'john wick', 'spider man',
    'the mandalorian', 'the last of us', 'wednesday', 'squid game',
];

function cleanTitle(raw) {
    return raw
        .split('/').pop()
        .replace(/\.(mkv|avi|mp4|mov|torrent)$/i, '')
        .replace(/\./g, ' ')
        .replace(/\[.*?\]/g, '')
        .replace(/\((\d{4})\)/g, ' $1 ')
        .replace(/\([^)]*\)/g, '')
        .replace(/\b(720p|1080p|2160p|4k|BluRay|BRRip|BrRip|WEBRip|WEB-DL|HDRip|DVDRip|x264|x265|HEVC|AAC|DTS|DDP5|TrueHD|Atmos|REMUX|PROPER|IMAX|10bit|HDR|HDR10|DV|YIFY|YTS|RARBG|GalaxyRG\w*|FraMeSToR|jennaortega|Sujaidr|pimprg)\b/gi, '')
        .replace(/-\s*\w*$/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Merge magnet into a movie doc, avoiding duplicates
async function addMagnetToMovie(movie, magnet, seeds) {
    if (!magnet) return;
    if (!movie.magnet.some(m => m.magnet === magnet)) {
        movie.magnet.push({ magnet, seeds });
    }
    if (seeds > (movie.seeds || 0)) {
        movie.seeds = seeds;
    }
    movie.lastSearched = new Date();
    await movie.save();
}

const seedMovies = async () => {
    console.log('Background seeder: starting...');
    let totalSaved = 0;

    for (const query of SEED_QUERIES) {
        try {
            const torrents = await TorrentSearchService.search(query, 'All', 10);
            console.log(`Seeder: found ${torrents.length} results for "${query}"`);

            for (const torrent of torrents) {
                const title = cleanTitle(torrent.title);
                if (!title || title.length < 2) continue;

                try {
                    // Try to enrich first to get imdb_code for dedup
                    const metadata = await ImdbService.enrichByTitle(title);

                    if (metadata && metadata.imdb_code) {
                        // Check if this movie already exists by imdb_code
                        const existing = await Movie.findOne({ imdb_code: metadata.imdb_code });
                        if (existing) {
                            await addMagnetToMovie(existing, torrent.magnet, torrent.seeds);
                        } else {
                            await Movie.create({
                                ...metadata,
                                provider: torrent.provider,
                                seeds: torrent.seeds,
                                magnet: torrent.magnet ? [{ magnet: torrent.magnet, seeds: torrent.seeds }] : [],
                                lastSearched: new Date(),
                            });
                            totalSaved++;
                            console.log(`  Saved: ${metadata.title} (${metadata.genres?.join(', ')})`);
                        }
                    } else {
                        // No IMDB match — save by title, skip if exists
                        const existing = await Movie.findOne({ title });
                        if (!existing) {
                            await Movie.create({
                                title,
                                provider: torrent.provider,
                                seeds: torrent.seeds,
                                magnet: torrent.magnet ? [{ magnet: torrent.magnet, seeds: torrent.seeds }] : [],
                                lastSearched: new Date(),
                            });
                            totalSaved++;
                            console.log(`  Saved (no metadata): ${title}`);
                        } else {
                            await addMagnetToMovie(existing, torrent.magnet, torrent.seeds);
                        }
                    }
                } catch (e) {
                    // Skip
                }

                await new Promise((r) => setTimeout(r, 350));
            }

            await new Promise((r) => setTimeout(r, 1000));
        } catch (e) {
            console.error(`Seeder: failed for query "${query}":`, e.message);
        }
    }

    console.log(`Background seeder: complete (${totalSaved} new movies saved)`);
};

module.exports = { seedMovies };
