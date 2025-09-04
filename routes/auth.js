const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { mysqlPool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', [
    body('username').isLength({ min: 3, max: 50 }).trim().escape(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').isLength({ min: 1, max: 50 }).trim().escape(),
    body('lastName').isLength({ min: 1, max: 50 }).trim().escape(),
    body('userType').isIn(['reader', 'staff']),
    body('phone').optional().isMobilePhone(),
    body('address').optional().isLength({ max: 500 }).trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { username, email, password, firstName, lastName, userType, phone, address } = req.body;

        // Check if user already exists
        const [existingUsers] = await mysqlPool.execute(
            'SELECT user_id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insert new user
        const [result] = await mysqlPool.execute(
            `INSERT INTO users (username, email, password_hash, first_name, last_name, user_type, phone, address) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [username, email, passwordHash, firstName, lastName, userType, phone || null, address || null]
        );

        // Generate JWT token
        const token = jwt.sign(
            { userId: result.insertId, username, userType },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                userId: result.insertId,
                username,
                email,
                firstName,
                lastName,
                userType,
                token
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Login user
router.post('/login', [
    body('username').notEmpty().trim(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { username, password } = req.body;
        console.log('Login attempt:', { username, password: '***' });

        // Find user by username or email
        const [users] = await mysqlPool.execute(
            'SELECT user_id, username, email, password_hash, first_name, last_name, user_type, is_active FROM users WHERE (username = ? OR email = ?) AND is_active = TRUE',
            [username, username]
        );

        console.log('Found users:', users.length);
        if (users.length > 0) {
            console.log('User data:', { 
                username: users[0].username, 
                is_active: users[0].is_active,
                password_hash: users[0].password_hash.substring(0, 20) + '...'
            });
        }

        if (users.length === 0) {
            console.log('No user found');
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = users[0];

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        console.log('Password valid:', isPasswordValid);
        if (!isPasswordValid) {
            console.log('Password verification failed');
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.user_id, username: user.username, userType: user.user_type },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                userId: user.user_id,
                username: user.username,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                userType: user.user_type,
                token
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await mysqlPool.execute(
            'SELECT user_id, username, email, first_name, last_name, user_type, phone, address, date_joined FROM users WHERE user_id = ?',
            [req.user.user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = users[0];
        delete user.password_hash; // Never send password hash

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Update user profile
router.put('/profile', authenticateToken, [
    body('firstName').optional().isLength({ min: 1, max: 50 }).trim().escape(),
    body('lastName').optional().isLength({ min: 1, max: 50 }).trim().escape(),
    body('phone').optional().isMobilePhone(),
    body('address').optional().isLength({ max: 500 }).trim()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { firstName, lastName, phone, address } = req.body;
        const updateFields = [];
        const updateValues = [];

        if (firstName !== undefined) {
            updateFields.push('first_name = ?');
            updateValues.push(firstName);
        }
        if (lastName !== undefined) {
            updateFields.push('last_name = ?');
            updateValues.push(lastName);
        }
        if (phone !== undefined) {
            updateFields.push('phone = ?');
            updateValues.push(phone);
        }
        if (address !== undefined) {
            updateFields.push('address = ?');
            updateValues.push(address);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        updateValues.push(req.user.user_id);

        await mysqlPool.execute(
            `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`,
            updateValues
        );

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            success: false,
            message: 'Profile update failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Change password
router.put('/change-password', authenticateToken, [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;

        // Get current password hash
        const [users] = await mysqlPool.execute(
            'SELECT password_hash FROM users WHERE user_id = ?',
            [req.user.user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password_hash);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await mysqlPool.execute(
            'UPDATE users SET password_hash = ? WHERE user_id = ?',
            [newPasswordHash, req.user.user_id]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Password change failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Verify token endpoint
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Token is valid',
        data: {
            userId: req.user.user_id,
            username: req.user.username,
            userType: req.user.user_type
        }
    });
});

module.exports = router;
