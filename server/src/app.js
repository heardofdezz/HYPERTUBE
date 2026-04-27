require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const Config = require('./config/Config');
const app = express();
const TorrentSearchService = require('./services/TorrentSearchService');
const { startContinuousSeeding, enrichSeriesEpisodes } = require('./config/setup');
const movieRouter = require('./routers/movie');
const commentRouter = require('./routers/comment');
const { apiLimiter } = require('./middleware/rateLimit');

// Behind nginx — trust a single proxy hop so req.ip reflects the real client
// (required for accurate per-IP rate limiting via X-Forwarded-For).
app.set('trust proxy', 1);

// Disable CSP at the API layer — this server returns JSON, video, and VTT
// (no HTML), so a CSP here adds noise without protection. The CSP that
// matters is set by nginx on the SPA's index.html.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(apiLimiter);

// CORS: restrict to known origins
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:8080').split(',');
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Application routes
require('./routes')(app);

// Connecting to Mongo Database when connected then launching back-end Server
mongoose.connect(Config.db.uri).then(() => {
    // Initialize torrent search providers
    TorrentSearchService.init();

    // Continuous background seeding — cycles through queries endlessly
    startContinuousSeeding();

    // Enrich series episodes every 30 minutes
    enrichSeriesEpisodes().catch(() => {});
    setInterval(() => enrichSeriesEpisodes().catch(() => {}), 30 * 60 * 1000);

    app.use(movieRouter);
    app.use(commentRouter);
    app.listen(Config.port, () => {
        console.log(`listening server side on ${Config.port} Connected to Mongo/Mongoose Database`);
    });
}).catch((err) => {
    console.log(err);
});
