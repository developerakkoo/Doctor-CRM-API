import { ROLES } from '../constants/role.js';

/**
 * Generic role-based authorization middleware.
 * Usage: authorize('admin'), authorize('doctor', 'owner'), etc.
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(401).json({ msg: 'Unauthorized: Role missing in token' });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ msg: 'Forbidden: Access denied' });
    }
    
    next();
  };
};

/**
 * Admin-only middleware shortcut.
 * Use this when only admins are allowed without repeating authorize('admin')
 */
export const authorizeAdminOnly = (req, res, next) => {
  const userRole = req.user?.role;

  if (userRole !== ROLES.ADMIN) {
    return res.status(403).json({ msg: 'Admins only: Access denied' });
  }

  next();
};

/**
 * Doctor-only middleware shortcut (optional)
 */
export const authorizeDoctorOnly = (req, res, next) => {
  const userRole = req.user?.role;

  if (userRole !== ROLES.DOCTOR) {
    return res.status(403).json({ msg: 'Doctors only: Access denied' });
  }

  next();
};

/**
 * Owner-only middleware shortcut (optional)
 */
export const authorizeOwnerOnly = (req, res, next) => {
  const userRole = req.user?.role;

  if (userRole !== ROLES.OWNER) {
    return res.status(403).json({ msg: 'Owners only: Access denied' });
  }

  next();
};
