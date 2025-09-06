const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { mysqlPool } = require('../config/database');
const { authenticateToken, requireStaff } = require('../middleware/auth');

const router = express.Router();

// Get all users with pagination and search
router.get('/users', authenticateToken, requireStaff, [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().trim().escape(),
    query('userType').optional().trim().isIn(['reader', 'staff']),
    query('status').optional().trim().isIn(['active', 'inactive', 'all'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid query parameters',
                errors: errors.array() 
            });
        }

        const pageNum = Math.max(1, parseInt(req.query.page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
        const offsetNum = (pageNum - 1) * limitNum;
        const { search, userType, status } = req.query;

        let conditions = [];
        let params = [];
        let query = `
            SELECT 
                user_id,
                username,
                email,
                first_name,
                last_name,
                user_type,
                date_joined,
                is_active
            FROM users
        `;

        // Add conditions with strict validation
        if (search && search.trim()) {
            conditions.push('(username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)');
            const searchTerm = `%${search.trim()}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        if (userType && ['reader', 'staff'].includes(userType)) {
            conditions.push('user_type = ?');
            params.push(userType);
        }

        if (status && ['active', 'inactive'].includes(status)) {
            conditions.push('is_active = ?');
            params.push(status === 'active' ? '1' : '0');  // Convert to string for MySQL
        }

        // Add WHERE clause if conditions exist
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Add ORDER BY and LIMIT clauses
        query += ' ORDER BY date_joined DESC LIMIT ? OFFSET ?';
        
        // Convert numbers to strings for MySQL params
        params.push(String(limitNum));  // Convert to string
        params.push(String(offsetNum)); // Convert to string

        // Get users with proper error handling
        let users;
        try {
            [users] = await mysqlPool.execute(query, params);
        } catch (error) {
            console.error('Failed to get users:', error);
            throw new Error('Failed to get users: ' + error.message);
        }

        // Get total count with proper error handling
        let countQuery = 'SELECT COUNT(*) as total FROM users';
        if (conditions.length > 0) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
        }

        let countResult;
        try {
            [countResult] = await mysqlPool.execute(countQuery, params.slice(0, -2));
        } catch (error) {
            console.error('Failed to get total count:', error);
            throw new Error('Failed to get total count: ' + error.message);
        }

        const totalUsers = countResult[0].total;

        // Get user statistics
        const [statsResult] = await mysqlPool.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN user_type = 'staff' THEN 1 ELSE 0 END) as staff
            FROM users
        `);

        const stats = statsResult[0];

        res.json({
            success: true,
            data: {
                users,
                stats: {
                    total: stats.total,
                    active: stats.active,
                    staff: stats.staff
                },
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
router.get('/users/:userId', authenticateToken, requireStaff, [
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

        console.log('User details request:', { userId, pageNum, limitNum, offsetNum });

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
        const [{ total }] = await mysqlPool.execute(
            'SELECT COUNT(*) as total FROM checkouts WHERE user_id = ?',
            [String(userId)]
        );

        res.json({
            success: true,
            data: {
                user: users[0],
                checkouts,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total
                }
            }
        });
    } catch (error) {
        console.error('Get user details error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user details'
        });
    }
});

// Debug endpoint to list all authors (no auth required)
router.get('/debug/authors', async (req, res) => {
    try {
        const [authors] = await mysqlPool.execute('SELECT * FROM authors');
        res.json({
            success: true,
            data: authors
        });
    } catch (error) {
        console.error('Debug authors error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get authors'
        });
    }
});

// Apply staff authentication to all admin routes
router.use(authenticateToken);
router.use(requireStaff);

// Get all books
router.get('/books', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isLength({ min: 1, max: 100 }).trim()
], async (req, res) => {
    try {
        const pageNum = Math.max(1, parseInt(req.query.page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const offsetNum = (pageNum - 1) * limitNum;
        const search = req.query.search;

        let whereClause = 'WHERE b.is_retired = FALSE';
        let queryParams = [];

        if (search) {
            whereClause += ' AND (b.title COLLATE utf8mb4_general_ci LIKE ? OR b.isbn LIKE ? OR b.publisher COLLATE utf8mb4_general_ci LIKE ?)';
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        queryParams.push(limitNum, offsetNum);

        const [books] = await mysqlPool.execute(`
            SELECT 
                b.*,
                GROUP_CONCAT(DISTINCT CONCAT(a.first_name, ' ', a.last_name)) as author_names,
                GROUP_CONCAT(DISTINCT a.author_id) as author_ids,
                IFNULL(AVG(r.rating), 0) as average_rating,
                COUNT(DISTINCT r.review_id) as total_reviews
            FROM books b
            LEFT JOIN book_authors ba ON b.book_id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.author_id
            LEFT JOIN reviews r ON b.book_id = r.book_id AND r.is_approved = TRUE
            ${whereClause}
            GROUP BY b.book_id
            ORDER BY b.title
            LIMIT ? OFFSET ?
        `, queryParams);

        // Get total count
        const [countResult] = await mysqlPool.execute(`
            SELECT COUNT(DISTINCT b.book_id) as total
            FROM books b
            LEFT JOIN book_authors ba ON b.book_id = ba.book_id
            LEFT JOIN authors a ON ba.author_id = a.author_id
            ${whereClause}
        `, queryParams);

        res.json({
            success: true,
            data: {
                books: books.map(book => ({
                    ...book,
                    author_names: book.author_names ? book.author_names.split(',') : [],
                    author_ids: book.author_ids ? book.author_ids.split(',').map(Number) : []
                })),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: countResult[0].total
                }
            }
        });

    } catch (error) {
        console.error('Get books error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get books'
        });
    }
});

// Add a new book
router.post('/books', [
    body('isbn').optional({ nullable: true }).isLength({ max: 20 }).trim(),
    body('title').notEmpty().isLength({ max: 200 }).trim(),
    body('publisher').optional({ nullable: true }).isLength({ max: 100 }).trim(),
    body('publicationDate').optional({ nullable: true }).isISO8601().toDate(),
    body('genre').optional({ nullable: true }).isLength({ max: 50 }).trim(),
    body('language').optional({ nullable: true }).isLength({ max: 20 }).trim().default('English'),
    body('totalCopies').isInt({ min: 1 }).toInt(),
    body('pages').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
    body('description').optional({ nullable: true }).isLength({ max: 2000 }).trim(),
    body('authorId').isInt({ min: 1 }).toInt().withMessage('Author ID is required')
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
            authorId
        } = req.body;

        const staffId = req.user.user_id;
        const formattedDate = publicationDate ? new Date(publicationDate).toISOString().split('T')[0] : null;

        // Begin transaction
        const connection = await mysqlPool.getConnection();
        await connection.beginTransaction();

        try {
            // First verify the author exists
            const [authors] = await connection.execute(
                'SELECT author_id FROM authors WHERE author_id = ?',
                [authorId]
            );

            if (authors.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({
                    success: false,
                    message: `Author with ID ${authorId} does not exist`
                });
            }

            // Insert the book
            const [bookResult] = await connection.execute(
                `INSERT INTO books (
                    isbn, title, publisher, publication_date, genre,
                    language, total_copies, available_copies, pages, description
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    isbn || null,
                    title,
                    publisher || null,
                    formattedDate,
                    genre || null,
                    language,
                    totalCopies,
                    totalCopies,
                    pages || null,
                    description || null
                ]
            );

            const bookId = bookResult.insertId;

            // Add book-author relationship
            await connection.execute(
                'INSERT INTO book_authors (book_id, author_id) VALUES (?, ?)',
                [bookId, authorId]
            );

            // Log the action
            await connection.execute(
                'INSERT INTO staff_logs (staff_id, action_type, target_table, target_id, new_values) VALUES (?, ?, ?, ?, ?)',
                [
                    staffId,
                    'add_book',
                    'books',
                    bookId,
                    JSON.stringify({ title, authorId })
                ]
            );

            await connection.commit();
            connection.release();

            res.status(201).json({
                success: true,
                message: 'Book added successfully',
                data: { bookId }
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
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
        const pageNum = Math.max(1, parseInt(req.query.page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const offsetNum = (pageNum - 1) * limitNum;
        const search = req.query.search;

        let whereClause = '';
        let queryParams = [];

        if (search) {
            whereClause = 'WHERE (a.first_name LIKE ? OR a.last_name LIKE ? OR CONCAT(a.first_name, " ", a.last_name) LIKE ?)';
            const searchTerm = `%${search}%`;
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        queryParams.push(String(limitNum), String(offsetNum));

        console.log('Authors query params:', { pageNum, limitNum, offsetNum, search, queryParams });

        const [authors] = await mysqlPool.execute(`
            SELECT 
                a.*,
                COUNT(ba.book_id) as book_count
            FROM authors a
            LEFT JOIN book_authors ba ON a.author_id = ba.author_id
            ${whereClause}
            GROUP BY a.author_id
            ORDER BY a.last_name, a.first_name
            LIMIT ${limitNum} OFFSET ${offsetNum}
        `, queryParams.slice(0, -2));

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
                    currentPage: pageNum,
                    totalPages: Math.ceil(totalAuthors / limitNum),
                    totalAuthors,
                    limit: limitNum
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


// Delete an author
router.delete('/authors/:authorId', async (req, res) => {
    try {
        const authorId = parseInt(req.params.authorId);
        const staffId = req.user.user_id;

        if (isNaN(authorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid author ID'
            });
        }

        // Start transaction
        const connection = await mysqlPool.getConnection();
        await connection.beginTransaction();

        try {
            // Check if author exists and get their name for logging
            const [author] = await connection.execute(
                'SELECT first_name, last_name FROM authors WHERE author_id = ?',
                [authorId]
            );

            if (!author.length) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({
                    success: false,
                    message: 'Author not found'
                });
            }

            // Remove author from book_authors (cascade will handle this, but we want the count)
            const [bookAuthors] = await connection.execute(
                'SELECT COUNT(*) as count FROM book_authors WHERE author_id = ?',
                [authorId]
            );

            // Delete the author
            await connection.execute(
                'DELETE FROM authors WHERE author_id = ?',
                [authorId]
            );

            // Log the action
            await connection.execute(
                'INSERT INTO staff_logs (staff_id, action_type, target_table, target_id, old_values) VALUES (?, ?, ?, ?, ?)',
                [
                    staffId,
                    'delete_author',
                    'authors',
                    authorId,
                    JSON.stringify({
                        name: `${author[0].first_name} ${author[0].last_name}`,
                        associated_books: bookAuthors[0].count
                    })
                ]
            );

            await connection.commit();
            connection.release();

            res.json({
                success: true,
                message: 'Author deleted successfully'
            });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Delete author error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete author',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get single author
router.get('/authors/:authorId', async (req, res) => {
    try {
        const authorId = parseInt(req.params.authorId);

        if (isNaN(authorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid author ID'
            });
        }

        const [authors] = await mysqlPool.execute(
            'SELECT * FROM authors WHERE author_id = ?',
            [authorId]
        );

        if (!authors.length) {
            return res.status(404).json({
                success: false,
                message: 'Author not found'
            });
        }

        res.json({
            success: true,
            data: authors[0]
        });

    } catch (error) {
        console.error('Get author error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get author',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Update author information
router.put('/authors/:authorId', [
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('nationality').optional().isLength({ max: 100 }),
    body('biography').optional().isLength({ max: 1000 })
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

        const authorId = parseInt(req.params.authorId);
        const staffId = req.user.user_id;

        if (isNaN(authorId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid author ID'
            });
        }

        const { first_name, last_name, birth_date, nationality, biography } = req.body;

        // Check if author exists
        const [existingAuthor] = await mysqlPool.execute(
            'SELECT first_name, last_name FROM authors WHERE author_id = ?',
            [authorId]
        );

        if (!existingAuthor.length) {
            return res.status(404).json({
                success: false,
                message: 'Author not found'
            });
        }

        // Update author
        await mysqlPool.execute(
            `UPDATE authors 
             SET first_name = ?, last_name = ?, birth_date = ?, nationality = ?, biography = ?
             WHERE author_id = ?`,
            [first_name, last_name, birth_date, nationality, biography, authorId]
        );

        // Log the action
        await mysqlPool.execute(
            'INSERT INTO staff_logs (staff_id, action_type, target_table, target_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)',
            [
                staffId,
                'update_author',
                'authors',
                authorId,
                JSON.stringify({
                    name: `${existingAuthor[0].first_name} ${existingAuthor[0].last_name}`
                }),
                JSON.stringify({
                    name: `${first_name} ${last_name}`,
                    birth_date,
                    nationality,
                    biography
                })
            ]
        );

        res.json({
            success: true,
            message: 'Author updated successfully'
        });

    } catch (error) {
        console.error('Update author error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update author',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Update user information
router.put('/users/:userId', [
    body('first_name').notEmpty().withMessage('First name is required'),
    body('last_name').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('username').notEmpty().withMessage('Username is required'),
    body('user_type').isIn(['member', 'staff']).withMessage('User type must be member or staff'),
    body('is_active').isBoolean().withMessage('Active status must be boolean'),
    body('phone').optional().isString(),
    body('address').optional().isString()
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
        const { first_name, last_name, email, username, user_type, is_active, phone, address } = req.body;
        const staffId = req.user.user_id;

        // Check if user exists
        const [users] = await mysqlPool.execute(
            'SELECT * FROM users WHERE user_id = ?',
            [String(userId)]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if email or username already exists (excluding current user)
        const [existingUsers] = await mysqlPool.execute(
            'SELECT user_id FROM users WHERE (email = ? OR username = ?) AND user_id != ?',
            [email, username, String(userId)]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email or username already exists'
            });
        }

        // Update user
        await mysqlPool.execute(
            `UPDATE users SET 
                first_name = ?, 
                last_name = ?, 
                email = ?, 
                username = ?, 
                user_type = ?, 
                is_active = ?, 
                phone = ?, 
                address = ?,
                updated_at = NOW()
            WHERE user_id = ?`,
            [first_name, last_name, email, username, user_type, is_active, phone || null, address || null, String(userId)]
        );

        // Log the action
        await mysqlPool.execute(
            'INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
            [String(staffId), 'update_user', 'user', String(userId), JSON.stringify({
                updated_fields: { first_name, last_name, email, username, user_type, is_active, phone, address }
            })]
        );

        res.json({
            success: true,
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update user'
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
