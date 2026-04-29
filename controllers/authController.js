// controllers/authController.js

exports.getLogin = (req, res) => {
    if (req.session && req.session.isAdmin) return res.redirect('/');
    res.render('login', { error: null });
};

exports.postLogin = (req, res) => {
    const { username, password } = req.body;
    const validUser = process.env.ADMIN_USERNAME || 'admin';
    const validPass = process.env.ADMIN_PASSWORD || 'griet@2024';

    if (username === validUser && password === validPass) {
        req.session.isAdmin = true;
        res.redirect('/');
    } else {
        res.render('login', { error: 'Invalid credentials. Try again.' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/login');
};