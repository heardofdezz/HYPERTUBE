const express = require('express');
const router = new express.Router();
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { pipeline } = require('stream/promises');
const mime = require('mime').default || require('mime');
const torrentStream = require('torrent-stream');
const srt2vtt = require('srt-to-vtt');
const download = require('download');
const OS = require('opensubtitles-api');
const Config = require('../config/Config');
const Movie = require('../models/Movie');
const { showMovie } = require('../functions/movie');
const { enrichOneSeries } = require('../config/setup');
const ImdbService = require('../services/ImdbService');
const { expensiveLimiter } = require('../middleware/rateLimit');

const SUBTITLES_DIR = path.resolve(__dirname, 'subtitles');

const OpenSubtitles = new OS({
    useragent: Config.opensubtitles.useragent,
    username: Config.opensubtitles.username,
    password: Config.opensubtitles.password,
    ssl: true
});

// Active torrent sessions — keyed by movie ID
const sessions = new Map();

// Idle session eviction — drop torrent engines that haven't been touched
// in a while so a long-running PM2 process doesn't grow unbounded.
const SESSION_IDLE_MS = 30 * 60 * 1000; // 30 minutes
const SESSION_SWEEP_MS = 5 * 60 * 1000;  // 5 minutes

function touchSession(session) {
    session.lastAccess = Date.now();
}

function destroySession(sessionKey, session) {
    if (session.progressInterval) {
        clearInterval(session.progressInterval);
        session.progressInterval = null;
    }
    if (session.engine) {
        try { session.engine.destroy(); } catch (e) {}
        session.engine = null;
    }
    sessions.delete(sessionKey);
}

function sweepIdleSessions() {
    const cutoff = Date.now() - SESSION_IDLE_MS;
    for (const [key, session] of sessions) {
        if ((session.lastAccess || 0) < cutoff) {
            destroySession(key, session);
            console.log(`Evicted idle session: ${key}`);
        }
    }
}

setInterval(sweepIdleSessions, SESSION_SWEEP_MS).unref();

// Public trackers for faster peer discovery
const TRACKERS = [
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://open.stealth.si:80/announce',
    'udp://tracker.torrent.eu.org:451/announce',
    'udp://open.demonii.com:1337/announce',
    'udp://exodus.desync.com:6969/announce',
    'udp://tracker.cyberia.is:6969/announce',
    'udp://tracker.moeking.me:6969/announce',
];

function addTrackersToMagnet(magnet) {
    const trackerParams = TRACKERS.map(t => `&tr=${encodeURIComponent(t)}`).join('');
    return magnet.includes('&tr=') ? magnet : magnet + trackerParams;
}

// Find the best magnet for a movie/episode
function pickMagnet(magnets, preferredQuality) {
    if (!magnets || magnets.length === 0) return null;
    // If quality preference, try to match it
    if (preferredQuality) {
        const match = magnets.filter(m => m.quality === preferredQuality);
        if (match.length > 0) return match.sort((a, b) => (b.seeds || 0) - (a.seeds || 0))[0].magnet;
    }
    // Fall back to highest seeds
    return magnets.sort((a, b) => (b.seeds || 0) - (a.seeds || 0))[0].magnet;
}

function findBestMagnet(movie, seasonNum, episodeNum, quality) {
    if (movie.contentType === 'series' && seasonNum != null) {
        const season = movie.seasons.find(s => s.seasonNumber === seasonNum);
        if (season) {
            if (episodeNum != null) {
                const episode = season.episodes.find(e => e.episodeNumber === episodeNum);
                const m = pickMagnet(episode?.magnet, quality);
                if (m) return m;
            }
            const m = pickMagnet(season.magnet, quality);
            if (m) return m;
        }
        const m = pickMagnet(movie.seriesMagnet, quality);
        if (m) return m;
    }

    return pickMagnet(movie.magnet.filter(m => m.magnet), quality);
}

