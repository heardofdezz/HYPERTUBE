const { parseRange } = require('../functions/movie');

describe('parseRange', () => {
    const SIZE = 1000;

    it('parses bytes=0-499', () => {
        expect(parseRange('bytes=0-499', SIZE)).toEqual({ start: 0, end: 499 });
    });

    it('treats open-ended range as the rest of the file', () => {
        expect(parseRange('bytes=500-', SIZE)).toEqual({ start: 500, end: 999 });
    });

    it('clamps end past file size to size-1', () => {
        expect(parseRange('bytes=0-9999', SIZE)).toEqual({ start: 0, end: 999 });
    });

    it('rejects malformed range headers', () => {
        expect(parseRange('bytes=abc-def', SIZE)).toBeNull();
        expect(parseRange('items=0-100', SIZE)).toBeNull();
        expect(parseRange('bytes=0-100,200-300', SIZE)).toBeNull();
    });

    it('rejects suffix ranges', () => {
        expect(parseRange('bytes=-100', SIZE)).toBeNull();
    });

    it('rejects start past file size', () => {
        expect(parseRange('bytes=1000-1100', SIZE)).toBeNull();
    });

    it('rejects end before start', () => {
        expect(parseRange('bytes=500-200', SIZE)).toBeNull();
    });
});
