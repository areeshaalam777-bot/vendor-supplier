function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  // If request expects JSON or is under /api routes
  const isApi = (req.originalUrl && req.originalUrl.startsWith('/api')) ||
                (req.baseUrl && req.baseUrl.startsWith('/api')) ||
                req.path.startsWith('/api') ||
                req.xhr ||
                (req.headers.accept && req.headers.accept.includes('application/json'));

  if (isApi) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
  }

  // Otherwise redirect to login page for browser navigation
  return res.redirect('/login.html');
}

module.exports = requireAuth;
