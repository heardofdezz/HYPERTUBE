require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const Config = require('./config/Config');
const app = express();
const TorrentSearchService = require('./services/TorrentSearchService');
const { seedMovies } = require('./config/setup');
const movieRouter = require('./routers/movie');
const commentRouter = require('./routers/comment');

app.use(morgan('combined'));
app.use(bodyParser.json());

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

    // Fire-and-forget background seeding (enriches inline via OMDB)
    seedMovies().catch((e) => console.error('Seeder error:', e));

    app.use(movieRouter);
    app.use(commentRouter);
    app.listen(Config.port, () => {
        console.log(`listening server side on ${Config.port} Connected to Mongo/Mongoose Database`);
    });
}).catch((err) => {
    console.log(err);
});
