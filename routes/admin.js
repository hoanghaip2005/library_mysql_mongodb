const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { mysqlPool } = require('../config/database');
const { authenticateToken, requireStaff } = require('../middleware/auth');

const router = express.Router();

// Apply staff authentication to all admin routes
router.use(authenticateToken);
router.use(requireStaff);

// Add a new book
router.post('/books', [
    body('isbn').optional().isLength({ min: 10, max: 20 }).trim(),
    body('title').isLength({ min: 1, max: 200 }).trim(),
    body('publisher').optional().isLength({ max: 100 }).trim(),
    body('publicationDate').optional().isISO8601(),
    body('genre').optional().isLength({ max: 50 }).trim(),
    body('language').optional().isLength({ max: 20 }).trim(),
    body('totalCopies').isInt({ min: 1 }),
    body('pages').optional().isInt({ min: 1 }),
    body('description').optional().isLength({ max: 2000 }).trim(),
    body('authorIds').isArray({ min: 1 }),
    body('authorIds.*').isInt({ min: 1 })
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

        const {
            isbn,
            title,
            publisher,
            publicationDate,
            genre,
            language = 'English',
            totalCopies,
            pages,
            description,
            authorIds
        } = req.body;

        const staffId = req.user.user_id;

        // Use stored procedure to add book
        const [result] = await mysqlPool.execute(
            'CALL AddBook(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @success, @message, @book_id)',
            [
                staffId,
                isbn || null,
                title,
                publisher || null,
                publicationDate || null,
                genre || null,
                language,
                totalCopies,
                pages || null,
                description || null,
                JSON.stringify(authorIds)
            ]
        );

        const [output] = await mysqlPool.execute('SELECT @success as success, @message as message, @book_id as book_id');
        const { success, message, book_id } = output[0];

        if (success) {
            res.status(201).json({
                success: true,
                message,
                data: { bookId: book_id }
            });
        } else {
            res.status(400).json({
                success: false,
                message
            });
        }

    } catch (error) {
        console.error('Add book error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add book',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Update book inventory
router.put('/books/:bookId/inventory', [
    body('newTotalCopies').isInt({ min: 0 })
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

        const bookId = parseInt(req.params.bookId);
        const { newTotalCopies } = req.body;
        const staffId = req.user.user_id;

        if (isNaN(bookId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid book ID'
            });
        }

        // Use stored procedure to update inventory
        const [result] = await mysqlPool.execute(
            'CALL UpdateInventory(?, ?, ?, @success, @message)',
            [staffId, bookId, newTotalCopies]
        );

        const [output] = await mysqlPool.execute('SELECT @success as success, @message as message');
        const { success, message } = output[0];

        if (success) {
            res.json({
                success: true,
                message
            });
        } else {
            res.status(400).json({
                success: false,
                message
            });
        }

    } catch (error) {
        console.error('Update inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update inventory',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Retire a book
router.put('/books/:bookId/retire', async (req, res) => {
    try {
        const bookId = parseInt(req.params.bookId);
        const staffId = req.user.user_id;

        if (isNaN(bookId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid book ID'
            });
        }

        // Use stored procedure to retire book
        const [result] = await mysqlPool.execute(
            'CALL RetireBook(?, ?, @success, @message)',
            [staffId, bookId]
        );

        const [output] = await mysqlPool.execute('SELECT @success as success, @message as message');
        const { success, message } = output[0];

        if (success) {
            res.json({
                success: true,
                message
            });
        } else {
            res.status(400).json({
                success: false,
                message
            });
        }

    } catch (error) {
        console.error('Retire book error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retire book',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Add a new author
router.post('/authors', [
    body('firstName').isLength({ min: 1, max: 50 }).trim(),
    body('lastName').isLength({ min: 1, max: 50 }).trim(),
    body('birthDate').optional().isISO8601(),
    body('nationality').optional().isLength({ max: 50 }).trim(),
    body('biography').optional().isLength({ max: 2000 }).trim()
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

        const { firstName, lastName, birthDate, nationality, biography } = req.body;
        const staffId = req.user.user_id;

        // Insert new author
        const [result] = await mysqlPool.execute(`
            INSERT INTO authors (first_name, last_name, birth_date, nationality, biography)
            VALUES (?, ?, ?, ?, ?)
        `, [firstName, lastName, birthDate || null, nationality || null, biography || null]);

        const authorId = result.insertId;

        // Log the action
        await mysqlPool.execute(`
            INSERT INTO staff_logs (staff_id, action_type, target_table, target_id, new_values)
            VALUES (?, 'add_author', 'authors', ?, ?)
        `, [staffId, authorId, JSON.stringify({
            firstName,
            lastName,
            birthDate,
            nationality,
            biography
        })]);

        res.status(201).json({
            success: true,
            message: 'Author added successfully',
            data: { authorId }
        });

    } catch (error) {
        console.error('Add author error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add author',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get all authors
router.get('/authors', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isLength({ min: 1, max: 100 }).trim()
], async (req, res) => {
    try {
        const { page = 1, limit = 50, search } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let queryParams = [];

        if (search) {
            whereClause = 'WHERE (a.first_name LIKE ? OR a.last_name LIKE ? OR CONCAT(a.first_name, " ", a.last_name) LIKE ?)';
            const searchTerm = `%${search}%`;
            queryParams = [searchTerm, searchTerm, searchTerm];
        }

        const [authors] = await mysqlPool.execute(`
            SELECT 
                a.*,
                COUNT(ba.book_id) as book_count
            FROM authors a
            LEFT JOIN book_authors ba ON a.author_id = ba.author_id
            ${whereClause}
            GROUP BY a.author_id
            ORDER BY a.last_name, a.first_name
            LIMIT ? OFFSET ?
        `, [...queryParams, parseInt(limit), parseInt(offset)]);

        // Get total count
        const [countResult] = await mysqlPool.execute(`
            SELECT COUNT(DISTINCT a.author_id) as total
            FROM authors a
            LEFT JOIN book_authors ba ON a.author_id = ba.author_id
            ${whereClause}
        `, queryParams);

        const totalAuthors = countResult[0].total;

        res.json({
            success: true,
            data: {
                authors,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalAuthors / limit),
                    totalAuthors,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get authors error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch authors',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get staff activity logs
router.get('/logs', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('actionType').optional().isIn(['add_book', 'update_inventory', 'retire_book', 'add_author', 'update_book']),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
], async (req, res) => {
    try {
        const { page = 1, limit = 50, actionType, startDate, endDate } = req.query;
        const offset = (page - 1) * limit;

        let whereConditions = [];
        let queryParams = [];

        if (actionType) {
            whereConditions.push('sl.action_type = ?');
            queryParams.push(actionType);
        }

        if (startDate) {
            whereConditions.push('sl.action_timestamp >= ?');
            queryParams.push(startDate);
        }

        if (endDate) {
            whereConditions.push('sl.action_timestamp <= ?');
            queryParams.push(endDate);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const [logs] = await mysqlPool.execute(`
            SELECT 
                sl.*,
                u.username as staff_username,
                u.first_name as staff_first_name,
                u.last_name as staff_last_name
            FROM staff_logs sl
            JOIN users u ON sl.staff_id = u.user_id
            ${whereClause}
            ORDER BY sl.action_timestamp DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, parseInt(limit), parseInt(offset)]);

        // Get total count
        const [countResult] = await mysqlPool.execute(`
            SELECT COUNT(*) as total
            FROM staff_logs sl
            ${whereClause}
        `, queryParams);

        const totalLogs = countResult[0].total;

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalLogs / limit),
                    totalLogs,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get staff logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch staff logs',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get all users (for admin management)
router.get('/users', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('userType').optional().isIn(['reader', 'staff']),
    query('search').optional().isLength({ min: 1, max: 100 }).trim()
], async (req, res) => {
    try {
        const { page = 1, limit = 50, userType, search } = req.query;
        const offset = (page - 1) * limit;

        let whereConditions = [];
        let queryParams = [];

        if (userType) {
            whereConditions.push('user_type = ?');
            queryParams.push(userType);
        }

        if (search) {
            whereConditions.push('(username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)');
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const [users] = await mysqlPool.execute(`
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
        `, [...queryParams, parseInt(limit), parseInt(offset)]);

        // Get total count
        const [countResult] = await mysqlPool.execute(`
            SELECT COUNT(*) as total
            FROM users
            ${whereClause}
        `, queryParams);

        const totalUsers = countResult[0].total;

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalUsers / limit),
                    totalUsers,
                    limit: parseInt(limit)
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

// Toggle user active status
router.put('/users/:userId/status', [
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
        await mysqlPool.execute(`
            UPDATE users 
            SET is_active = ?
            WHERE user_id = ?
        `, [isActive, userId]);

        // Log the action
        await mysqlPool.execute(`
            INSERT INTO staff_logs (staff_id, action_type, target_table, target_id, new_values)
            VALUES (?, 'update_user_status', 'users', ?, ?)
        `, [staffId, userId, JSON.stringify({ isActive })]);

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
