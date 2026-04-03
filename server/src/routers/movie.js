const express = require('express');
const router = new express.Router();
const path = require('path');
const fs = require('fs');
const mime = require('mime');
const torrentStream = require('torrent-stream');
const srt2vtt = require('srt-to-vtt');
const download = require('download');
const OS = require('opensubtitles-api');
const Config = require('../config/Config');
const Movie = require('../models/Movie');
const { showMovie } = require('../functions/movie');

const OpenSubtitles = new OS({
    useragent: Config.opensubtitles.useragent,
    username: Config.opensubtitles.username,
    password: Config.opensubtitles.password,
    ssl: true
});

// Active torrent engines — keyed by movie ID
const activeEngines = new Map();

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

// Stream a movie by ID
router.get('/stream/:id', async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        // If already downloaded, serve from disk
        if (movie.isDownloaded && movie.filePath) {
            try {
                const stat = fs.statSync(movie.filePath);
                const mimeType = mime.getType(movie.filePath) || 'video/mp4';
                return showMovie(req, res, stat.size, mimeType, movie.filePath);
            } catch (e) {
                // File no longer exists, re-download
                movie.isDownloaded = false;
                movie.filePath = undefined;
                await movie.save();
            }
        }

        // Get best magnet (highest seeds)
        const magnets = movie.magnet.filter(m => m.magnet);
        if (magnets.length === 0) {
            return res.status(404).json({ error: 'No magnet links available for this movie' });
        }
        const bestMagnet = magnets.sort((a, b) => (b.seeds || 0) - (a.seeds || 0))[0].magnet;

        // Check if engine is already running for this movie
        if (activeEngines.has(movie._id.toString())) {
            const cached = activeEngines.get(movie._id.toString());
            if (cached.file) {
                const mimeType = mime.getType(cached.file.name) || 'video/mp4';
                return showMovie(req, res, cached.file.length, mimeType, cached.file);
            }
        }

        // Start torrent engine
        const downloadPath = path.join(__dirname, '..', '..', 'downloads');
        if (!fs.existsSync(downloadPath)) {
            fs.mkdirSync(downloadPath, { recursive: true });
        }

        const engine = torrentStream(bestMagnet, { path: downloadPath });

        engine.on('ready', () => {
            // Find the largest video file
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
                engine.destroy();
                return res.status(404).json({ error: 'No video file found in torrent' });
            }

            // Select only the video file, deselect everything else
            engine.files.forEach((file) => {
                if (file === videoFile) {
                    file.select();
                } else {
                    file.deselect();
                }
            });

            // Cache the engine
            activeEngines.set(movie._id.toString(), { engine, file: videoFile });

            // Save file path for future direct serving
            movie.filePath = path.join(downloadPath, videoFile.path);
            movie.save().catch(() => {});

            const mimeType = mime.getType(videoFile.name) || 'video/mp4';
            showMovie(req, res, videoFile.length, mimeType, videoFile);
        });

        engine.on('idle', async () => {
            // Download complete
            try {
                movie.isDownloaded = true;
                await movie.save();
                console.log(`Download complete: ${movie.title}`);
            } catch (e) {}
        });

        engine.on('error', (err) => {
            console.error('Torrent engine error:', err.message);
            activeEngines.delete(movie._id.toString());
            if (!res.headersSent) {
                res.status(500).json({ error: 'Streaming failed' });
            }
        });

        // Clean up on client disconnect
        req.on('close', () => {
            // Don't destroy — keep downloading in background
        });

    } catch (e) {
        console.error('Stream error:', e);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to start stream' });
        }
    }
});

// Get movie info including magnet availability
router.get('/movie/:id', async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }
        const obj = movie.toObject();
        // Don't expose raw magnet links, but indicate availability
        obj.hasMagnet = obj.magnet && obj.magnet.length > 0;
        obj.bestSeeds = obj.magnet && obj.magnet.length > 0
            ? Math.max(...obj.magnet.map(m => m.seeds || 0))
            : 0;
        delete obj.magnet;
        delete obj.torrent;
        res.json(obj);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch movie' });
    }
});

router.get('/subtitles/:id', async (req, res) => {
    try {
        const movie = await Movie.findById(req.params.id);

        OpenSubtitles.search({
            sublanguageid: ['fre', 'eng'].join(),
            extensions: 'srt',
            limit: 'all',
            imdbid: movie.imdb_code
        })
            .then((subtitles) => {
                const subtitlesPath = path.join(__dirname, 'subtitles');
                if (!fs.existsSync(subtitlesPath)) {
                    fs.mkdirSync(subtitlesPath, { recursive: true });
                }
                const result = { en: undefined, fr: undefined };

                if (subtitles.en && subtitles.en[0]) {
                    download(subtitles.en[0].url, subtitlesPath)
                        .then(() => {
                            fs.stat(subtitlesPath + '/' + subtitles.en[0].filename, (err) => {
                                if (err === null) {
                                    result.en = '/subtitles-file/' + path.basename(subtitles.en[0].filename, '.srt') + '.vtt';
                                    fs.createReadStream(subtitlesPath + '/' + subtitles.en[0].filename).pipe(srt2vtt()).pipe(fs.createWriteStream(path.join(subtitlesPath, path.basename(subtitles.en[0].filename, '.srt') + '.vtt')));
                                }

                                if (subtitles.fr && subtitles.fr[0].url) {
                                    download(subtitles.fr[0].url, subtitlesPath)
                                        .then(() => {
                                            fs.stat(subtitlesPath + '/' + subtitles.fr[0].filename, (err) => {
                                                if (err === null) {
                                                    result.fr = '/subtitles-file/' + path.basename(subtitles.fr[0].filename, '.srt') + '.vtt';
                                                    fs.createReadStream(subtitlesPath + '/' + subtitles.fr[0].filename).pipe(srt2vtt()).pipe(fs.createWriteStream(path.join(subtitlesPath, path.basename(subtitles.fr[0].filename, '.srt') + '.vtt')));
                                                }
                                                res.json(result);
                                            });
                                        })
                                        .catch((err) => {
                                            console.error(err);
                                            res.json(result);
                                        });
                                } else {
                                    res.json(result);
                                }
                            });
                        })
                        .catch((err) => {
                            console.error(err);
                            res.status(500).json({ error: 'Failed to download subtitles' });
                        });
                } else {
                    res.status(404).json({ error: 'No subtitles found' });
                }
            })
            .catch((err) => {
                console.error(err);
                res.status(500).json({ error: 'Subtitle search failed' });
            });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch subtitles' });
    }
});

// Serve subtitle VTT files
router.get('/subtitles-file/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'subtitles', req.params.filename);
    if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'text/vtt');
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.status(404).json({ error: 'Subtitle file not found' });
    }
});

module.exports = router;
