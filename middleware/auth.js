// middleware/auth.js
// Simple session-based admin auth
// Set ADMIN_USERNAME and ADMIN_PASSWORD in your Render environment variables

const isLoggedIn = (req, res, next) => {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.redirect('/login');
};

module.exports = { isLoggedIn };