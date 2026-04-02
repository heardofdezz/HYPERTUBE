const express = require('express');
const router = new express.Router();
const Movie = require('../models/Movie');
const User = require('../models/User');

// Basic HTML tag stripping to prevent XSS in stored comments
function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>]/g, '');
}

router.post('/comment/:id', async (req, res) => {
    try {
        const user = req.body ? req.body.user : undefined;
        const content = req.body ? sanitize(req.body.content) : undefined;
        if (!user || !content) {
            return res.status(400).json({ error: 'User and content are required' });
        }
        const userExists = await User.findById(user, '_id');
        if (!userExists) {
            return res.status(404).json({ error: 'User not found' });
        }
        const update = await Movie.updateOne({ _id: req.params.id }, { $push: { 'comments': { user, content } } });
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
