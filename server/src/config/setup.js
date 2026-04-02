const axios = require('axios');
const Movie = require('../models/Movie');
const { asyncForEach } = require('../functions/back');
const imdb = require('imdb-api');
const Config = require('./Config');

const getImdbData = async (movie) => {
    return imdb.get(movie.imdb_code ? { id: movie.imdb_code } : { name: movie.title }, { apiKey: Config.imdb.apiKey }).then((data) => {
        if (!data) {
            throw 'There is not imdbcode for ' + movie.title;
        }
        if (data.type !== 'movie') {
            throw 'The movie is not a movie';
        }
        movie.title = data.title;
        movie.director = data.director ? data.director : '';
        movie.writer = data.writer ? data.writer : '';
        movie.imdb_code = data.imdbid ? data.imdbid : movie.imdb_code;
        movie.year = data.year;
        movie.rating = data.rating;
        movie.actors = data.actors ? data.actors : '';
        movie.country = data.country ? data.country : '';
        movie.genres = data.genres ? data.genres.split(',') : [];
        movie.summary = data.plot ? data.plot : '';
        movie.cover = data.poster ? data.poster : '';
        movie.runtime = data.runtime ? data.runtime : '';

        return movie;
    })
        .then(async (movie) => {
            await movie.save();
            console.log('\x1b[32m', movie.provider.toUpperCase(), ': Movie added!', '\x1b[0m');
            return Promise.resolve();
        })
        .catch((e) => {
            return Promise.reject(e);
        });
}

const saveEztv = async (data) => {
    try {
        const imdb_code = 'tt' + data.imdb_id;
        const magnet = data.magnet_url;
        const seeds = data.seeds ? data.seeds : 0;

        if (!imdb_code || !magnet) {
            return;
        }
        const findMovie = await Movie.findOne({ provider: 'eztv', imdb_code: imdb_code });
        if (!!findMovie) {
            if (findMovie.magnet.every((elem) => elem.magnet !== magnet)) {
                findMovie.magnet.push({
                    magnet,
                    seeds
                });
                await findMovie.save();
                console.log('\x1b[32m', 'EZTV: Magnet successfully added to the movie ', findMovie.title, '\x1b[0m')
            } else {
                console.log('\x1b[34m', 'EZTV: Movie already added.', '\x1b[0m');
            }
        } else {
            const movie = new Movie({
                provider: 'eztv',
                imdb_code,
                magnet: [{
                    magnet,
                    seeds
                }]
            });
            await getImdbData(movie);
        }
    } catch (e) {
        if (e.statusCode && e.statusCode === 401) {
            return Promise.reject('Free IMDB API quota limit reached');
        }
        console.error('\x1b[31m', 'EZTV Error: ', e, '\x1b[0m');
    }
}

const saveYts = async (data) => {
    if (!data.torrents) {
        return;
    }
    const findMovie = await Movie.findOne({ provider: 'yts', imdb_code: data.imdb_code });
    if (!findMovie) {
        const movie = new Movie({
            provider: 'yts',
            imdb_code: data.imdb_code,
            title: data.title,
            torrent: data.torrents
        });
        try {
            await getImdbData(movie);
        } catch (e) {
            if (e.statusCode && e.statusCode === 401) {
                return Promise.reject('Free IMDB API quota limit reached');
            }
            console.error('\x1b[31m', 'YTS Error: ', e, '\x1b[0m');
        }
    } else {
        console.log('\x1b[34m', 'YTS: Movie already added.', '\x1b[0m')
    }
}

const downloadMovieData = async (page, provider) => {
    const url = provider === 'yts'
        ? 'https://ytss.unblocked.is/api/v2/list_movies.json?limit=100&page='
        : 'https://eztv1.unblocked.is/api/get-torrents?limit=100&page=';

    try {
        const response = await axios.get(url + page);
        const body = response.data;

        if (provider === 'yts' ? !body.data : !body.torrents) {
            return;
        }

        const movies = provider === 'yts' ? body.data.movies : body.torrents;

        if (!movies) {
            return;
        }

        await asyncForEach(movies, async (movie) => {
            if (provider === 'yts') {
                await saveYts(movie);
            } else {
                await saveEztv(movie);
            }
        });

        await downloadMovieData(page + 1, provider);
    } catch (e) {
        console.error('\x1b[31m', 'An error occured in provider ' + provider + ' :\n' + e, '\x1b[0m');
    }
}

const importMovies = async () => {
    try {
        const providers = ['yts', 'eztv'];

        providers.forEach((provider) => {
            downloadMovieData(1, provider).then(() => {
                console.log('\x1b[32m', provider + ' successfully set up !', '\x1b[0m');
            }).catch((e) => {
                console.error('\x1b[31m', 'An error occured in provider ' + provider + ' :\n' + e, '\x1b[0m');
            });
        });
    } catch (e) {
        console.log(e);
    }
};

module.exports = importMovies;
