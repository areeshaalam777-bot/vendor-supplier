function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  // If request expects JSON (API calls)
  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json')) || req.path.startsWith('/api')) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
  }

  // Otherwise redirect to login page for browser navigation
  return res.redirect('/login.html');
}

module.exports = requireAuth;
