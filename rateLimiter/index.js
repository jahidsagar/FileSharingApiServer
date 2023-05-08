const rateLimit = require('express-rate-limit');
// Set upload/download rate limit
const limiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: process.env.MAX_REQUEST_LIMIT || 4, // limit each IP to 100 requests per windowMs
    message: 'Daily upload/download limit exceeded'
});

module.exports = {
    limiter
}