const TorrentSearchApi = require('torrent-search-api');
const Config = require('../config/Config');

let initialized = false;

function init() {
    if (initialized) return;

    Config.torrent.providers.forEach((provider) => {
        try {
            TorrentSearchApi.enableProvider(provider);
            console.log(`Torrent provider enabled: ${provider}`);
        } catch (e) {
            console.warn(`Failed to enable torrent provider "${provider}":`, e.message);
        }
    });

    initialized = true;
}

async function search(query, category, limit) {
    if (!initialized) init();

    const searchLimit = limit || Config.torrent.defaultLimit;
    const searchCategory = category || 'All';

    const results = await Promise.race([
        TorrentSearchApi.search(query, searchCategory, searchLimit),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Torrent search timed out')), 15000)
        ),
    ]);

    // Resolve magnets for each result, skip failures
    const enriched = await Promise.allSettled(
        results.map(async (torrent) => {
            let magnet = '';
            try {
                magnet = await Promise.race([
                    TorrentSearchApi.getMagnet(torrent),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Magnet timeout')), 8000)
                    ),
                ]);
            } catch (_) {
                // Skip magnet resolution failure
            }

            return {
                title: torrent.title || '',
                seeds: Number(torrent.seeds) || 0,
                leeches: Number(torrent.peers) || 0,
                size: torrent.size || '',
                provider: torrent.provider || 'unknown',
                time: torrent.time || '',
                magnet,
            };
        })
    );

    return enriched
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value)
        .filter((r) => r.title);
}

function getActiveProviders() {
    return TorrentSearchApi.getActiveProviders();
}

module.exports = { init, search, getActiveProviders };
