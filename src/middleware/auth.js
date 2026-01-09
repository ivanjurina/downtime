// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    req.session.returnTo = req.originalUrl;
    res.redirect('/login');
}

// Middleware to check if user is NOT authenticated (for login/register pages)
function isGuest(req, res, next) {
    if (req.session && req.session.userId) {
        return res.redirect('/dashboard');
    }
    next();
}

// Middleware to add user to all views
function addUserToViews(req, res, next) {
    res.locals.user = req.session.user || null;
    res.locals.isAuthenticated = !!req.session.userId;
    next();
}

module.exports = {
    isAuthenticated,
    isGuest,
    addUserToViews
};
