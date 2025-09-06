const express = require('express');
const { body, query } = require('express-validator');
const { authenticateToken, requireReader } = require('../middleware/auth');
const CheckoutController = require('../controllers/checkoutController');

const router = express.Router();

// Borrow a book
router.post('/borrow', authenticateToken, requireReader, [
    body('bookId').isInt({ min: 1 }),
    body('dueDays').optional().isInt({ min: 1, max: 30 })
], CheckoutController.borrowBook);

// Return a book
router.post('/return', authenticateToken, requireReader, [
    body('checkoutId').isInt({ min: 1 })
], CheckoutController.returnBook);

// Get user's borrowed book IDs
router.get('/my-borrowed-ids', authenticateToken, requireReader, CheckoutController.getUserBorrowedBookIds);

// Get user's current checkouts
router.get('/my-checkouts', authenticateToken, requireReader, [
    query('status').optional().isIn(['active', 'returned', 'overdue']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
], CheckoutController.getUserCheckouts);

// Get checkout history
router.get('/history', authenticateToken, requireReader, [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
], CheckoutController.getCheckoutHistory);

// Get overdue checkouts
router.get('/overdue', authenticateToken, requireReader, CheckoutController.getOverdueCheckouts);

// Get soon due books (notification for books due in the next few days)
router.get('/soon-due', authenticateToken, requireReader, [
    query('days').optional().isInt({ min: 1, max: 14 })
], CheckoutController.getSoonDueBooks);

// Renew a book (extend due date)
router.post('/renew', authenticateToken, requireReader, [
    body('checkoutId').isInt({ min: 1 }),
    body('additionalDays').optional().isInt({ min: 1, max: 14 })
], CheckoutController.renewBook);

// Search checkout history with filters
router.get('/search-history', authenticateToken, requireReader, [
    query('status').optional().isIn(['active', 'overdue', 'returned', 'all']),
    query('search').optional().isString(),
    query('startDate').optional().isDate(),
    query('endDate').optional().isDate(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
], CheckoutController.searchCheckoutHistory);

module.exports = router;
