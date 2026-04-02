const Config = require('../config/Config');

describe('Config', () => {
    it('should export required configuration keys', () => {
        expect(Config).toHaveProperty('port');
        expect(Config).toHaveProperty('db');
        expect(Config).toHaveProperty('authentification');
        expect(Config).toHaveProperty('email');
        expect(Config).toHaveProperty('imdb');
        expect(Config).toHaveProperty('opensubtitles');
    });

    it('should default port to 8081', () => {
        expect(Config.port).toBe(8081);
    });

    it('should not contain hardcoded credentials', () => {
        expect(Config.authentification.jwtSecret).not.toBe('secret');
        expect(Config.db.uri).not.toContain('hypertube42');
    });
});