// Start or get a torrent session
async function getOrCreateSession(movieId, seasonNum, episodeNum, quality) {
    const sessionKey = seasonNum != null
        ? `${movieId}:S${seasonNum}E${episodeNum || 0}`
        : movieId;

    if (sessions.has(sessionKey)) {
        const existing = sessions.get(sessionKey);
        touchSession(existing);
        return existing;
    }

    const movie = await Movie.findById(movieId);
    if (!movie) throw new Error('Movie not found');

    // If already downloaded, return disk path
    if (movie.isDownloaded && movie.filePath && seasonNum == null) {
        try {
            const stat = fs.statSync(movie.filePath);
            const session = {
                status: 'ready',
                file: null,
                filePath: movie.filePath,
                fileSize: stat.size,
                fileName: path.basename(movie.filePath),
                downloaded: stat.size,
                speed: 0,
                peers: 0,
                progress: 1,
                movie,
                lastAccess: Date.now(),
                progressInterval: null,
            };
            sessions.set(sessionKey, session);
            return session;
        } catch (e) {
            movie.isDownloaded = false;
            movie.filePath = undefined;
            await movie.save();
        }
    }

    const bestMagnet = findBestMagnet(movie, seasonNum, episodeNum, quality);
    if (!bestMagnet) throw new Error('No magnet links available for this content');

    const magnetWithTrackers = addTrackersToMagnet(bestMagnet);

    const downloadPath = path.join(__dirname, '..', '..', 'downloads');
    if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
    }

    const session = {
        status: 'connecting',
        engine: null,
        file: null,
        filePath: null,
        fileSize: 0,
        fileName: '',
        downloaded: 0,
        speed: 0,
        peers: 0,
        progress: 0,
        movie,
        lastAccess: Date.now(),
        progressInterval: null,
    };
    sessions.set(sessionKey, session);

    const engine = torrentStream(magnetWithTrackers, {
        path: downloadPath,
        connections: 100,
        uploads: 10,
        verify: true,
    });
    session.engine = engine;

    engine.on('ready', () => {
        const videoExts = ['.mp4', '.mkv', '.avi', '.webm', '.mov'];
        let videoFile = null;
        let maxSize = 0;

        engine.files.forEach((file) => {
            const ext = path.extname(file.name).toLowerCase();
            if (videoExts.includes(ext) && file.length > maxSize) {
                videoFile = file;
                maxSize = file.length;
            }
        });

        if (!videoFile) {
            session.status = 'error';
            session.error = 'No video file found in torrent';
            engine.destroy();
            return;
        }

        engine.files.forEach((file) => {
            if (file === videoFile) file.select();
            else file.deselect();
        });

        session.file = videoFile;
        session.fileSize = videoFile.length;
        session.fileName = videoFile.name;
        session.filePath = path.join(downloadPath, videoFile.path);
        session.status = 'buffering';

        movie.filePath = session.filePath;
        movie.save().catch(() => {});
    });

    // Track download progress
    let lastBytes = 0;
    session.progressInterval = setInterval(() => {
        if (!session.engine || session.status === 'ready' || session.status === 'error') {
            clearInterval(session.progressInterval);
            session.progressInterval = null;
            return;
        }
        const swarm = engine.swarm;
        session.peers = swarm ? swarm.wires.length : 0;
        session.downloaded = swarm ? swarm.downloaded : 0;
        session.speed = session.downloaded - lastBytes;
        lastBytes = session.downloaded;

        if (session.fileSize > 0) {
            session.progress = Math.min(session.downloaded / session.fileSize, 1);
        }

        // Consider ready once we have 2MB buffered or 2% of file
        const bufferThreshold = Math.min(2 * 1024 * 1024, session.fileSize * 0.02);
        if (session.status === 'buffering' && session.downloaded >= bufferThreshold) {
            session.status = 'ready';
            console.log(`Stream ready: ${movie.title} (${session.peers} peers, ${formatBytes(session.downloaded)} buffered)`);
        }
    }, 1000);

    engine.on('idle', async () => {
        session.status = 'ready';
        session.progress = 1;
        try {
            movie.isDownloaded = true;
            await movie.save();
            console.log(`Download complete: ${movie.title}`);
        } catch (e) {}
    });

    engine.on('error', (err) => {
        console.error('Torrent error:', err.message);
        session.status = 'error';
        session.error = err.message;
    });

    return session;
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(2) + ' GB';
}

// --- ROUTES ---

