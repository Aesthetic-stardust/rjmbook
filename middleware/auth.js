// Authentication & Authorization Middleware

// Helper: detect API/AJAX requests and respond appropriately
function isApiRequest(req) {
  return req.xhr ||
    req.path.startsWith('/api/') ||
    (req.headers.accept && req.headers.accept.includes('application/json'));
}

function unauthorized(req, res, redirectUrl = '/login') {
  if (isApiRequest(req)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  res.redirect(redirectUrl);
}

function forbidden(req, res) {
  if (isApiRequest(req)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  res.status(403).render('error', { message: 'Access denied', error: 'You do not have permission to view this page.' });
}

// Any logged-in user
export function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  unauthorized(req, res);
}

// Admin only
export function isAdmin(req, res, next) {
  if (req.session && req.session.userId) {
    if (req.session.role === 'admin') return next();
    return forbidden(req, res);
  }
  unauthorized(req, res);
}

// Staff or Admin
export function isStaff(req, res, next) {
  if (req.session && req.session.userId) {
    if (req.session.role === 'staff' || req.session.role === 'admin') return next();
    return forbidden(req, res);
  }
  unauthorized(req, res);
}

// Guest (regular user) only
export function isGuest(req, res, next) {
  if (req.session && req.session.userId) {
    if (req.session.role === 'user') return next();
    return forbidden(req, res);
  }
  unauthorized(req, res);
}

// Admin or Guest — blocks staff
export function isAdminOrGuest(req, res, next) {
  if (req.session && req.session.userId) {
    if (req.session.role === 'admin' || req.session.role === 'user') return next();
    return forbidden(req, res);
  }
  unauthorized(req, res);
}
