const fs = require('fs');
const pump = require('pump');

const showMovie = (req, res, size, mimeType, streamSource) => {
    let start = 0;
    let end = size - 1;

    if (req.headers.range) {
        const bytes = req.headers.range.replace(/bytes=/, '').split('-');
        start = parseInt(bytes[0], 10);
        if (bytes[1]) {
            end = parseInt(bytes[1], 10);
        }
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

module.exports = { showMovie };
