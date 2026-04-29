// server.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session — set SESSION_SECRET in Render environment variables
app.use(session({
    secret: process.env.SESSION_SECRET || 'griet_ems_secret_change_this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only on Render
        httpOnly: true,
        maxAge: 8 * 60 * 60 * 1000 // 8 hours
    }
}));

// Routes
app.use('/', adminRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`GRIET EMS running on http://localhost:${PORT}`);
});