const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { mysqlPool } = require('../config/database');
const { authenticateToken, requireReader } = require('../middleware/auth');

const router = express.Router();

// Get recent reviews
router.get('/recent', async (req, res) => {
    try {
        const [reviews] = await mysqlPool.execute(`
            SELECT 
                r.*,
                u.username,
                u.first_name,
                u.last_name,
                b.title,
                b.isbn,
                b.genre
            FROM reviews r
            JOIN users u ON r.user_id = u.user_id
            JOIN books b ON r.book_id = b.book_id
            WHERE r.is_approved = TRUE
            ORDER BY r.review_date DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: reviews.map(review => ({
                ...review,
                rating: Number(review.rating)
            }))
        });
    } catch (error) {
        console.error('Get recent reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent reviews'
        });
    }
});

// Submit a book review
router.post('/submit', authenticateToken, requireReader, [
    body('bookId').isInt({ min: 1 }),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().isLength({ max: 1000 }).trim()
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

        const { bookId, rating, comment } = req.body;
        const userId = req.user.user_id;

        // Verify user has borrowed the book
        const [checkouts] = await mysqlPool.execute(
            'SELECT checkout_id FROM checkouts WHERE user_id = ? AND book_id = ?',
            [userId, bookId]
        );

        if (checkouts.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You must borrow this book before reviewing'
            });
        }

        // Use stored procedure to submit review
        const [result] = await mysqlPool.execute(
            'CALL ReviewBook(?, ?, ?, ?, @success, @message)',
            [userId, bookId, rating, comment || null]
        );

        const [output] = await mysqlPool.execute('SELECT @success as success, @message as message');
        const { success, message } = output[0];

        if (success) {
            // Get the review details
            const [reviewDetails] = await mysqlPool.execute(`
                SELECT 
                    r.*,
                    u.username,
                    u.first_name,
                    u.last_name,
                    b.title as book_title
                FROM reviews r
                JOIN users u ON r.user_id = u.user_id
                JOIN books b ON r.book_id = b.book_id
                WHERE r.user_id = ? AND r.book_id = ?
                ORDER BY r.review_date DESC
                LIMIT 1
            `, [userId, bookId]);

            res.json({
                success: true,
                message,
                data: reviewDetails[0]
            });
        } else {
            res.status(400).json({
                success: false,
                message
            });
        }

    } catch (error) {
        console.error('Submit review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit review',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get reviews for a specific book
router.get('/book/:bookId', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
    query('rating').optional().isInt({ min: 1, max: 5 })
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
        const { page = 1, limit = 20, rating } = req.query;
        const offset = (page - 1) * limit;

        if (isNaN(bookId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid book ID'
            });
        }

        let whereClause = 'WHERE r.book_id = ? AND r.is_approved = TRUE';
        let queryParams = [bookId];

        if (rating) {
            whereClause += ' AND r.rating = ?';
            queryParams.push(parseInt(rating));
        }

        // Get reviews
        const [reviews] = await mysqlPool.execute(`
            SELECT 
                r.review_id,
                r.rating,
                r.comment,
                r.review_date,
                u.username,
                u.first_name,
                u.last_name
            FROM reviews r
            JOIN users u ON r.user_id = u.user_id
            ${whereClause}
            ORDER BY r.review_date DESC
            LIMIT ? OFFSET ?
        `, [...queryParams, parseInt(limit), parseInt(offset)]);

        // Get total count
        const [countResult] = await mysqlPool.execute(`
            SELECT COUNT(*) as total
            FROM reviews r
            ${whereClause}
        `, queryParams);

        const totalReviews = countResult[0].total;

        // Get rating statistics
        const [ratingStats] = await mysqlPool.execute(`
            SELECT 
                rating,
                COUNT(*) as count
            FROM reviews r
            WHERE r.book_id = ? AND r.is_approved = TRUE
            GROUP BY rating
            ORDER BY rating DESC
        `, [bookId]);

        // Calculate average rating
        const [avgRating] = await mysqlPool.execute(`
            SELECT 
                AVG(rating) as average_rating,
                COUNT(*) as total_reviews
            FROM reviews r
            WHERE r.book_id = ? AND r.is_approved = TRUE
        `, [bookId]);

        res.json({
            success: true,
            data: {
                reviews,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalReviews / limit),
                    totalReviews,
                    limit: parseInt(limit)
                },
                statistics: {
                    averageRating: parseFloat(avgRating[0].average_rating || 0).toFixed(2),
                    totalReviews: avgRating[0].total_reviews,
                    ratingDistribution: ratingStats
                }
            }
        });

    } catch (error) {
        console.error('Get book reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reviews',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get user's reviews
router.get('/my-reviews', authenticateToken, requireReader, [
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

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const userId = req.user.user_id;
        const offset = (page - 1) * limit;

        console.log('My reviews query params:', { page, limit, offset, userId, userIdType: typeof userId });

        // Get user's reviews - using query instead of execute to avoid prepared statement issues
        const [reviews] = await mysqlPool.query(`
            SELECT 
                r.review_id,
                r.rating,
                r.comment,
                r.review_date,
                r.is_approved,
                b.book_id,
                b.title,
                b.isbn,
                b.cover_image_url
            FROM reviews r
            JOIN books b ON r.book_id = b.book_id
            WHERE r.user_id = ?
            ORDER BY r.review_date DESC
            LIMIT ? OFFSET ?
        `, [parseInt(userId), parseInt(limit), parseInt(offset)]);

        // Get total count
        const [countResult] = await mysqlPool.query(`
            SELECT COUNT(*) as total
            FROM reviews 
            WHERE user_id = ?
        `, [parseInt(userId)]);

        const totalReviews = countResult[0].total;

        console.log('Query results:', { reviewsCount: reviews.length, totalReviews });

        res.json({
            success: true,
            data: {
                reviews: reviews || [],
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalReviews / limit),
                    totalReviews,
                    limit: limit
                }
            }
        });

    } catch (error) {
        console.error('Get user reviews error:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState,
            sqlMessage: error.sqlMessage
        });
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user reviews',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Update user's review
router.put('/:reviewId', authenticateToken, requireReader, [
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().isLength({ max: 1000 }).trim()
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

        const reviewId = parseInt(req.params.reviewId);
        const { rating, comment } = req.body;
        const userId = req.user.user_id;

        if (isNaN(reviewId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid review ID'
            });
        }

        // Verify the review belongs to the user
        const [existingReviews] = await mysqlPool.execute(`
            SELECT review_id, book_id
            FROM reviews 
            WHERE review_id = ? AND user_id = ?
        `, [reviewId, userId]);

        if (existingReviews.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Review not found or you do not have permission to edit it'
            });
        }

        // Update the review
        await mysqlPool.execute(`
            UPDATE reviews 
            SET rating = ?, comment = ?, review_date = NOW()
            WHERE review_id = ?
        `, [rating, comment || null, reviewId]);

        // Get updated review details
        const [updatedReview] = await mysqlPool.execute(`
            SELECT 
                r.*,
                u.username,
                u.first_name,
                u.last_name,
                b.title as book_title
            FROM reviews r
            JOIN users u ON r.user_id = u.user_id
            JOIN books b ON r.book_id = b.book_id
            WHERE r.review_id = ?
        `, [reviewId]);

        res.json({
            success: true,
            message: 'Review updated successfully',
            data: updatedReview[0]
        });

    } catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update review',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Delete user's review
router.delete('/:reviewId', authenticateToken, requireReader, async (req, res) => {
    try {
        const reviewId = parseInt(req.params.reviewId);
        const userId = req.user.user_id;

        if (isNaN(reviewId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid review ID'
            });
        }

        // Verify the review belongs to the user
        const [existingReviews] = await mysqlPool.execute(`
            SELECT review_id, book_id
            FROM reviews 
            WHERE review_id = ? AND user_id = ?
        `, [reviewId, userId]);

        if (existingReviews.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Review not found or you do not have permission to delete it'
            });
        }

        // Delete the review
        await mysqlPool.execute(`
            DELETE FROM reviews 
            WHERE review_id = ?
        `, [reviewId]);

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });

    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete review',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get recent reviews (for homepage)
router.get('/recent/list', [
    query('limit').optional().isInt({ min: 1, max: 20 })
], async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const [recentReviews] = await mysqlPool.query(`
            SELECT 
                r.review_id,
                r.rating,
                r.comment,
                r.review_date,
                u.username,
                u.first_name,
                u.last_name,
                b.book_id,
                b.title,
                b.cover_image_url,
                GROUP_CONCAT(
                    CONCAT(a.first_name, ' ', a.last_name) 
                    SEPARATOR ', '
                ) as authors
            FROM reviews r
            JOIN users u ON r.user_id = u.user_id
            JOIN books b ON r.book_id = b.book_id
            LEFT JOIN book_authors ba ON b.book_id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.author_id
            WHERE r.is_approved = TRUE
            GROUP BY r.review_id
            ORDER BY r.review_date DESC
            LIMIT ${parseInt(limit)}
        `);

        res.json({
            success: true,
            data: recentReviews
        });

    } catch (error) {
        console.error('Get recent reviews error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent reviews',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

module.exports = router;
