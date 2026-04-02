const imdb = require('imdb-api');
const Config = require('../config/Config');

// Simple LRU cache with max size
const cache = new Map();
const MAX_CACHE_SIZE = 1000;

function cacheSet(key, value) {
    if (cache.size >= MAX_CACHE_SIZE) {
        // Delete oldest entry
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
    }
    cache.set(key, value);
}

function cacheGet(key) {
    if (!cache.has(key)) return null;
    // Move to end (most recent)
    const value = cache.get(key);
    cache.delete(key);
    cache.set(key, value);
    return value;
}

async function enrichByImdbCode(imdbCode) {
    if (!imdbCode || !Config.imdb.apiKey) return null;

    const cached = cacheGet(imdbCode);
    if (cached) return cached;

    try {
        const data = await imdb.get({ id: imdbCode }, { apiKey: Config.imdb.apiKey });
        if (!data) return null;

        const metadata = extractMetadata(data, imdbCode);
        cacheSet(imdbCode, metadata);
        return metadata;
    } catch (e) {
        if (e.statusCode === 401 || e.statusCode === 429) {
            console.warn('IMDB API rate limit reached');
        }
        return null;
    }
}

async function enrichByTitle(title) {
    if (!title || !Config.imdb.apiKey) return null;

    const cacheKey = `title:${title.toLowerCase()}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    try {
        const data = await imdb.get({ name: title }, { apiKey: Config.imdb.apiKey });
        if (!data) return null;

        const metadata = extractMetadata(data, data.imdbid);
        cacheSet(cacheKey, metadata);
        if (data.imdbid) cacheSet(data.imdbid, metadata);
        return metadata;
    } catch (e) {
        if (e.statusCode === 401 || e.statusCode === 429) {
            console.warn('IMDB API rate limit reached');
        }
        return null;
    }
}

function extractMetadata(data, imdbCode) {
    return {
        title: data.title || '',
        director: data.director || '',
        writer: data.writer || '',
        imdb_code: data.imdbid || imdbCode || '',
        year: data.year ? Number(data.year) : null,
        rating: data.rating ? Number(data.rating) : null,
        actors: data.actors || '',
        country: data.country || '',
        genres: data.genres ? data.genres.split(',').map((g) => g.trim()) : [],
        summary: data.plot || '',
        cover: data.poster || '',
        runtime: data.runtime || '',
    };
}

module.exports = { enrichByImdbCode, enrichByTitle };
