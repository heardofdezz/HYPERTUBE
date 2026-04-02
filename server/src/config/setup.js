const TorrentSearchService = require('../services/TorrentSearchService');
const ImdbService = require('../services/ImdbService');
const Movie = require('../models/Movie');

const SEED_QUERIES = [
    'popular movies', 'top rated', 'action', 'comedy', 'drama',
    'thriller', 'horror', 'sci-fi', 'adventure', 'romance'
];

const seedMovies = async () => {
    console.log('Background seeder: starting...');

    for (const query of SEED_QUERIES) {
        try {
            const torrents = await TorrentSearchService.search(query, 'Movies', 20);
            console.log(`Seeder: found ${torrents.length} results for "${query}"`);

            for (const torrent of torrents) {
                const cleanedTitle = torrent.title
                    .replace(/\.(mkv|avi|mp4|mov)$/i, '')
                    .replace(/\./g, ' ')
                    .replace(/\s*(720p|1080p|2160p|4k|BluRay|BRRip|WEBRip|HDRip|x264|x265|YIFY|YTS)\s*/gi, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (!cleanedTitle) continue;

                try {
                    await Movie.findOneAndUpdate(
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
                } catch (e) {
                    if (e.code !== 11000) {
                        console.error(`Seeder: failed to upsert "${cleanedTitle}":`, e.message);
                    }
                }
            }

            // Delay between queries to avoid hammering providers
            await new Promise((r) => setTimeout(r, 2000));
        } catch (e) {
            console.error(`Seeder: failed for query "${query}":`, e.message);
        }
    }

    console.log('Background seeder: complete');
};

const enrichUnenrichedMovies = async () => {
    console.log('Enrichment: looking for unenriched movies...');

    const unenriched = await Movie.find(
        { $or: [{ cover: { $in: [null, ''] } }, { rating: null }] },
        null,
        { limit: 50, sort: { lastSearched: -1 } }
    );

    if (unenriched.length === 0) {
        console.log('Enrichment: all movies are enriched');
        return;
    }

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
            }
        } catch (e) {
            // Skip and continue
        }

        // Rate-limit delay
        await new Promise((r) => setTimeout(r, 500));
    }

    console.log('Enrichment: complete');
};

module.exports = { seedMovies, enrichUnenrichedMovies };
