const jwt = require('jsonwebtoken');
const { mysqlPool } = require('../config/database');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Access token required' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify user still exists and is active
        const [users] = await mysqlPool.execute(
            'SELECT user_id, username, user_type, is_active FROM users WHERE user_id = ? AND is_active = TRUE',
            [decoded.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found or inactive' 
            });
        }

        req.user = users[0];
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token expired' 
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid token' 
            });
        } else {
            return res.status(500).json({ 
                success: false, 
                message: 'Token verification failed' 
            });
        }
    }
};

// Check if user is staff
const requireStaff = (req, res, next) => {
    if (req.user.user_type !== 'staff') {
        return res.status(403).json({ 
            success: false, 
            message: 'Staff access required' 
        });
    }
    next();
};

// Check if user is reader
const requireReader = (req, res, next) => {
    if (req.user.user_type !== 'reader') {
        return res.status(403).json({ 
            success: false, 
            message: 'Reader access required' 
        });
    }
    next();
};

// Optional authentication (for public endpoints that can benefit from user context)
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const [users] = await mysqlPool.execute(
            'SELECT user_id, username, user_type, is_active FROM users WHERE user_id = ? AND is_active = TRUE',
            [decoded.userId]
        );

        req.user = users.length > 0 ? users[0] : null;
        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

module.exports = {
    authenticateToken,
    requireStaff,
    requireReader,
    optionalAuth
};
