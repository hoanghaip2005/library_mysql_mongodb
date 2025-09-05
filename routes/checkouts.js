const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { mysqlPool } = require('../config/database');
const { authenticateToken, requireReader } = require('../middleware/auth');

const router = express.Router();

// Borrow a book
router.post('/borrow', authenticateToken, requireReader, [
    body('bookId').isInt({ min: 1 }),
    body('dueDays').optional().isInt({ min: 1, max: 30 })
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

        const { bookId, dueDays = 14 } = req.body;
        const userId = req.user.user_id;

        // Check if user has any overdue books
        const [overdueCheckouts] = await mysqlPool.execute(`
            SELECT COUNT(*) as overdue_count
            FROM checkouts 
            WHERE user_id = ? AND status = 'overdue'
        `, [userId]);

        if (overdueCheckouts[0].overdue_count > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot borrow books while you have overdue items'
            });
        }

        // Check if user already has this book checked out
        const [existingCheckouts] = await mysqlPool.execute(`
            SELECT checkout_id 
            FROM checkouts 
            WHERE user_id = ? AND book_id = ? AND status = 'active'
        `, [userId, bookId]);

        if (existingCheckouts.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You already have this book checked out'
            });
        }

        // Use stored procedure to borrow book
        const [result] = await mysqlPool.execute(
            'CALL BorrowBook(?, ?, ?, @success, @message)',
            [userId, bookId, dueDays]
        );

        const [output] = await mysqlPool.execute('SELECT @success as success, @message as message');
        const { success, message } = output[0];

        if (success) {
            // Get the checkout details
            const [checkoutDetails] = await mysqlPool.execute(`
                SELECT 
                    c.*,
                    b.title,
                    b.isbn
                FROM checkouts c
                JOIN books b ON c.book_id = b.book_id
                WHERE c.user_id = ? AND c.book_id = ? AND c.status = 'active'
                ORDER BY c.checkout_date DESC
                LIMIT 1
            `, [userId, bookId]);

            res.json({
                success: true,
                message,
                data: checkoutDetails[0]
            });
        } else {
            res.status(400).json({
                success: false,
                message
            });
        }

    } catch (error) {
        console.error('Borrow book error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to borrow book',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Return a book
router.post('/return', authenticateToken, requireReader, [
    body('checkoutId').isInt({ min: 1 })
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

        const { checkoutId } = req.body;
        const userId = req.user.user_id;

        // Verify the checkout belongs to the user
        const [checkouts] = await mysqlPool.execute(`
            SELECT checkout_id, book_id, status
            FROM checkouts 
            WHERE checkout_id = ? AND user_id = ? AND status = 'active'
        `, [checkoutId, userId]);

        if (checkouts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Checkout record not found or already returned'
            });
        }

        // Use stored procedure to return book
        const [result] = await mysqlPool.execute(
            'CALL ReturnBook(?, @success, @message, @late_fee)',
            [checkoutId]
        );

        const [output] = await mysqlPool.execute('SELECT @success as success, @message as message, @late_fee as late_fee');
        const { success, message, late_fee } = output[0];

        if (success) {
            res.json({
                success: true,
                message,
                data: {
                    lateFee: parseFloat(late_fee)
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message
            });
        }

    } catch (error) {
        console.error('Return book error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to return book',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get user's current checkouts
router.get('/my-checkouts', authenticateToken, requireReader, [
    query('status').optional().isIn(['active', 'returned', 'overdue']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
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

        const userId = req.user.user_id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const status = req.query.status || null;

        let baseQuery = `
            SELECT 
                c.checkout_id,
                c.checkout_date,
                c.due_date,
                c.return_date,
                c.is_late,
                c.late_fee,
                c.status,
                b.book_id,
                b.title,
                b.isbn,
                b.cover_image_url,
                GROUP_CONCAT(
                    CONCAT(a.first_name, ' ', a.last_name) 
                    SEPARATOR ', '
                ) as authors
            FROM checkouts c
            JOIN books b ON c.book_id = b.book_id
            LEFT JOIN book_authors ba ON b.book_id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.author_id
            WHERE c.user_id = ?
        `;

        let params = [userId];

        if (status) {
            baseQuery += ' AND c.status = ?';
            params.push(status);
        }

        // Add GROUP BY, ORDER BY, and LIMIT clauses
        baseQuery += `
            GROUP BY c.checkout_id, c.checkout_date, c.due_date, c.return_date, 
                     c.is_late, c.late_fee, c.status, b.book_id, b.title, b.isbn, 
                     b.cover_image_url
            ORDER BY c.checkout_date DESC
            LIMIT ${parseInt(offset)}, ${parseInt(limit)}
        `;

        // Execute main query
        const [checkouts] = await mysqlPool.execute(baseQuery, params);

        // Prepare count query
        let countQuery = 'SELECT COUNT(DISTINCT c.checkout_id) as total FROM checkouts c WHERE c.user_id = ?';
        let countParams = [userId];

        if (status) {
            countQuery += ' AND c.status = ?';
            countParams.push(status);
        }

        // Execute count query
        const [countResult] = await mysqlPool.execute(countQuery, countParams);
        const total = countResult[0].total;

        res.json({
            success: true,
            data: {
                checkouts,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    limit
                }
            }
        });

    } catch (error) {
        console.error('Get checkouts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch checkouts',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get checkout history
router.get('/history', authenticateToken, requireReader, [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const userId = req.user.user_id;
        const offset = (page - 1) * limit;

        const [history] = await mysqlPool.query(`
            SELECT 
                c.checkout_id,
                c.checkout_date,
                c.due_date,
                c.return_date,
                c.is_late,
                c.late_fee,
                c.status,
                b.book_id,
                b.title,
                b.isbn,
                b.cover_image_url,
                GROUP_CONCAT(
                    CONCAT(a.first_name, ' ', a.last_name) 
                    SEPARATOR ', '
                ) as authors
            FROM checkouts c
            JOIN books b ON c.book_id = b.book_id
            LEFT JOIN book_authors ba ON b.book_id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.author_id
            WHERE c.user_id = ${userId} AND c.status = 'returned'
            GROUP BY c.checkout_id
            ORDER BY c.return_date DESC
            LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
        `);

        // Get total count
        const [countResult] = await mysqlPool.execute(`
            SELECT COUNT(*) as total
            FROM checkouts 
            WHERE user_id = ? AND status = 'returned'
        `, [userId]);

        const totalHistory = countResult[0].total;

        res.json({
            success: true,
            data: {
                history,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalHistory / limit),
                    totalHistory,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get checkout history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch checkout history',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get overdue checkouts
router.get('/overdue', authenticateToken, requireReader, async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [overdueCheckouts] = await mysqlPool.execute(`
            SELECT 
                c.checkout_id,
                c.checkout_date,
                c.due_date,
                c.is_late,
                c.late_fee,
                DATEDIFF(NOW(), c.due_date) as days_overdue,
                b.book_id,
                b.title,
                b.isbn,
                b.cover_image_url,
                GROUP_CONCAT(
                    CONCAT(a.first_name, ' ', a.last_name) 
                    ORDER BY ba.author_id SEPARATOR ', '
                ) as authors
            FROM checkouts c
            JOIN books b ON c.book_id = b.book_id
            LEFT JOIN book_authors ba ON b.book_id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.author_id
            WHERE c.user_id = ? AND c.status = 'overdue'
            GROUP BY c.checkout_id
            ORDER BY c.due_date ASC
        `, [userId]);

        res.json({
            success: true,
            data: overdueCheckouts
        });

    } catch (error) {
        console.error('Get overdue checkouts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch overdue checkouts',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Renew a book (extend due date)
router.post('/renew', authenticateToken, requireReader, [
    body('checkoutId').isInt({ min: 1 }),
    body('additionalDays').optional().isInt({ min: 1, max: 14 })
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

        const { checkoutId, additionalDays = 7 } = req.body;
        const userId = req.user.user_id;

        // Verify the checkout belongs to the user and is active
        const [checkouts] = await mysqlPool.execute(`
            SELECT checkout_id, due_date, status
            FROM checkouts 
            WHERE checkout_id = ? AND user_id = ? AND status = 'active'
        `, [checkoutId, userId]);

        if (checkouts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Checkout record not found or not eligible for renewal'
            });
        }

        const checkout = checkouts[0];

        // Check if book is already overdue
        if (checkout.status === 'overdue') {
            return res.status(400).json({
                success: false,
                message: 'Cannot renew overdue books. Please return the book first.'
            });
        }

        // Update due date
        await mysqlPool.execute(`
            UPDATE checkouts 
            SET due_date = DATE_ADD(due_date, INTERVAL ? DAY)
            WHERE checkout_id = ?
        `, [additionalDays, checkoutId]);

        // Get updated checkout details
        const [updatedCheckout] = await mysqlPool.execute(`
            SELECT 
                c.*,
                b.title,
                b.isbn
            FROM checkouts c
            JOIN books b ON c.book_id = b.book_id
            WHERE c.checkout_id = ?
        `, [checkoutId]);

        res.json({
            success: true,
            message: 'Book renewed successfully',
            data: updatedCheckout[0]
        });

    } catch (error) {
        console.error('Renew book error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to renew book',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

module.exports = router;
