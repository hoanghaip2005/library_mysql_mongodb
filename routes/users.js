const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { mysqlPool } = require('../config/database');
const { authenticateToken, requireStaff } = require('../middleware/auth');

const router = express.Router();

// Get all users with pagination and search
router.get('/', authenticateToken, requireStaff, [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().trim(),
    query('userType').optional().isIn(['reader', 'staff']),
    query('status').optional().isIn(['active', 'inactive', 'all'])
], async (req, res) => {
    try {
        // Validate request parameters
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid query parameters',
                errors: errors.array() 
            });
        }

        const pageNum = Number(req.query.page) || 1;
        const limitNum = Number(req.query.limit) || 50;
        const offsetNum = (pageNum - 1) * limitNum;
        const { search, userType, status } = req.query;

        let whereConditions = [];
        let queryParams = [];

        if (search && search.trim()) {
            whereConditions.push('(username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)');
            const searchTerm = `%${search.trim()}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (userType && ['reader', 'staff'].includes(userType)) {
            whereConditions.push('user_type = ?');
            queryParams.push(userType);
        }

        if (status && status !== 'all') {
            whereConditions.push('is_active = ?');
            queryParams.push(status === 'active' ? 1 : 0);
        }

        const whereClause = whereConditions.length > 0 
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';

        // Get users with prepared parameters
        const selectQuery = `
            SELECT 
                user_id,
                username,
                email,
                first_name,
                last_name,
                user_type,
                phone,
                date_joined,
                is_active,
                created_at
            FROM users
            ${whereClause}
            ORDER BY date_joined DESC
            LIMIT ? OFFSET ?
        `;

        // Use spread operator to create a new array with all parameters
        const selectParams = [...queryParams, limitNum, offsetNum];
        const [users] = await mysqlPool.execute(selectQuery, selectParams);

        // Get total count with prepared parameters
        const countQuery = `
            SELECT COUNT(*) as total
            FROM users
            ${whereClause}
        `;
        const [countResult] = await mysqlPool.execute(countQuery, queryParams);

        const totalUsers = countResult[0].total;

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(totalUsers / limitNum),
                    totalUsers,
                    limit: limitNum
                }
            }
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get user details including checkout history
router.get('/:userId', authenticateToken, requireStaff, [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const pageNum = Math.max(1, Number(req.query.page) || 1);
        const limitNum = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
        const offsetNum = (pageNum - 1) * limitNum;

        if (isNaN(userId) || userId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Get user details
        const [users] = await mysqlPool.execute(
            `SELECT user_id, username, email, first_name, last_name, user_type, 
            phone, address, date_joined, is_active FROM users WHERE user_id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get user's checkout history
        const [checkouts] = await mysqlPool.execute(
            `SELECT c.*, b.title as book_title, b.isbn 
            FROM checkouts c 
            JOIN books b ON c.book_id = b.book_id 
            WHERE c.user_id = ? 
            ORDER BY c.checkout_date DESC 
            LIMIT ? OFFSET ?`,
            [String(userId), String(limitNum), String(offsetNum)]
        );

        // Get total checkouts count
        const [countResult] = await mysqlPool.execute(
            'SELECT COUNT(*) as total FROM checkouts WHERE user_id = ?',
            [String(userId)]
        );

        const totalCheckouts = countResult[0].total;

        res.json({
            success: true,
            data: {
                user: users[0],
                checkouts,
                pagination: {
                    currentPage: pageNum,
                    totalPages: Math.ceil(totalCheckouts / limitNum),
                    totalCheckouts,
                    limit: limitNum
                }
            }
        });

    } catch (error) {
        console.error('Get user details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user details',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Toggle user active status
router.put('/:userId/status', authenticateToken, requireStaff, [
    body('isActive').isBoolean()
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

        const userId = parseInt(req.params.userId);
        const { isActive } = req.body;
        const staffId = req.user.user_id;

        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Prevent staff from deactivating themselves
        if (userId === staffId && !isActive) {
            return res.status(400).json({
                success: false,
                message: 'Cannot deactivate your own account'
            });
        }

        // Update user status
        await mysqlPool.execute(
            'UPDATE users SET is_active = ? WHERE user_id = ?',
            [isActive, userId]
        );

        // Log the action
        await mysqlPool.execute(
            `INSERT INTO staff_logs (staff_id, action_type, target_table, target_id, new_values)
            VALUES (?, 'update_user_status', 'users', ?, ?)`,
            [staffId, userId, JSON.stringify({ isActive })]
        );

        res.json({
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
        });

    } catch (error) {
        console.error('Toggle user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user status',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

module.exports = router;
