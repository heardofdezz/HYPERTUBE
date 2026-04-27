const fs = require('fs');
const pump = require('pump');

// Reject malformed/unsatisfiable Range headers with 416 instead of letting
// NaN start/end propagate into the response. Suffix ranges (`bytes=-N`) are
// not supported — clients that send them will get 416 and can retry without.
function parseRange(rangeHeader, size) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
    if (!match) return null;

    const start = parseInt(match[1], 10);
    let end = match[2] === '' ? size - 1 : parseInt(match[2], 10);

    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    if (start < 0 || start >= size || end < start) return null;

    if (end >= size) end = size - 1;
    return { start, end };
}

const showMovie = (req, res, size, mimeType, streamSource) => {
    let start = 0;
    let end = size - 1;

    if (req.headers.range) {
        const range = parseRange(req.headers.range, size);
        if (!range) {
            res.writeHead(416, {
                'Content-Range': `bytes */${size}`,
                'Content-Type': 'text/plain',
            });
            return res.end('Range Not Satisfiable');
        }
        start = range.start;
        end = range.end;
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': mimeType,
        });
    } else {
        res.writeHead(200, {
            'Content-Length': size,
            'Content-Type': mimeType,
            'Accept-Ranges': 'bytes',
        });
    }

    if (typeof streamSource === 'string') {
        // File path — stream from disk
        const stream = fs.createReadStream(streamSource, { start, end });
        pump(stream, res);
    } else {
        // Torrent file object — use createReadStream
        const stream = streamSource.createReadStream({ start, end });
        pump(stream, res);
    }
};

module.exports = { showMovie, parseRange };
