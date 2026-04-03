const MovieController = require('./controllers/MovieController');
const SearchController = require('./controllers/SearchController');

module.exports = (app) => {
    app.get('/movies', MovieController.MoviesIndex);

    app.get('/search', SearchController.search);
};
