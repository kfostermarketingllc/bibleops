/**
 * BibleOps Premium - Authentication Middleware
 * JWT token verification and user authentication
 */

const jwt = require('jsonwebtoken');
const db = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Generate JWT token for user
 * @param {Object} user - User object from database
 * @returns {string} JWT token
 */
function generateToken(user) {
    const payload = {
        userId: user.id,
        email: user.email,
        tier: user.tier
    };

    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: '30d' // Token expires in 30 days
    });
}

/**
 * Verify JWT token middleware
 * Adds user object to req.user if valid
 */
async function verifyToken(req, res, next) {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Get full user from database
        const user = await db.getUserById(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Attach user to request
        req.user = user;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }

        console.error('Token verification error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
}

/**
 * Require premium subscription middleware
 * Must be used after verifyToken
 */
function requirePremium(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.tier === 'free') {
        return res.status(403).json({
            error: 'Premium subscription required',
            upgradeUrl: '/premium/signup.html'
        });
    }

    next();
}

/**
 * Require specific tier middleware
 * @param {string|Array<string>} allowedTiers - Tier(s) allowed
 */
function requireTier(allowedTiers) {
    const tiers = Array.isArray(allowedTiers) ? allowedTiers : [allowedTiers];

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!tiers.includes(req.user.tier)) {
            return res.status(403).json({
                error: `Access denied. Required tier: ${tiers.join(' or ')}`,
                currentTier: req.user.tier
            });
        }

        next();
    };
}

module.exports = {
    generateToken,
    verifyToken,
    requirePremium,
    requireTier
};
