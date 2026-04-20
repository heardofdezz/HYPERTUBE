const TorrentSearchService = require('../services/TorrentSearchService');
const ImdbService = require('../services/ImdbService');
const { ingestTorrent } = require('../services/TorrentIngestionService');
const Config = require('./Config');

let seedingActive = false;

const startContinuousSeeding = async () => {
    if (seedingActive) return;

    const queries = Config.torrent.searchQueries;
    if (!queries.length) {
        console.log('Continuous seeder: disabled (set SEARCH_QUERIES in .env to enable)');
        return;
    }
    if (!Config.torrent.providers.length) {
        console.log('Continuous seeder: disabled (set TORRENT_PROVIDERS in .env to enable)');
        return;
    }

    seedingActive = true;
    console.log(`Continuous seeder: started (${queries.length} queries)`);
    let queryIndex = 0;
    let totalNewAllTime = 0;

    const runCycle = async () => {
        while (seedingActive) {
            const query = queries[queryIndex % queries.length];
            queryIndex++;

            const quota = ImdbService.getQuotaRemaining();

            if (quota === 0 && queryIndex > queries.length) {
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

            const isFirstPass = queryIndex <= queries.length;
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

// Merge OMDB episode data into a season, preserving existing magnet/title/rating
function mergeSeasonData(show, seasonNumber, episodeData) {
    let season = show.seasons.find(x => x.seasonNumber === seasonNumber);
    if (!season) {
        show.seasons.push({ seasonNumber, magnet: [], episodes: [] });
        season = show.seasons.find(x => x.seasonNumber === seasonNumber);
    }
    season.episodeCount = episodeData.length;

    for (const epData of episodeData) {
        let episode = season.episodes.find(e => e.episodeNumber === epData.episodeNumber);
        if (!episode) {
            season.episodes.push({
                episodeNumber: epData.episodeNumber,
                title: epData.title,
                rating: epData.rating,
                released: epData.released,
                magnet: [],
            });
        } else {
            if (!episode.title) episode.title = epData.title;
            if (!episode.rating) episode.rating = epData.rating;
            if (!episode.released) episode.released = epData.released;
        }
    }
    season.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
}

// Enrich a single series doc. Options:
//   parallel: fetch all seasons concurrently (fast, for on-demand)
//   interSeasonDelayMs: delay between sequential fetches (for background batch)
//   maxSeasons: cap seasons fetched (defense against 30+ season shows on-demand)
const enrichOneSeries = async (show, { parallel = false, interSeasonDelayMs = 400, maxSeasons = Infinity } = {}) => {
    if (!ImdbService.isQuotaAvailable()) return false;

    const numSeasons = show.totalSeasons || show.seasons.length || 0;
    if (numSeasons === 0) return false;

    const targetSeasons = Math.min(numSeasons, maxSeasons);
    let anyEnriched = false;
    let allFetched = true;

    if (parallel) {
        const fetches = [];
        for (let s = 1; s <= targetSeasons; s++) {
            fetches.push(ImdbService.fetchSeasonEpisodes(show.imdb_code, s).then(data => ({ s, data })));
        }
        const results = await Promise.all(fetches);
        for (const { s, data } of results) {
            if (!data) { allFetched = false; continue; }
            mergeSeasonData(show, s, data);
            anyEnriched = true;
        }
    } else {
        for (let s = 1; s <= targetSeasons; s++) {
            if (!ImdbService.isQuotaAvailable()) { allFetched = false; break; }
            const data = await ImdbService.fetchSeasonEpisodes(show.imdb_code, s);
            if (!data) { allFetched = false; continue; }
            mergeSeasonData(show, s, data);
            anyEnriched = true;
            await new Promise((r) => setTimeout(r, interSeasonDelayMs));
        }
    }

    if (anyEnriched) {
        show.seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
        if (allFetched && targetSeasons === numSeasons) {
            show.episodesEnriched = true;
        }
        await show.save();
    }
    return anyEnriched;
};

// Background batch: enrich up to 10 un-enriched series (1 OMDB call per season)
const enrichSeriesEpisodes = async () => {
    const Movie = require('../models/Movie');

    const series = await Movie.find({
        contentType: 'series',
        imdb_code: { $ne: null, $ne: '' },
        episodesEnriched: { $ne: true },
    }).limit(10);

    if (series.length === 0) return;
    console.log(`Episode enrichment: ${series.length} series to process`);

    for (const show of series) {
        if (!ImdbService.isQuotaAvailable()) {
            console.log('Episode enrichment: OMDB quota exhausted');
            break;
        }
        const enriched = await enrichOneSeries(show, { parallel: false });
        if (enriched) {
            console.log(`  Enriched episodes: ${show.title} (${show.totalSeasons || show.seasons.length} seasons)`);
        }
    }
};

module.exports = { startContinuousSeeding, stopSeeding, enrichSeriesEpisodes, enrichOneSeries };
