const TorrentSearchService = require('../services/TorrentSearchService');
const ImdbService = require('../services/ImdbService');
const Movie = require('../models/Movie');

const MOVIE_QUERIES = [
    'action movies 2025', 'action movies 2024', 'action movies 2023',
    'comedy movies 2025', 'comedy movies 2024', 'drama 2025', 'drama 2024',
    'horror movies 2025', 'horror 2024', 'thriller 2025', 'thriller 2024',
    'sci fi movies 2025', 'sci fi 2024', 'adventure 2025',
    'romance movies 2025', 'animation movies 2025',
    'marvel', 'dc comics', 'pixar', 'disney',
    'oscar best picture', 'box office 2025', 'box office 2024',
    'interstellar', 'inception', 'the dark knight', 'pulp fiction',
    'oppenheimer', 'dune', 'john wick', 'spider man', 'avatar',
    'barbie', 'gladiator', 'deadpool', 'batman', 'joker',
    'mission impossible', 'fast furious', 'transformers', 'jurassic',
];

const TV_QUERIES = [
    'tv shows 2025', 'tv series 2025', 'tv shows 2024', 'netflix series',
    'breaking bad', 'game of thrones', 'stranger things', 'the witcher',
    'the mandalorian', 'the last of us', 'wednesday', 'squid game',
    'house of the dragon', 'the bear', 'shogun', 'fallout tv',
    'true detective', 'the boys', 'severance', 'white lotus',
    'yellowstone', 'succession', 'peaky blinders', 'ozark',
];

const ANIME_QUERIES = [
    'naruto', 'one piece', 'attack on titan', 'demon slayer',
    'jujutsu kaisen', 'my hero academia', 'dragon ball super',
    'chainsaw man', 'spy x family', 'vinland saga',
    'bleach thousand year', 'solo leveling', 'frieren',
    'mushoku tensei', 'oshi no ko', 'dandadan', 'kaiju no 8',
    'anime 2025', 'anime 2024',
];

const ALL_QUERIES = [...MOVIE_QUERIES, ...TV_QUERIES, ...ANIME_QUERIES];

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

async function processTorrent(torrent) {
    const title = cleanTitle(torrent.title);
    if (!title || title.length < 2) return false;

    try {
        // Only call OMDB if we have quota left
        let metadata = null;
        if (ImdbService.isQuotaAvailable()) {
            metadata = await ImdbService.enrichByTitle(title);
        }

        if (metadata && metadata.imdb_code) {
            const existing = await Movie.findOne({ imdb_code: metadata.imdb_code });
            if (existing) {
                await addMagnetToMovie(existing, torrent.magnet, torrent.seeds);
                return false;
            }
            await Movie.create({
                ...metadata,
                provider: torrent.provider,
                seeds: torrent.seeds,
                magnet: torrent.magnet ? [{ magnet: torrent.magnet, seeds: torrent.seeds }] : [],
                lastSearched: new Date(),
            });
            return true;
        } else {
            // No OMDB match or quota exhausted — save with torrent title only
            const existing = await Movie.findOne({ title });
            if (existing) {
                await addMagnetToMovie(existing, torrent.magnet, torrent.seeds);
                return false;
            }
            await Movie.create({
                title,
                provider: torrent.provider,
                seeds: torrent.seeds,
                magnet: torrent.magnet ? [{ magnet: torrent.magnet, seeds: torrent.seeds }] : [],
                lastSearched: new Date(),
            });
            return true;
        }
    } catch (e) {
        return false;
    }
}

let seedingActive = false;

const startContinuousSeeding = async () => {
    if (seedingActive) return;
    seedingActive = true;

    console.log('Continuous seeder: started');
    let queryIndex = 0;
    let totalNewAllTime = 0;

    const runCycle = async () => {
        while (seedingActive) {
            const query = ALL_QUERIES[queryIndex % ALL_QUERIES.length];
            queryIndex++;

            const quota = ImdbService.getQuotaRemaining();

            // If OMDB quota is exhausted, slow way down — just collect torrents without metadata
            if (quota === 0 && queryIndex > ALL_QUERIES.length) {
                // Already did one full pass and quota is gone — wait 10 min before continuing
                console.log('Seeder: OMDB quota exhausted, pausing for 10 minutes...');
                await new Promise((r) => setTimeout(r, 10 * 60 * 1000));
                continue;
            }

            try {
                const torrents = await TorrentSearchService.search(query, 'All', 15);
                let newInBatch = 0;

                for (const torrent of torrents) {
                    const isNew = await processTorrent(torrent);
                    if (isNew) newInBatch++;

                    // Pace OMDB calls: slower when quota is low
                    const delay = quota > 500 ? 400 : quota > 200 ? 800 : 1500;
                    await new Promise((r) => setTimeout(r, delay));
                }

                if (newInBatch > 0) {
                    totalNewAllTime += newInBatch;
                    console.log(`Seeder: +${newInBatch} new from "${query}" (${totalNewAllTime} total | OMDB: ${ImdbService.getQuotaRemaining()} left)`);
                }
            } catch (e) {
                // Provider down or timeout
            }

            const isFirstPass = queryIndex <= ALL_QUERIES.length;
            const delay = isFirstPass ? 3000 : 30000;
            await new Promise((r) => setTimeout(r, delay));
        }
    };

    runCycle().catch((e) => {
        console.error('Seeder crashed:', e.message);
        seedingActive = false;
        setTimeout(startContinuousSeeding, 60000);
    });
};

const stopSeeding = () => {
    seedingActive = false;
};

module.exports = { startContinuousSeeding, stopSeeding };
