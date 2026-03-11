const AppError = require('../utils/AppError');

/**
 * Joi validation middleware factory
 * Usage: validate(schema) where schema has .body / .query / .params
 */
const validate = (schema) => {
    return (req, res, next) => {
        const targets = ['body', 'query', 'params'];
        for (const target of targets) {
            if (schema[target]) {
                const { error, value } = schema[target].validate(req[target], { abortEarly: false, stripUnknown: true });
                if (error) {
                    const messages = error.details.map((d) => d.message).join(', ');
                    return next(new AppError(messages, 400));
                }
                req[target] = value;
            }
        }
        next();
    };
};

module.exports = { validate };
