const express = require('express');
const router = new express.Router();
const Movie = require('../models/Movie');

// Basic HTML tag stripping to prevent XSS in stored comments
function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>]/g, '');
}

router.post('/comment/:id', async (req, res) => {
    try {
        const content = req.body ? sanitize(req.body.content) : undefined;
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        const update = await Movie.updateOne({ _id: req.params.id }, { $push: { 'comments': { content } } });
        if (update.modifiedCount === 0) {
            res.status(404).json({ error: 'Movie not found' });
        } else {
            res.json({ success: true });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

module.exports = router;
