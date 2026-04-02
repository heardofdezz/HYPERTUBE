const UserController = require('./controllers/UserController');
const UserControllerPolicy = require('./policies/UserControllerPolicy');
const MovieController = require('./controllers/MovieController');
const SearchController = require('./controllers/SearchController');

module.exports = (app) => {
    app.post('/register',
        UserControllerPolicy.register,
        UserController.register);

    app.post('/login',
        UserControllerPolicy.login,
        UserController.login);

    app.get('/verify/:token',
        UserController.verify);

    app.get('/movies', MovieController.MoviesIndex);

    app.get('/search', SearchController.search);
};
