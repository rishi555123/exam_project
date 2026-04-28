const express = require('express');
const path = require('path');
const adminRoutes = require('./routes/adminRoutes');
const app = express();

// Set View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', adminRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`GRIET Structured EMS running on http://localhost:${PORT}`);
});