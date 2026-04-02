const express = require('express');
const router = new express.Router();
const path = require('path');
const fs = require('fs');
const srt2vtt = require('srt-to-vtt');
const download = require('download');
const OS = require('opensubtitles-api');
const Config = require('../config/Config');
const Movie = require('../models/Movie');

const OpenSubtitles = new OS({
    useragent: Config.opensubtitles.useragent,
    username: Config.opensubtitles.username,
    password: Config.opensubtitles.password,
    ssl: true
});

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
                const result = {
                    'en': undefined,
                    'fr': undefined
                };

                if (subtitles.en && subtitles.en[0]) {
                    download(subtitles.en[0].url, subtitlesPath)
                        .then(() => {
                            fs.stat(subtitlesPath + '/' + subtitles.en[0].filename, (err) => {
                                if (err === null) {
                                    result.en = '/' + path.basename(subtitles.en[0].filename, '.srt') + '.vtt';
                                    fs.createReadStream(subtitlesPath + '/' + subtitles.en[0].filename).pipe(srt2vtt()).pipe(fs.createWriteStream(subtitlesPath + result.en));
                                }

                                if (subtitles.fr && subtitles.fr[0].url) {
                                    download(subtitles.fr[0].url, subtitlesPath)
                                        .then(() => {
                                            fs.stat(subtitlesPath + '/' + subtitles.fr[0].filename, (err) => {
                                                if (err === null) {
                                                    result.fr = '/' + path.basename(subtitles.fr[0].filename, '.srt') + '.vtt';
                                                    fs.createReadStream(subtitlesPath + '/' + subtitles.fr[0].filename).pipe(srt2vtt()).pipe(fs.createWriteStream(subtitlesPath + result.fr));
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

module.exports = router;
