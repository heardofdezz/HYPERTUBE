const imdb = require('imdb-api');
const Config = require('../config/Config');

// LRU cache
const cache = new Map();
const MAX_CACHE_SIZE = 1000;

// Daily rate limiter — OMDB free tier: 1,000 requests/day
const DAILY_LIMIT = 950; // Leave 50 buffer for user-triggered searches
let requestCount = 0;
let lastResetDate = new Date().toDateString();

function checkAndResetDaily() {
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
        requestCount = 0;
        lastResetDate = today;
        console.log('OMDB daily counter reset');
    }
}

function isQuotaAvailable() {
    checkAndResetDaily();
    return requestCount < DAILY_LIMIT;
}

function getQuotaRemaining() {
    checkAndResetDaily();
    return Math.max(0, DAILY_LIMIT - requestCount);
}

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

function extractSearchName(raw) {
    let name = raw;
    name = name.replace(/\s*S\d{1,2}(E\d{1,2})?.*$/i, '');
    const yearMatch = name.match(/^(.+?)\s+((?:19|20)\d{2})\b/);
    if (yearMatch) {
        name = yearMatch[1];
    }
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

    if (!isQuotaAvailable()) return null;

    try {
        requestCount++;
        const data = await imdb.get({ id: imdbCode }, { apiKey: Config.imdb.apiKey });
        if (!data) return null;

        const metadata = extractMetadata(data, imdbCode);
        cacheSet(imdbCode, metadata);
        return metadata;
    } catch (e) {
        if (e.statusCode === 401 || e.statusCode === 429) {
            console.warn(`OMDB rate limit hit (${requestCount}/${DAILY_LIMIT} used today)`);
            requestCount = DAILY_LIMIT; // Stop further attempts
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

    if (!isQuotaAvailable()) return null;

    try {
        requestCount++;
        const data = await imdb.get({ name: searchName }, { apiKey: Config.imdb.apiKey });
        if (!data) return null;

        const metadata = extractMetadata(data, data.imdbid);
        cacheSet(cacheKey, metadata);
        if (data.imdbid) cacheSet(data.imdbid, metadata);
        return metadata;
    } catch (e) {
        if (e.statusCode === 401 || e.statusCode === 429) {
            console.warn(`OMDB rate limit hit (${requestCount}/${DAILY_LIMIT} used today)`);
            requestCount = DAILY_LIMIT;
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

module.exports = { enrichByImdbCode, enrichByTitle, extractSearchName, isQuotaAvailable, getQuotaRemaining };
