const fs = require('fs');
const pump = require('pump');

const streamFile = (res, file, start, end, mimeType) => {
    if (mimeType === 'video/mp4') {
        let stream = file.createReadStream({
            start: start,
            end: end
        });
        pump(stream, res);
    }
}

const showMovie = (req, res, isDownloaded, size, mimeType, file) => {
    let start = 0;
    let end = size - 1;
    if (req.headers.range) {
        const bytes = req.headers.range.replace(/bytes=/, '').split('-');

        start = parseInt(bytes[0], 10);
        if (bytes[1]) {
            end = parseInt(bytes[1], 10);
        }
        res.writeHead(206, {
            'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
            'Accept-Ranges': 'bytes',
            'Content-Length': end - start + 1,
            'Content-Type': mimeType
        });
    } else {
        res.writeHead(200, {
            'Content-Length': size,
            'Content-Type': mimeType
        });
    }

    if (isDownloaded) {
        let stream = fs.createReadStream(file, {
            start,
            end
        });
        pump(stream, res);
    } else {
        streamFile(res, file, start, end, mimeType);
    }
}

module.exports = {
    showMovie
}
