const { mysqlPool } = require('../config/database');
const { validationResult } = require('express-validator');

class CheckoutController {
    // Borrow a book
    static async borrowBook(req, res) {
        try {
            console.log('Backend borrowBook called with body:', req.body);
            console.log('User from token:', req.user);
            
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.log('Validation errors:', errors.array());
                return res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: errors.array()
                });
            }

            const { bookId, dueDays = 14 } = req.body;
            const userId = req.user.user_id;
            console.log(`Processing borrow request: userId=${userId}, bookId=${bookId}, dueDays=${dueDays}`);

            // Check if user has any overdue books (active and past due)
            const [overdueCheckouts] = await mysqlPool.execute(`
                SELECT COUNT(*) as overdue_count
                FROM checkouts 
                WHERE user_id = ? AND status = 'active' AND due_date < NOW()
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
            let success, message;
            try {
                const [result] = await mysqlPool.execute(
                    'CALL BorrowBook(?, ?, ?, @success, @message)',
                    [userId, bookId, dueDays]
                );

                const [output] = await mysqlPool.execute('SELECT @success as success, @message as message');
                // Coerce MySQL user variable to a real boolean (handles '0'/'1', 0/1, true/false)
                success = Boolean(Number(output[0].success));
                message = output[0].message;
            } catch (procedureError) {
                console.error('Stored procedure error:', procedureError);
                // Fallback to direct SQL if stored procedure fails
                const [bookCheck] = await mysqlPool.execute(
                    'SELECT available_copies, is_retired FROM books WHERE book_id = ? FOR UPDATE',
                    [bookId]
                );

                if (bookCheck.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: 'Book not found'
                    });
                }

                const book = bookCheck[0];
                if (book.is_retired) {
                    return res.status(400).json({
                        success: false,
                        message: 'Book is retired'
                    });
                }

                if (book.available_copies <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'No available copies'
                    });
                }

                // Create checkout record
                await mysqlPool.execute(
                    'INSERT INTO checkouts (user_id, book_id, due_date, status) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), "active")',
                    [userId, bookId, dueDays]
                );

                // Update book availability
                await mysqlPool.execute(
                    'UPDATE books SET available_copies = available_copies - 1 WHERE book_id = ?',
                    [bookId]
                );

                success = true;
                message = 'Book borrowed successfully';
            }

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
    }

    // Return a book
    static async returnBook(req, res) {
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
            const raw = output[0];
            const success = Boolean(Number(raw.success));
            const message = raw.message;
            const late_fee = raw.late_fee;

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
    }

    // Get user's borrowed book IDs
    static async getUserBorrowedBookIds(req, res) {
        try {
            const userId = req.user.user_id;
            
            const [borrowedBooks] = await mysqlPool.execute(`
                SELECT book_id 
                FROM checkouts 
                WHERE user_id = ? AND status = 'active'
            `, [userId]);

            const bookIds = borrowedBooks.map(book => book.book_id);
            
            return res.json({
                success: true,
                data: bookIds
            });
        } catch (error) {
            console.error('Error getting user borrowed book IDs:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get user's current checkouts
    static async getUserCheckouts(req, res) {
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
                if (status === 'active') {
                    baseQuery += ` AND c.status = 'active' AND c.due_date >= NOW()`;
                } else if (status === 'overdue') {
                    baseQuery += ` AND c.status = 'active' AND c.due_date < NOW()`;
                } else if (status === 'returned') {
                    baseQuery += ` AND c.return_date IS NOT NULL`;
                }
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
                if (status === 'active') {
                    countQuery += ` AND c.status = 'active' AND c.due_date >= NOW()`;
                } else if (status === 'overdue') {
                    countQuery += ` AND c.status = 'active' AND c.due_date < NOW()`;
                } else if (status === 'returned') {
                    countQuery += ` AND c.return_date IS NOT NULL`;
                }
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
    }

    // Get checkout history
    static async getCheckoutHistory(req, res) {
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
                WHERE c.user_id = ${userId} AND c.return_date IS NOT NULL
                GROUP BY c.checkout_id
                ORDER BY c.return_date DESC
                LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
            `);

            // Get total count
            const [countResult] = await mysqlPool.execute(`
                SELECT COUNT(*) as total
                FROM checkouts 
                WHERE user_id = ? AND return_date IS NOT NULL
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
    }

    // Get overdue checkouts
    static async getOverdueCheckouts(req, res) {
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
                WHERE c.user_id = ? AND c.status = 'active' AND c.due_date < NOW()
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
    }

    // Get soon due books (notification for books due in the next few days)
    static async getSoonDueBooks(req, res) {
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
            const daysThreshold = parseInt(req.query.days) || 3; // Default to 3 days

            const [result] = await mysqlPool.execute(
                'CALL GetSoonDueBooks(?, ?)',
                [userId, daysThreshold]
            );

            res.json({
                success: true,
                message: `Books due within the next ${daysThreshold} days`,
                data: result[0]
            });
        } catch (error) {
            console.error('Get soon due books error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch soon due books',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Renew a book (extend due date)
    static async renewBook(req, res) {
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

            // Use stored procedure to renew book
            const [result] = await mysqlPool.execute(
                'CALL RenewBook(?, ?, ?, @success, @message)',
                [checkoutId, userId, additionalDays]
            );

            const [output] = await mysqlPool.execute('SELECT @success as success, @message as message');
            // Coerce MySQL user variable to a real boolean (handles '0'/'1', 0/1, true/false)
            const success = Boolean(Number(output[0].success));
            const message = output[0].message;

            if (success) {
                // Get the updated checkout details
                const [updatedCheckout] = await mysqlPool.execute(`
                    SELECT 
                        c.*,
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
                    WHERE c.checkout_id = ?
                    GROUP BY c.checkout_id, c.checkout_date, c.due_date, c.return_date, c.is_late, 
                            c.late_fee, c.status, b.book_id, b.title, b.isbn, b.cover_image_url
                `, [checkoutId]);

                res.json({
                    success: true,
                    message,
                    data: updatedCheckout[0]
                });
            } else {
                res.status(400).json({
                    success: false,
                    message
                });
            }
        } catch (error) {
            console.error('Renew book error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to renew book',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }

    // Search checkout history with filters
    static async searchCheckoutHistory(req, res) {
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
            const status = req.query.status || 'all';
            const searchTerm = req.query.search || null;
            const startDate = req.query.startDate || null;
            const endDate = req.query.endDate || null;

            const [result] = await mysqlPool.execute(
                'CALL SearchCheckoutHistory(?, ?, ?, ?, ?, ?, ?)',
                [userId, status, searchTerm, startDate, endDate, limit, offset]
            );

            // Count query for pagination - simplified approach
            let countQuery = 'SELECT COUNT(DISTINCT c.checkout_id) as total FROM checkouts c ';
            countQuery += 'JOIN books b ON c.book_id = b.book_id ';
            countQuery += 'LEFT JOIN book_authors ba ON b.book_id = ba.book_id ';
            countQuery += 'LEFT JOIN authors a ON ba.author_id = a.author_id ';
            countQuery += 'WHERE c.user_id = ? ';

            let countParams = [userId];
            
            if (status === 'active') {
                countQuery += 'AND c.status = "active" AND c.due_date >= NOW() ';
            } else if (status === 'overdue') {
                countQuery += 'AND c.status = "active" AND c.due_date < NOW() ';
            } else if (status === 'returned') {
                countQuery += 'AND c.return_date IS NOT NULL ';
            }

            if (searchTerm) {
                countQuery += 'AND (b.title LIKE ? OR b.isbn LIKE ? OR CONCAT(a.first_name, " ", a.last_name) LIKE ?) ';
                const searchPattern = `%${searchTerm}%`;
                countParams.push(searchPattern, searchPattern, searchPattern);
            }
            
            if (startDate) {
                countQuery += 'AND c.checkout_date >= ? ';
                countParams.push(startDate);
            }
            
            if (endDate) {
                countQuery += 'AND c.checkout_date <= ? ';
                countParams.push(endDate);
            }

            const [countResult] = await mysqlPool.execute(countQuery, countParams);
            const total = countResult[0].total;

            res.json({
                success: true,
                data: {
                    history: result[0],
                    pagination: {
                        currentPage: page,
                        totalPages: Math.ceil(total / limit),
                        totalItems: total,
                        limit
                    },
                    filters: {
                        status,
                        searchTerm,
                        startDate,
                        endDate
                    }
                }
            });
        } catch (error) {
            console.error('Search checkout history error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to search checkout history',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }
}

module.exports = CheckoutController;
