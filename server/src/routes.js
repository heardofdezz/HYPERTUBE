const MovieController = require('./controllers/MovieController');
const SearchController = require('./controllers/SearchController');
const { expensiveLimiter } = require('./middleware/rateLimit');

module.exports = (app) => {
    app.get('/movies', MovieController.MoviesIndex);

    app.get('/search', expensiveLimiter, SearchController.search);
};
