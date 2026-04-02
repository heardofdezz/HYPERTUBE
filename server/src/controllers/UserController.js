const jwt = require('jsonwebtoken');
const config = require('../config/Config');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/User');
const sendEmail = require('gmail-send')({ user: config.email.user, pass: config.email.password });
const randomString = require('randomstring');

function jwtSignUser(user) {
    const ONE_WEEK = 60 * 60 * 24 * 7;
    return jwt.sign(user, config.authentification.jwtSecret, {
        expiresIn: ONE_WEEK
    });
}

module.exports = {
    async register(req, res, next) {
        try {
            const user = await User.create({
                _id: mongoose.Types.ObjectId(),
                email: req.body.email,
                username: req.body.username,
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                password: req.body.password,
                admin: null,
                premium: null,
                verify: null,
                verify_token: randomString.generate(20)
            });
            sendEmail({
                to: user.email,
                from: 'Hypertube Stream',
                subject: 'Account Activation',
                html: '<h1>Click to Activate your account!</h1><p><a href="http://localhost:8081/verify/'
                    + user.verify_token + '">click here !</a></p>',
            });
            const userJson = user.toJSON();
            res.json({
                user: userJson,
                token: jwtSignUser(userJson)
            });
        } catch (err) {
            console.error(err);
            res.status(400).json({
                error: 'This email is already being used'
            });
        }
    },
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(403).json({
                    error: 'Wrong login information'
                });
            }
            if (bcrypt.compareSync(password, user.password)) {
                const userJson = user.toJSON();
                res.json({
                    user: userJson,
                    token: jwtSignUser(userJson)
                });
            } else {
                return res.status(403).json({
                    error: 'Wrong login information'
                });
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({
                error: 'An error has occurred trying to login'
            });
        }
    },
    async verify(req, res, next) {
        try {
            const user = await User.findOne({ verify_token: req.params.token });
            if (!user) {
                return res.status(404).json({ error: 'Invalid verification token' });
            }
            user.verify = true;
            user.verify_token = undefined;
            await user.save();
            res.json({ message: 'Account verified successfully' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Verification failed' });
        }
    }
};
