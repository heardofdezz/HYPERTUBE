/// Configuration file for the database, ENV, PORT, & ETC..


module.exports = {
    port: process.env.PORT || 8081,
    db: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hypertube'
    },
    email: {
        user: process.env.EMAIL_USER || '',
        password: process.env.EMAIL_PASSWORD || ''
    },
    imdb: {
        apiKey: process.env.IMDB_API_KEY || ''
    },
    opensubtitles: {
        useragent: process.env.OPENSUBTITLES_USERAGENT || 'TemporaryUserAgent',
        username: process.env.OPENSUBTITLES_USERNAME || '',
        password: process.env.OPENSUBTITLES_PASSWORD || ''
    },
    torrent: {
        providers: (process.env.TORRENT_PROVIDERS || '1337x,ThePirateBay,Yts').split(',').map(s => s.trim()),
        defaultLimit: Number(process.env.TORRENT_SEARCH_LIMIT) || 20,
        cacheTTLHours: Number(process.env.TORRENT_CACHE_TTL_HOURS) || 24,
    }
}
