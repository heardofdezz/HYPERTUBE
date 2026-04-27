const rateLimit = require('express-rate-limit');

// Generous global limiter — applied to all routes. Sized to accommodate
// browsers issuing many Range requests against /stream during playback.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1500,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please slow down.' },
});

// Tight limiter for endpoints that hit external APIs or spawn torrent
// sessions (search, prepare, subtitles). Each call is expensive and easy
// to abuse to exhaust OMDB quota or peer connections.
const expensiveLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests for this endpoint, please wait.' },
});

module.exports = { apiLimiter, expensiveLimiter };
