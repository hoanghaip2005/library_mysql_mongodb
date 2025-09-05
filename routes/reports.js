const express = require('express');
const { query, validationResult } = require('express-validator');
const { mysqlPool } = require('../config/database');
const { authenticateToken, requireStaff } = require('../middleware/auth');

const router = express.Router();

// Apply staff authentication to all report routes
router.use(authenticateToken);
router.use(requireStaff);

// Most borrowed books within a specific time range
router.get('/most-borrowed-books', [
    query('startDate').isISO8601(),
    query('endDate').isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 })
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

        const { startDate, endDate, limit = 20 } = req.query;

        const [results] = await mysqlPool.query(`
            SELECT 
                b.book_id,
                b.title,
                b.isbn,
                b.genre,
                b.publisher,
                b.total_copies,
                b.available_copies,
                COUNT(c.checkout_id) as total_checkouts,
                COUNT(DISTINCT c.user_id) as unique_borrowers,
                AVG(r.rating) as average_rating,
                COUNT(r.review_id) as total_reviews,
                GROUP_CONCAT(
                    CONCAT(a.first_name, ' ', a.last_name) 
                    SEPARATOR ', '
                ) as authors
            FROM books b
            LEFT JOIN checkouts c ON b.book_id = c.book_id 
                AND c.checkout_date BETWEEN '${startDate}' AND '${endDate}'
            LEFT JOIN reviews r ON b.book_id = r.book_id AND r.is_approved = TRUE
            LEFT JOIN book_authors ba ON b.book_id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.author_id
            WHERE b.is_retired = FALSE
            GROUP BY b.book_id
            HAVING total_checkouts > 0
            ORDER BY total_checkouts DESC, average_rating DESC
            LIMIT ${parseInt(limit)}
        `);

        res.json({
            success: true,
            data: {
                reportType: 'Most Borrowed Books',
                dateRange: { startDate, endDate },
                results
            }
        });

    } catch (error) {
        console.error('Most borrowed books report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate most borrowed books report',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Top active readers by number of checkouts
router.get('/top-active-readers', [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
    try {
        const limitNum = Number(req.query.limit) || 20;
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        let dateFilter = '';
        let queryParams = [];

        if (startDate && endDate) {
            dateFilter = 'AND c.checkout_date BETWEEN ? AND ?';
            queryParams.push(startDate, endDate);
        }

        queryParams.push(limitNum);

        const [results] = await mysqlPool.execute(`
            SELECT 
                u.user_id,
                u.username,
                u.first_name,
                u.last_name,
                u.email,
                u.date_joined,
                COUNT(DISTINCT c.checkout_id) as total_checkouts,
                COUNT(DISTINCT CASE WHEN c.status = 'returned' THEN c.checkout_id END) as books_returned,
                COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.checkout_id END) as current_checkouts,
                COUNT(DISTINCT CASE WHEN c.status = 'overdue' THEN c.checkout_id END) as overdue_books,
                COUNT(DISTINCT CASE WHEN c.is_late = TRUE THEN c.checkout_id END) as late_returns,
                COALESCE(AVG(c.late_fee), 0) as average_late_fee,
                COUNT(DISTINCT r.review_id) as total_reviews,
                COALESCE(AVG(r.rating), 0) as average_review_rating
            FROM users u
            LEFT JOIN checkouts c ON u.user_id = c.user_id
            LEFT JOIN reviews r ON u.user_id = r.user_id AND r.is_approved = TRUE
            WHERE u.user_type = 'reader' 
            AND u.is_active = TRUE
            ${dateFilter}
            GROUP BY u.user_id
            HAVING total_checkouts > 0
            ORDER BY total_checkouts DESC, books_returned DESC
            LIMIT ?
        `, queryParams);

        res.json({
            success: true,
            data: {
                reportType: 'Top Active Readers',
                dateRange: startDate && endDate ? { startDate, endDate } : 'All Time',
                results
            }
        });

    } catch (error) {
        console.error('Top active readers report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate top active readers report',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Books with low availability
router.get('/low-availability-books', [
    query('threshold').optional().isInt({ min: 1, max: 10 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
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

        const threshold = Number(req.query.threshold) || 2;
        const limit = Number(req.query.limit) || 50;
        const queryParams = [threshold, limit];

        const [results] = await mysqlPool.execute(`
            WITH BookMetrics AS (
                SELECT 
                    b.book_id,
                    COUNT(DISTINCT c.checkout_id) as total_checkouts,
                    COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.checkout_id END) as current_checkouts,
                    COALESCE(AVG(r.rating), 0) as average_rating,
                    COUNT(DISTINCT r.review_id) as total_reviews
                FROM books b
                LEFT JOIN checkouts c ON b.book_id = c.book_id
                LEFT JOIN reviews r ON b.book_id = r.book_id AND r.is_approved = TRUE
                GROUP BY b.book_id
            )
            SELECT 
                b.book_id,
                b.title,
                b.isbn,
                b.genre,
                b.publisher,
                b.total_copies,
                b.available_copies,
                (b.total_copies - b.available_copies) as checked_out_copies,
                ROUND((b.available_copies / b.total_copies) * 100, 2) as availability_percentage,
                bm.total_checkouts,
                bm.current_checkouts,
                bm.average_rating,
                bm.total_reviews,
                GROUP_CONCAT(
                    DISTINCT CONCAT(a.first_name, ' ', a.last_name) 
                    ORDER BY a.last_name, a.first_name
                    SEPARATOR ', '
                ) as authors
            FROM books b
            LEFT JOIN BookMetrics bm ON b.book_id = bm.book_id
            LEFT JOIN book_authors ba ON b.book_id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.author_id
            WHERE b.is_retired = FALSE 
            AND b.available_copies <= ?
            GROUP BY 
                b.book_id, 
                bm.total_checkouts,
                bm.current_checkouts,
                bm.average_rating,
                bm.total_reviews
            ORDER BY availability_percentage ASC, bm.total_checkouts DESC
            LIMIT ?
        `, [thresholdNum, limitNum]);

        res.json({
            success: true,
            data: {
                reportType: 'Books with Low Availability',
                threshold: threshold,
                results: results.map(book => ({
                    ...book,
                    total_checkouts: Number(book.total_checkouts),
                    current_checkouts: Number(book.current_checkouts),
                    average_rating: Number(book.average_rating),
                    total_reviews: Number(book.total_reviews),
                    authors: book.authors ? book.authors.split(', ') : []
                }))
            }
        });

    } catch (error) {
        console.error('Low availability books report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate low availability books report',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Overdue books report
router.get('/overdue-books', [
    query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const [results] = await mysqlPool.execute(`
            SELECT 
                c.checkout_id,
                c.checkout_date,
                c.due_date,
                c.late_fee,
                DATEDIFF(NOW(), c.due_date) as days_overdue,
                u.user_id,
                u.username,
                u.first_name,
                u.last_name,
                u.email,
                u.phone,
                b.book_id,
                b.title,
                b.isbn,
                GROUP_CONCAT(
                    CONCAT(a.first_name, ' ', a.last_name) 
                    SEPARATOR ', '
                ) as authors
            FROM checkouts c
            JOIN users u ON c.user_id = u.user_id
            JOIN books b ON c.book_id = b.book_id
            LEFT JOIN book_authors ba ON b.book_id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.author_id
            WHERE c.status = 'overdue'
            GROUP BY c.checkout_id
            ORDER BY days_overdue DESC, c.late_fee DESC
            LIMIT ?
        `, [parseInt(limit)]);

        res.json({
            success: true,
            data: {
                reportType: 'Overdue Books',
                results
            }
        });

    } catch (error) {
        console.error('Overdue books report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate overdue books report',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Library statistics dashboard
router.get('/library-statistics', async (req, res) => {
    try {
        // Get basic statistics
        const [basicStats] = await mysqlPool.execute(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE user_type = 'reader' AND is_active = TRUE) as total_readers,
                (SELECT COUNT(*) FROM users WHERE user_type = 'staff' AND is_active = TRUE) as total_staff,
                (SELECT COUNT(*) FROM books WHERE is_retired = FALSE) as total_books,
                (SELECT COUNT(*) FROM authors) as total_authors,
                (SELECT SUM(total_copies) FROM books WHERE is_retired = FALSE) as total_copies,
                (SELECT SUM(available_copies) FROM books WHERE is_retired = FALSE) as available_copies,
                (SELECT COUNT(*) FROM checkouts WHERE status = 'active') as active_checkouts,
                (SELECT COUNT(*) FROM checkouts WHERE status = 'overdue') as overdue_checkouts,
                (SELECT COUNT(*) FROM reviews WHERE is_approved = TRUE) as total_reviews
        `);

        // Get monthly checkout trends (last 12 months)
        const [monthlyTrends] = await mysqlPool.execute(`
            SELECT 
                DATE_FORMAT(checkout_date, '%Y-%m') as month,
                COUNT(*) as checkouts,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(DISTINCT book_id) as unique_books
            FROM checkouts 
            WHERE checkout_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(checkout_date, '%Y-%m')
            ORDER BY month DESC
        `);

        // Get top genres
        const [topGenres] = await mysqlPool.execute(`
            SELECT 
                genre,
                COUNT(*) as book_count,
                SUM(total_copies) as total_copies,
                SUM(available_copies) as available_copies,
                AVG(average_rating) as avg_rating
            FROM books 
            WHERE genre IS NOT NULL AND genre != '' AND is_retired = FALSE
            GROUP BY genre
            ORDER BY book_count DESC
            LIMIT 10
        `);

        // Get top publishers
        const [topPublishers] = await mysqlPool.execute(`
            SELECT 
                publisher,
                COUNT(*) as book_count,
                SUM(total_copies) as total_copies,
                AVG(average_rating) as avg_rating
            FROM books 
            WHERE publisher IS NOT NULL AND publisher != '' AND is_retired = FALSE
            GROUP BY publisher
            ORDER BY book_count DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                reportType: 'Library Statistics Dashboard',
                basicStatistics: basicStats[0],
                monthlyTrends,
                topGenres,
                topPublishers
            }
        });

    } catch (error) {
        console.error('Library statistics report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate library statistics report',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// User activity report
router.get('/user-activity', [
    query('userId').isInt({ min: 1 })
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

        const { userId } = req.query;

        // Get user details
        const [userDetails] = await mysqlPool.execute(`
            SELECT 
                user_id,
                username,
                first_name,
                last_name,
                email,
                user_type,
                date_joined,
                is_active
            FROM users 
            WHERE user_id = ?
        `, [userId]);

        if (userDetails.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get checkout history
        const [checkoutHistory] = await mysqlPool.execute(`
            SELECT 
                c.checkout_id,
                c.checkout_date,
                c.due_date,
                c.return_date,
                c.status,
                c.is_late,
                c.late_fee,
                b.title,
                b.isbn,
                GROUP_CONCAT(
                    CONCAT(a.first_name, ' ', a.last_name) 
                    SEPARATOR ', '
                ) as authors
            FROM checkouts c
            JOIN books b ON c.book_id = b.book_id
            LEFT JOIN book_authors ba ON b.book_id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.author_id
            WHERE c.user_id = ?
            GROUP BY c.checkout_id
            ORDER BY c.checkout_date DESC
        `, [userId]);

        // Get review history
        const [reviewHistory] = await mysqlPool.execute(`
            SELECT 
                r.review_id,
                r.rating,
                r.comment,
                r.review_date,
                r.is_approved,
                b.title,
                b.isbn
            FROM reviews r
            JOIN books b ON r.book_id = b.book_id
            WHERE r.user_id = ?
            ORDER BY r.review_date DESC
        `, [userId]);

        // Get user statistics
        const [userStats] = await mysqlPool.execute(`
            SELECT 
                COUNT(c.checkout_id) as total_checkouts,
                COUNT(CASE WHEN c.status = 'returned' THEN 1 END) as books_returned,
                COUNT(CASE WHEN c.status = 'active' THEN 1 END) as current_checkouts,
                COUNT(CASE WHEN c.status = 'overdue' THEN 1 END) as overdue_books,
                COUNT(CASE WHEN c.is_late = TRUE THEN 1 END) as late_returns,
                SUM(c.late_fee) as total_late_fees,
                COUNT(r.review_id) as total_reviews,
                AVG(r.rating) as average_review_rating
            FROM users u
            LEFT JOIN checkouts c ON u.user_id = c.user_id
            LEFT JOIN reviews r ON u.user_id = r.user_id AND r.is_approved = TRUE
            WHERE u.user_id = ?
        `, [userId]);

        res.json({
            success: true,
            data: {
                reportType: 'User Activity Report',
                userDetails: userDetails[0],
                userStatistics: userStats[0],
                checkoutHistory,
                reviewHistory
            }
        });

    } catch (error) {
        console.error('User activity report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate user activity report',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

module.exports = router;