router.get('/categories', async (req, res) => {
    try {
        const categoriesArrays = await Movie.find({}, 'genres');
        if (!categoriesArrays) {
            return res.status(404).json({ error: 'No categories found' });
        }
        const categories = [];
        categoriesArrays.forEach((categoriesArray) => {
            categoriesArray.genres.forEach((category) => {
                category = category.toLowerCase();
                if (!categories.includes(category) && category !== 'n/a') {
                    categories.push(category);
                }
            });
        });
        res.json(categories);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

const DEFAULT_BUFFER_TARGET = 2 * 1024 * 1024;

function computeBufferTarget(fileSize) {
    // Mirror the readiness threshold used in getOrCreateSession's progressInterval
    return fileSize > 0 ? Math.min(DEFAULT_BUFFER_TARGET, fileSize * 0.02) : DEFAULT_BUFFER_TARGET;
}

// Start preparing a stream (call before /stream to pre-buffer)
router.get('/prepare/:id', expensiveLimiter, async (req, res) => {
    try {
        const seasonNum = req.query.season != null ? Number(req.query.season) : undefined;
        const episodeNum = req.query.episode != null ? Number(req.query.episode) : undefined;
        const quality = req.query.quality || undefined;
        const session = await getOrCreateSession(req.params.id, seasonNum, episodeNum, quality);
        res.json({
            status: session.status,
            progress: session.progress,
            downloaded: session.downloaded,
            downloadedFormatted: formatBytes(session.downloaded),
            fileSize: session.fileSize,
            fileSizeFormatted: formatBytes(session.fileSize),
            speed: session.speed,
            speedFormatted: formatBytes(session.speed) + '/s',
            peers: session.peers,
            fileName: session.fileName,
            bufferTarget: computeBufferTarget(session.fileSize),
            error: session.error || null,
        });
    } catch (e) {
        res.status(404).json({ error: e.message });
    }
});

// Stream the video (only works once status is 'ready')
router.get('/stream/:id', async (req, res) => {
    try {
        const seasonNum = req.query.season != null ? Number(req.query.season) : undefined;
        const episodeNum = req.query.episode != null ? Number(req.query.episode) : undefined;
        const quality = req.query.quality || undefined;
        const session = await getOrCreateSession(req.params.id, seasonNum, episodeNum, quality);

        if (session.status === 'error') {
            return res.status(500).json({ error: session.error || 'Stream failed' });
        }

        if (session.status !== 'ready') {
            return res.status(202).json({ error: 'Still buffering', status: session.status });
        }

        const mimeType = mime.getType(session.fileName) || 'video/mp4';

        // Serve from disk if fully downloaded
        if (session.filePath && session.progress >= 1) {
            return showMovie(req, res, session.fileSize, mimeType, session.filePath);
        }

        // Serve from torrent stream
        if (session.file) {
            return showMovie(req, res, session.fileSize, mimeType, session.file);
        }

        res.status(500).json({ error: 'No stream source available' });
    } catch (e) {
        console.error('Stream error:', e);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to stream' });
        }
    }
});

// Get movie/series info
router.get('/movie/:id', async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        // On-demand episode enrichment: if a user opens a freshly-ingested series,
        // fetch OMDB episode titles/ratings/dates synchronously so they don't see bare numbers.
        // Parallel fetch, capped at 20 seasons to bound latency and quota use.
        if (
            movie.contentType === 'series' &&
            !movie.episodesEnriched &&
            movie.imdb_code &&
            ImdbService.isQuotaAvailable()
        ) {
            try {
                await enrichOneSeries(movie, { parallel: true, maxSeasons: 20 });
            } catch (e) {
                // Non-fatal — fall back to whatever metadata we already have
                console.warn('On-demand enrichment failed:', e.message);
            }
        }

        const obj = movie.toObject();

        // Indicate magnet availability
        obj.hasMagnet = (obj.magnet && obj.magnet.length > 0) ||
            (obj.seasons && obj.seasons.some(s => s.magnet.length > 0 || s.episodes.some(e => e.magnet.length > 0))) ||
            (obj.seriesMagnet && obj.seriesMagnet.length > 0);

        obj.bestSeeds = obj.magnet && obj.magnet.length > 0
            ? Math.max(...obj.magnet.map(m => m.seeds || 0))
            : 0;

        // For series, include seasons with episode metadata + quality options
        if (obj.contentType === 'series' && obj.seasons) {
            obj.seasons = obj.seasons.map(s => ({
                seasonNumber: s.seasonNumber,
                episodeCount: s.episodeCount || s.episodes?.length || 0,
                hasMagnet: s.magnet && s.magnet.length > 0,
                qualities: [...new Set((s.magnet || []).map(m => m.quality).filter(Boolean))],
                episodes: (s.episodes || []).map(e => ({
                    episodeNumber: e.episodeNumber,
                    title: e.title || null,
                    rating: e.rating || null,
                    released: e.released || null,
                    hasMagnet: e.magnet && e.magnet.length > 0,
                    bestSeeds: e.magnet && e.magnet.length > 0
                        ? Math.max(...e.magnet.map(m => m.seeds || 0))
                        : 0,
                    qualities: [...new Set((e.magnet || []).map(m => m.quality).filter(Boolean))],
                })),
            }));
            obj.hasSeriesMagnet = obj.seriesMagnet && obj.seriesMagnet.length > 0;
        }

        // For movies, expose quality options
        if (obj.magnet && obj.magnet.length > 0) {
            obj.qualities = [...new Set(obj.magnet.map(m => m.quality).filter(Boolean))];
        }

        delete obj.magnet;
        delete obj.torrent;
        delete obj.seriesMagnet;
        res.json(obj);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch movie' });
    }
});

