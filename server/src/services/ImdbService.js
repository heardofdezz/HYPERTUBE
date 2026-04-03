const imdb = require('imdb-api');
const Config = require('../config/Config');

const cache = new Map();
const MAX_CACHE_SIZE = 1000;

function cacheSet(key, value) {
    if (cache.size >= MAX_CACHE_SIZE) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
    }
    cache.set(key, value);
}

function cacheGet(key) {
    if (!cache.has(key)) return null;
    const value = cache.get(key);
    cache.delete(key);
    cache.set(key, value);
    return value;
}

// Extract a clean searchable name from a torrent title
function extractSearchName(raw) {
    let name = raw;

    // Remove season/episode markers and everything after
    name = name.replace(/\s*S\d{1,2}(E\d{1,2})?.*$/i, '');

    // Remove year and everything after it (but capture the year)
    const yearMatch = name.match(/^(.+?)\s+((?:19|20)\d{2})\b/);
    if (yearMatch) {
        name = yearMatch[1];
    }

    // Remove common noise words
    name = name
        .replace(/\b(Complete|Season|Series|COMPLETE|Full|Episodes?)\b/gi, '')
        .replace(/\b(English|Dubbed|Subbed|DUAL|MULTi)\b/gi, '')
        .replace(/\b(NF|WEB|HD|UHD|DD5?|AAC5?|H\s*264|H\s*265|10bits?)\b/gi, '')
        .replace(/[^a-zA-Z0-9\s:'-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    return name;
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

async function enrichByTitle(rawTitle) {
    if (!rawTitle || !Config.imdb.apiKey) return null;

    const searchName = extractSearchName(rawTitle);
    if (!searchName || searchName.length < 2) return null;

    const cacheKey = `title:${searchName.toLowerCase()}`;
    const cached = cacheGet(cacheKey);
    if (cached) return cached;

    try {
        const data = await imdb.get({ name: searchName }, { apiKey: Config.imdb.apiKey });
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

module.exports = { enrichByImdbCode, enrichByTitle, extractSearchName };
