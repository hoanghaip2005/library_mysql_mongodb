const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { mysqlPool } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Search books with filters
router.get('/search', [
    query('q').optional().isLength({ min: 1, max: 200 }).trim(),
    query('author').optional().isLength({ min: 1, max: 100 }).trim(),
    query('genre').optional().isLength({ min: 1, max: 50 }).trim(),
    query('publisher').optional().isLength({ min: 1, max: 100 }).trim(),
    query('available').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
], optionalAuth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { q, author, genre, publisher, available, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let whereConditions = ['b.is_retired = FALSE'];
        let queryParams = [];

        // Build dynamic WHERE clause
        if (q) {
            whereConditions.push('(b.title LIKE ? OR b.description LIKE ?)');
            const searchTerm = `%${q}%`;
            queryParams.push(searchTerm, searchTerm);
        }

        if (author) {
            whereConditions.push('(a.first_name LIKE ? OR a.last_name LIKE ? OR CONCAT(a.first_name, " ", a.last_name) LIKE ?)');
            const authorTerm = `%${author}%`;
            queryParams.push(authorTerm, authorTerm, authorTerm);
        }

        if (genre) {
            whereConditions.push('b.genre = ?');
            queryParams.push(genre);
        }

        if (publisher) {
            whereConditions.push('b.publisher LIKE ?');
            queryParams.push(`%${publisher}%`);
        }

        if (available === 'true') {
            whereConditions.push('b.available_copies > 0');
        }

        // Build the main query
        const baseQuery = `
            SELECT DISTINCT 
                b.book_id,
                b.isbn,
                b.title,
                b.publisher,
                b.publication_date,
                b.genre,
                b.language,
                b.total_copies,
                b.available_copies,
                b.pages,
                b.description,
                b.cover_image_url,
                b.average_rating,
                b.total_reviews,
                GROUP_CONCAT(
                    CONCAT(a.first_name, ' ', a.last_name) 
                    SEPARATOR ', '
                ) as authors
            FROM books b
            LEFT JOIN book_authors ba ON b.book_id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.author_id
            WHERE ${whereConditions.join(' AND ')}
            GROUP BY b.book_id
            ORDER BY b.title
            LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
        `;

        // Execute search query
        const [books] = await mysqlPool.query(baseQuery);

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(DISTINCT b.book_id) as total
            FROM books b
            LEFT JOIN book_authors ba ON b.book_id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.author_id
            WHERE ${whereConditions.join(' AND ')}
        `;

        const [countResult] = await mysqlPool.query(countQuery);
        const totalBooks = countResult[0].total;

        res.json({
            success: true,
            data: {
                books,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalBooks / limit),
                    totalBooks,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Book search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get book by ID with detailed information
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);

        if (isNaN(bookId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid book ID'
            });
        }

        // Get book details with authors
        const [books] = await mysqlPool.execute(`
            SELECT 
                b.*,
                GROUP_CONCAT(
                    CONCAT(a.first_name, ' ', a.last_name) 
                    SEPARATOR ', '
                ) as authors,
                GROUP_CONCAT(a.author_id ORDER BY ba.author_id) as author_ids
            FROM books b
            LEFT JOIN book_authors ba ON b.book_id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.author_id
            WHERE b.book_id = ? AND b.is_retired = FALSE
            GROUP BY b.book_id
        `, [bookId]);

        if (books.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found'
            });
        }

        const book = books[0];

        // Get recent reviews
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
            WHERE r.book_id = ? AND r.is_approved = TRUE
            ORDER BY r.review_date DESC
            LIMIT 10
        `, [bookId]);

        // Get availability status
        const isAvailable = book.available_copies > 0;

        res.json({
            success: true,
            data: {
                ...book,
                isAvailable,
                recentReviews: reviews
            }
        });

    } catch (error) {
        console.error('Book fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch book details',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get all genres
router.get('/genres/list', async (req, res) => {
    try {
        const [genres] = await mysqlPool.execute(`
            SELECT DISTINCT genre, COUNT(*) as book_count
            FROM books 
            WHERE genre IS NOT NULL AND genre != '' AND is_retired = FALSE
            GROUP BY genre
            ORDER BY genre
        `);

        res.json({
            success: true,
            data: genres
        });

    } catch (error) {
        console.error('Genres fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch genres',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get all publishers
router.get('/publishers/list', async (req, res) => {
    try {
        const [publishers] = await mysqlPool.execute(`
            SELECT DISTINCT publisher, COUNT(*) as book_count
            FROM books 
            WHERE publisher IS NOT NULL AND publisher != '' AND is_retired = FALSE
            GROUP BY publisher
            ORDER BY publisher
        `);

        res.json({
            success: true,
            data: publishers
        });

    } catch (error) {
        console.error('Publishers fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch publishers',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get popular books (by checkout count)
router.get('/popular/list', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const [popularBooks] = await mysqlPool.query(`
            SELECT 
                b.book_id,
                b.title,
                b.cover_image_url,
                b.average_rating,
                b.total_reviews,
                COUNT(c.checkout_id) as checkout_count,
                GROUP_CONCAT(
                    CONCAT(a.first_name, ' ', a.last_name) 
                    SEPARATOR ', '
                ) as authors
            FROM books b
            LEFT JOIN checkouts c ON b.book_id = c.book_id
            LEFT JOIN book_authors ba ON b.book_id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.author_id
            WHERE b.is_retired = FALSE
            GROUP BY b.book_id
            ORDER BY checkout_count DESC, b.average_rating DESC
            LIMIT ${parseInt(limit)}
        `);

        res.json({
            success: true,
            data: popularBooks
        });

    } catch (error) {
        console.error('Popular books fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch popular books',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get recently added books
router.get('/recent/list', async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const [recentBooks] = await mysqlPool.execute(`
            SELECT 
                b.book_id,
                b.title,
                b.cover_image_url,
                b.average_rating,
                b.total_reviews,
                b.created_at,
                GROUP_CONCAT(
                    CONCAT(a.first_name, ' ', a.last_name) 
                    SEPARATOR ', '
                ) as authors
            FROM books b
            LEFT JOIN book_authors ba ON b.book_id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.author_id
            WHERE b.is_retired = FALSE
            GROUP BY b.book_id
            ORDER BY b.created_at DESC
            LIMIT ?
        `, [parseInt(limit)]);

        res.json({
            success: true,
            data: recentBooks
        });

    } catch (error) {
        console.error('Recent books fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent books',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

module.exports = router;
