const TorrentSearchService = require('../services/TorrentSearchService');
const ImdbService = require('../services/ImdbService');
const { ingestTorrent } = require('../services/TorrentIngestionService');

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

            if (quota === 0 && queryIndex > ALL_QUERIES.length) {
                console.log('Seeder: OMDB quota exhausted, pausing for 10 minutes...');
                await new Promise((r) => setTimeout(r, 10 * 60 * 1000));
                continue;
            }

            try {
                const torrents = await TorrentSearchService.search(query, 'All', 15);
                let newInBatch = 0;

                for (const torrent of torrents) {
                    try {
                        const result = await ingestTorrent(torrent);
                        if (result && result.isNew) {
                            newInBatch++;
                            console.log(`  Saved: ${result.movie.title} [${result.movie.contentType}]`);
                        }
                    } catch (e) {
                        // Skip
                    }

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
