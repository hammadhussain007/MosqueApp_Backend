/**
 * Middleware to check if the authenticated user has imam role
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const isImam = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Fetch user from database to check role
    const user = await prisma.user.findUnique({
      where: { id: req.userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'imam') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Imam role required.'
      });
    }

    // Attach user to request for use in controller
    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking authorization',
      error: error.message
    });
  }
};

module.exports = isImam;

