// Vercel Entry Point
const app = require('../server');

module.exports = (req, res) => {
    app(req, res);
};
