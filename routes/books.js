const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { mysqlPool } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Get all authors
router.get('/authors', async (req, res) => {
    try {
        const [authors] = await mysqlPool.execute(`
            SELECT 
                a.*,
                COUNT(DISTINCT b.book_id) as book_count
            FROM authors a
            LEFT JOIN book_authors ba ON a.author_id = ba.author_id
            LEFT JOIN books b ON ba.book_id = b.book_id AND b.is_retired = FALSE
            GROUP BY a.author_id
            ORDER BY a.last_name, a.first_name
        `);

        res.json({
            success: true,
            data: {
                authors: authors.map(author => ({
                    ...author,
                    book_count: Number(author.book_count)
                }))
            }
        });
    } catch (error) {
        console.error('Get authors error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch authors'
        });
    }
});

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
    const startTime = Date.now();
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
            // Use LIKE search for all fields (compatible and reliable)
            whereConditions.push(`(
                b.title COLLATE utf8mb4_general_ci LIKE ? OR 
                b.description COLLATE utf8mb4_general_ci LIKE ? OR
                b.genre COLLATE utf8mb4_general_ci LIKE ? OR 
                b.publisher COLLATE utf8mb4_general_ci LIKE ? OR
                a.first_name COLLATE utf8mb4_general_ci LIKE ? OR 
                a.last_name COLLATE utf8mb4_general_ci LIKE ? OR 
                CONCAT(a.first_name, " ", a.last_name) COLLATE utf8mb4_general_ci LIKE ?
            )`);
            const searchTerm = `%${q}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (author) {
            whereConditions.push('(a.first_name COLLATE utf8mb4_general_ci LIKE ? OR a.last_name COLLATE utf8mb4_general_ci LIKE ? OR CONCAT(a.first_name, " ", a.last_name) COLLATE utf8mb4_general_ci LIKE ?)');
            const authorTerm = `%${author}%`;
            queryParams.push(authorTerm, authorTerm, authorTerm);
        }

        if (genre) {
            whereConditions.push('b.genre = ?');
            queryParams.push(genre);
        }

        if (publisher) {
            whereConditions.push('b.publisher COLLATE utf8mb4_general_ci LIKE ?');
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
                COALESCE(b.publisher, 'Not Specified') as publisher,
                b.publication_date,
                COALESCE(b.genre, 'General') as genre,
                COALESCE(b.language, 'English') as language,
                COALESCE(b.total_copies, 0) as total_copies,
                COALESCE(b.available_copies, 0) as available_copies,
                COALESCE(b.pages, 0) as pages,
                COALESCE(b.description, 'No description available') as description,
                COALESCE(b.cover_image_url, '') as cover_image_url,
                COALESCE(b.average_rating, 0) as average_rating,
                COALESCE(b.total_reviews, 0) as total_reviews,
                COALESCE(GROUP_CONCAT(
                    DISTINCT CONCAT(a.first_name, ' ', a.last_name) 
                    SEPARATOR ', '
                ), 'Unknown Author') as authors
            FROM books b
            LEFT JOIN book_authors ba ON b.book_id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.author_id
            WHERE ${whereConditions.join(' AND ')}
            GROUP BY b.book_id
            ORDER BY b.title
            LIMIT ? OFFSET ?
        `;

        // Add limit and offset to queryParams
        queryParams.push(parseInt(limit), parseInt(offset));

        // Execute search query
        let books = [];
        let totalBooks = 0;
        
        try {
            [books] = await mysqlPool.query(baseQuery, queryParams);

            // Get total count for pagination
            const countQuery = `
                SELECT COUNT(DISTINCT b.book_id) as total
                FROM books b
                LEFT JOIN book_authors ba ON b.book_id = ba.book_id
                LEFT JOIN authors a ON ba.author_id = a.author_id
                WHERE ${whereConditions.join(' AND ')}
            `;

            const [countResult] = await mysqlPool.query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset
            totalBooks = countResult[0].total;

            const responseTime = Date.now() - startTime;
            console.log(`Search completed in ${responseTime}ms for query: "${q || 'all'}"`);
            
            res.json({
                success: true,
                data: {
                    books,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(totalBooks / limit),
                        totalBooks,
                        limit: parseInt(limit)
                    },
                    performance: {
                        responseTime: responseTime,
                        queryTime: responseTime
                    }
                }
            });
        } catch (dbError) {
            console.error('Database query error:', dbError);
            throw new Error('Database error while searching books');
        }

    } catch (error) {
        console.error('Book search error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Search failed',
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
                b.book_id,
                b.isbn,
                b.title,
                COALESCE(b.publisher, 'Not Specified') as publisher,
                b.publication_date,
                COALESCE(b.genre, 'General') as genre,
                COALESCE(b.language, 'English') as language,
                COALESCE(b.total_copies, 0) as total_copies,
                COALESCE(b.available_copies, 0) as available_copies,
                COALESCE(b.pages, 0) as pages,
                COALESCE(b.description, 'No description available') as description,
                COALESCE(b.cover_image_url, '') as cover_image_url,
                COALESCE(b.average_rating, 0) as average_rating,
                COALESCE(b.total_reviews, 0) as total_reviews,
                COALESCE(GROUP_CONCAT(
                    DISTINCT CONCAT(a.first_name, ' ', a.last_name) 
                    SEPARATOR ', '
                ), 'Unknown Author') as authors,
                COALESCE(GROUP_CONCAT(a.author_id ORDER BY ba.author_id), '') as author_ids
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



// Get popular books
router.get('/popular/list', async (req, res) => {
    try {
        const limitNum = parseInt(req.query.limit) || 6;
        console.log('Getting popular books with limit:', limitNum);

        // Get books
        const [books] = await mysqlPool.query(`
            SELECT 
                b.book_id,
                b.isbn,
                b.title,
                COALESCE(b.publisher, 'Not Specified') as publisher,
                b.publication_date,
                COALESCE(b.genre, 'General') as genre,
                COALESCE(b.language, 'English') as language,
                COALESCE(b.total_copies, 0) as total_copies,
                COALESCE(b.available_copies, 0) as available_copies,
                COALESCE(b.pages, 0) as pages,
                COALESCE(b.description, 'No description available') as description,
                COALESCE(b.cover_image_url, '') as cover_image_url,
                COALESCE(b.average_rating, 0) as average_rating,
                COALESCE(b.total_reviews, 0) as total_reviews
            FROM books b
            WHERE b.is_retired = FALSE
            ORDER BY b.average_rating DESC, b.total_reviews DESC
            LIMIT ?
        `, [limitNum]);

        console.log('Raw book data:', books);

        // Get authors for each book
        for (const book of books) {
            const [authors] = await mysqlPool.query(`
                SELECT 
                    CONCAT(a.first_name, ' ', a.last_name) as author_name
                FROM book_authors ba
                JOIN authors a ON ba.author_id = a.author_id
                WHERE ba.book_id = ?
                ORDER BY ba.author_id
            `, [book.book_id]);
            
            book.authors = authors.map(a => a.author_name).join(', ') || 'Unknown Author';
        }

        console.log('Books with authors:', books);

        res.json({
            success: true,
            data: books
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
                b.isbn,
                b.title,
                COALESCE(b.publisher, 'Not Specified') as publisher,
                b.publication_date,
                COALESCE(b.genre, 'General') as genre,
                COALESCE(b.language, 'English') as language,
                COALESCE(b.total_copies, 0) as total_copies,
                COALESCE(b.available_copies, 0) as available_copies,
                COALESCE(b.pages, 0) as pages,
                COALESCE(b.description, 'No description available') as description,
                COALESCE(b.cover_image_url, '') as cover_image_url,
                COALESCE(b.average_rating, 0) as average_rating,
                COALESCE(b.total_reviews, 0) as total_reviews,
                COALESCE(GROUP_CONCAT(
                    DISTINCT CONCAT(a.first_name, ' ', a.last_name) 
                    SEPARATOR ', '
                ), 'Unknown Author') as authors
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
