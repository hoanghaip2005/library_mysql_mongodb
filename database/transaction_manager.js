// Smart Library - Transaction Management Utilities

const { mysqlPool } = require('../config/database');

class TransactionManager {
    // Maximum retry attempts for deadlock situations
    static MAX_RETRIES = 3;
    // Delay between retries (ms)
    static RETRY_DELAY = 1000;

    /**
     * Execute a function within a transaction with deadlock retry logic
     * @param {Function} callback - Function to execute within transaction
     * @returns {Promise} - Result of the transaction
     */
    static async executeWithRetry(callback) {
        let retryCount = 0;
        
        while (retryCount < this.MAX_RETRIES) {
            const connection = await mysqlPool.getConnection();
            
            try {
                await connection.beginTransaction();
                
                // Set transaction isolation level
                await connection.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
                
                // Execute the callback with the connection
                const result = await callback(connection);
                
                await connection.commit();
                connection.release();
                
                return result;
            } catch (error) {
                await connection.rollback();
                connection.release();
                
                // Check if error is a deadlock
                if (error.code === 'ER_LOCK_DEADLOCK' && retryCount < this.MAX_RETRIES - 1) {
                    retryCount++;
                    console.log(`Deadlock detected, retry attempt ${retryCount}`);
                    await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                    continue;
                }
                
                throw error;
            }
        }
    }

    /**
     * Borrow a book with concurrency handling
     */
    static async borrowBook(userId, bookId, dueDays) {
        return this.executeWithRetry(async (connection) => {
            // Lock the book record
            const [bookRows] = await connection.execute(
                'SELECT available_copies, is_retired FROM books WHERE book_id = ? FOR UPDATE',
                [bookId]
            );

            if (bookRows.length === 0) {
                throw new Error('Book not found');
            }

            const book = bookRows[0];
            
            if (book.is_retired) {
                throw new Error('Book is retired');
            }

            if (book.available_copies <= 0) {
                throw new Error('No copies available');
            }

            // Create checkout record
            await connection.execute(
                'INSERT INTO checkouts (user_id, book_id, due_date) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))',
                [userId, bookId, dueDays]
            );

            // Update book availability
            await connection.execute(
                'UPDATE books SET available_copies = available_copies - 1 WHERE book_id = ?',
                [bookId]
            );

            return { success: true, message: 'Book borrowed successfully' };
        });
    }

    /**
     * Return a book with concurrency handling
     */
    static async returnBook(checkoutId) {
        return this.executeWithRetry(async (connection) => {
            // Lock the checkout record
            const [checkoutRows] = await connection.execute(
                `SELECT c.*, b.book_id 
                 FROM checkouts c 
                 JOIN books b ON c.book_id = b.book_id 
                 WHERE c.checkout_id = ? 
                 FOR UPDATE`,
                [checkoutId]
            );

            if (checkoutRows.length === 0) {
                throw new Error('Checkout record not found');
            }

            const checkout = checkoutRows[0];

            if (checkout.status !== 'active') {
                throw new Error('Checkout is not active');
            }

            // Calculate late fee
            const dueDate = new Date(checkout.due_date);
            const now = new Date();
            const daysLate = Math.max(0, Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)));
            const lateFee = daysLate * 1.00; // $1 per day

            // Update checkout record
            await connection.execute(
                `UPDATE checkouts 
                 SET return_date = NOW(),
                     status = ?,
                     is_late = ?,
                     late_fee = ?
                 WHERE checkout_id = ?`,
                [daysLate > 0 ? 'overdue' : 'returned', daysLate > 0, lateFee, checkoutId]
            );

            // Update book availability
            await connection.execute(
                'UPDATE books SET available_copies = available_copies + 1 WHERE book_id = ?',
                [checkout.book_id]
            );

            return {
                success: true,
                message: 'Book returned successfully',
                lateFee: lateFee
            };
        });
    }

    /**
     * Update inventory with concurrency handling
     */
    static async updateInventory(staffId, bookId, newTotal) {
        return this.executeWithRetry(async (connection) => {
            // Lock the book record
            const [bookRows] = await connection.execute(
                'SELECT total_copies, available_copies FROM books WHERE book_id = ? FOR UPDATE',
                [bookId]
            );

            if (bookRows.length === 0) {
                throw new Error('Book not found');
            }

            const book = bookRows[0];
            const checkedOut = book.total_copies - book.available_copies;
            const newAvailable = Math.max(0, newTotal - checkedOut);

            // Update book inventory
            await connection.execute(
                'UPDATE books SET total_copies = ?, available_copies = ? WHERE book_id = ?',
                [newTotal, newAvailable, bookId]
            );

            // Log the update
            await connection.execute(
                `INSERT INTO staff_logs (staff_id, action_type, target_table, target_id, old_values, new_values)
                 VALUES (?, 'update_inventory', 'books', ?, ?, ?)`,
                [
                    staffId,
                    bookId,
                    JSON.stringify({ total_copies: book.total_copies, available_copies: book.available_copies }),
                    JSON.stringify({ total_copies: newTotal, available_copies: newAvailable })
                ]
            );

            return {
                success: true,
                message: 'Inventory updated successfully'
            };
        });
    }
}

module.exports = TransactionManager;
