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
        .split('/').pop()                     // take last path segment
        .replace(/\.(mkv|avi|mp4|mov|torrent)$/i, '')
        .replace(/\./g, ' ')
        .replace(/\[.*?\]/g, '')              // remove [brackets]
        .replace(/\((\d{4})\)/g, ' $1 ')      // keep year, remove parens
        .replace(/\([^)]*\)/g, '')            // remove other (parens)
        .replace(/\b(720p|1080p|2160p|4k|BluRay|BRRip|BrRip|WEBRip|WEB-DL|HDRip|DVDRip|x264|x265|HEVC|AAC|DTS|DDP5|TrueHD|Atmos|REMUX|PROPER|IMAX|10bit|HDR|HDR10|DV|YIFY|YTS|RARBG|GalaxyRG\w*|FraMeSToR|jennaortega|Sujaidr|pimprg)\b/gi, '')
        .replace(/-\s*\w*$/, '')              // remove release group suffix
        .replace(/\s+/g, ' ')
        .trim();
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
                    const existing = await Movie.findOne({ title: title, provider: torrent.provider });
                    if (existing) {
                        // Update seeds and add magnet if new
                        existing.seeds = torrent.seeds;
                        existing.lastSearched = new Date();
                        if (torrent.magnet && !existing.magnet.some(m => m.magnet === torrent.magnet)) {
                            existing.magnet.push({ magnet: torrent.magnet, seeds: torrent.seeds });
                        }
                        await existing.save();
                    } else {
                        await Movie.create({
                            title,
                            provider: torrent.provider,
                            seeds: torrent.seeds,
                            magnet: torrent.magnet ? [{ magnet: torrent.magnet, seeds: torrent.seeds }] : [],
                            lastSearched: new Date(),
                        });
                        totalSaved++;
                        console.log(`  Saved: ${title}`);
                    }
                } catch (e) {
                    // Skip duplicates and errors
                }
            }

            await new Promise((r) => setTimeout(r, 2000));
        } catch (e) {
            console.error(`Seeder: failed for query "${query}":`, e.message);
        }
    }

    console.log(`Background seeder: complete (${totalSaved} new movies saved)`);

    // Immediately enrich after seeding
    await enrichUnenrichedMovies();
};

const enrichUnenrichedMovies = async () => {
    const unenriched = await Movie.find(
        { $or: [{ cover: { $in: [null, ''] } }, { rating: null }] },
        null,
        { limit: 50, sort: { lastSearched: -1 } }
    );

    if (unenriched.length === 0) return;

    console.log(`Enrichment: enriching ${unenriched.length} movies...`);

    for (const movie of unenriched) {
        try {
            const metadata = movie.imdb_code
                ? await ImdbService.enrichByImdbCode(movie.imdb_code)
                : await ImdbService.enrichByTitle(movie.title);

            if (metadata) {
                await Movie.updateOne(
                    { _id: movie._id },
                    { $set: { ...metadata, lastSearched: new Date() } }
                );
                console.log(`  Enriched: ${movie.title} -> rating:${metadata.rating}, cover:${!!metadata.cover}`);
            }
        } catch (e) {
            // Skip
        }

        await new Promise((r) => setTimeout(r, 500));
    }

    console.log('Enrichment: complete');
};

module.exports = { seedMovies, enrichUnenrichedMovies };