// Download one .srt and convert it to .vtt. Returns the public URL or
// undefined if anything fails — per-language failures must not abort the
// other language.
async function fetchAndConvertSubtitle(entry) {
    if (!entry || !entry.url || !entry.filename) return undefined;

    const srtName = path.basename(entry.filename);
    const srtPath = path.join(SUBTITLES_DIR, srtName);
    const vttName = path.basename(srtName, '.srt') + '.vtt';
    const vttPath = path.join(SUBTITLES_DIR, vttName);

    try {
        await download(entry.url, SUBTITLES_DIR);
        await fsp.stat(srtPath);
        // Await the conversion so the .vtt file is on disk before we
        // hand the URL to the client (the previous fire-and-forget
        // pipe could 404 on the very next request).
        await pipeline(
            fs.createReadStream(srtPath),
            srt2vtt(),
            fs.createWriteStream(vttPath),
        );
        return '/subtitles-file/' + vttName;
    } catch (err) {
        console.error(`Subtitle conversion failed for ${srtName}:`, err.message);
        return undefined;
    }
}

router.get('/subtitles/:id', expensiveLimiter, async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        const season = req.query.season != null ? Number(req.query.season) : undefined;
        const episode = req.query.episode != null ? Number(req.query.episode) : undefined;

        const searchParams = {
            sublanguageid: ['fre', 'eng'].join(),
            extensions: 'srt',
            limit: 'all',
            imdbid: movie.imdb_code,
        };
        if (Number.isFinite(season)) searchParams.season = season;
        if (Number.isFinite(episode)) searchParams.episode = episode;

        let subtitles;
        try {
            subtitles = await OpenSubtitles.search(searchParams);
        } catch (err) {
            console.error('Subtitle search failed:', err.message);
            return res.status(500).json({ error: 'Subtitle search failed' });
        }

        const enEntry = subtitles && subtitles.en && subtitles.en[0];
        const frEntry = subtitles && subtitles.fr && subtitles.fr[0];

        if (!enEntry && !frEntry) {
            return res.status(404).json({ error: 'No subtitles found' });
        }

        await fsp.mkdir(SUBTITLES_DIR, { recursive: true });

        const [en, fr] = await Promise.all([
            fetchAndConvertSubtitle(enEntry),
            fetchAndConvertSubtitle(frEntry),
        ]);

        return res.json({ en, fr });
    } catch (e) {
        console.error('Subtitles error:', e);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to fetch subtitles' });
        }
    }
});

router.get('/subtitles-file/:filename', (req, res) => {
    // Strip directory components and only serve .vtt out of SUBTITLES_DIR.
    // path.basename + extension allowlist + a final containment check defends
    // against `../`, encoded traversal, and absolute-path tricks.
    const safeName = path.basename(req.params.filename);
    if (path.extname(safeName).toLowerCase() !== '.vtt') {
        return res.status(400).json({ error: 'Invalid subtitle filename' });
    }

    const filePath = path.resolve(SUBTITLES_DIR, safeName);
    if (!filePath.startsWith(SUBTITLES_DIR + path.sep)) {
        return res.status(400).json({ error: 'Invalid subtitle filename' });
    }

    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'text/vtt');
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.status(404).json({ error: 'Subtitle file not found' });
    }
});

module.exports = router;
