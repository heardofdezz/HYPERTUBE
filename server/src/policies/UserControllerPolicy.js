// Schema validator checking data types and regex
const Joi = require('joi');

module.exports = {
    register(req, res, next) {
        const schema = Joi.object({
            email: Joi.string().email().required(),
            username: Joi.string().required(),
            lastname: Joi.string().required(),
            firstname: Joi.string().required(),
            password: Joi.string().required().min(8).max(64)
                .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"|,.<>/?]).{8,64}$/),
            created: Joi.date(),
        });
        const { error } = schema.validate(req.body);
        if (error) {
            switch (error.details[0].context.key) {
                case 'email':
                    res.status(400).send({
                        error: "Email isn't valid"
                    });
                    break;
                case 'password':
                    res.status(400).send({
                        error: 'Password must be 8-64 characters with at least one uppercase, one lowercase, one number, and one special character.'
                    });
                    break;
                default:
                    res.status(400).send({
                        error: 'Invalid Sign Up Information.'
                    });
            }
        } else {
            next();
        }
    },
    login(req, res, next) {
        const schema = Joi.object({
            email: Joi.string().email(),
            password: Joi.string()
        });
        const { error } = schema.validate(req.body);
        if (error) {
            switch (error.details[0].context.key) {
                case 'email':
                    res.status(400).send({
                        error: 'Email is not valid'
                    });
                    break;
                case 'password':
                    res.status(400).send({
                        error: 'Invalid password format'
                    });
                    break;
                default:
                    res.status(400).send({
                        error: 'Invalid information'
                    });
            }
        } else {
            next();
        }
    }
}
