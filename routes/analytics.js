const express = require('express');
const { query, validationResult } = require('express-validator');
const { getMongoDB } = require('../config/database');
const { authenticateToken, requireStaff } = require('../middleware/auth');

const router = express.Router();

// Helper function to handle MongoDB errors
const handleMongoError = (error, res, operation) => {
    console.error(`${operation} error:`, error);
    res.status(500).json({
        success: false,
        message: error.message.includes('MongoDB not connected') ? 
            'Analytics service is temporarily unavailable. Please try again later.' : 
            `Failed to ${operation}`,
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
};

// Apply staff authentication to all analytics routes
router.use(authenticateToken);
router.use(requireStaff);

// Record reading session
router.post('/reading-session', [
    query('userId').isInt({ min: 1 }),
    query('bookId').isInt({ min: 1 })
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
            userId,
            bookId,
            sessionStart,
            sessionEnd,
            deviceInfo,
            pagesRead,
            totalPages,
            readingProgress,
            highlights,
            bookmarks,
            sessionQuality,
            location
        } = req.body;

        const db = getMongoDB();
        const collection = db.collection('reading_sessions');

        const sessionData = {
            user_id: parseInt(userId),
            book_id: parseInt(bookId),
            session_start: new Date(sessionStart),
            session_end: new Date(sessionEnd),
            device_info: deviceInfo,
            pages_read: pagesRead || 0,
            total_pages: totalPages || 1,
            reading_progress: readingProgress || 0,
            highlights: highlights || [],
            bookmarks: bookmarks || [],
            session_quality: sessionQuality || {},
            location: location || {},
            created_at: new Date()
        };

        const result = await collection.insertOne(sessionData);

        res.status(201).json({
            success: true,
            message: 'Reading session recorded successfully',
            data: { sessionId: result.insertedId }
        });

    } catch (error) {
        console.error('Record reading session error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record reading session',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Get average session time per user
router.get('/average-session-time', async (req, res) => {
    try {
        const db = getMongoDB();
        const collection = db.collection('reading_sessions');

        const pipeline = [
            {
                $addFields: {
                    session_duration_minutes: {
                        $divide: [
                            { $subtract: ["$session_end", "$session_start"] },
                            60000 // Convert milliseconds to minutes
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$user_id",
                    total_sessions: { $sum: 1 },
                    total_reading_time: { $sum: "$session_duration_minutes" },
                    average_session_time: { $avg: "$session_duration_minutes" },
                    longest_session: { $max: "$session_duration_minutes" },
                    shortest_session: { $min: "$session_duration_minutes" }
                }
            },
            {
                $sort: { average_session_time: -1 }
            },
            {
                $project: {
                    user_id: "$_id",
                    total_sessions: 1,
                    total_reading_time_minutes: { $round: ["$total_reading_time", 2] },
                    average_session_time_minutes: { $round: ["$average_session_time", 2] },
                    longest_session_minutes: { $round: ["$longest_session", 2] },
                    shortest_session_minutes: { $round: ["$shortest_session", 2] },
                    _id: 0
                }
            }
        ];

        const results = await collection.aggregate(pipeline).toArray();

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        handleMongoError(error, res, 'fetch average session time data');
    }
});

// Get most highlighted books
router.get('/most-highlighted-books', async (req, res) => {
    try {
        const db = getMongoDB();
        const collection = db.collection('reading_sessions');

        const pipeline = [
            {
                $unwind: "$highlights"
            },
            {
                $group: {
                    _id: "$book_id",
                    total_highlights: { $sum: 1 },
                    unique_users: { $addToSet: "$user_id" },
                    highlight_types: { $addToSet: "$highlights.highlight_type" }
                }
            },
            {
                $addFields: {
                    unique_user_count: { $size: "$unique_users" }
                }
            },
            {
                $sort: { total_highlights: -1 }
            },
            {
                $project: {
                    book_id: "$_id",
                    total_highlights: 1,
                    unique_users_count: "$unique_user_count",
                    highlight_types: 1,
                    _id: 0
                }
            },
            {
                $limit: 20
            }
        ];

        const results = await collection.aggregate(pipeline).toArray();

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        handleMongoError(error, res, 'fetch most highlighted books data');
    }
});

// Get top books by reading time
router.get('/top-books-reading-time', async (req, res) => {
    try {
        const db = getMongoDB();
        const collection = db.collection('reading_sessions');

        const pipeline = [
            {
                $addFields: {
                    session_duration_minutes: {
                        $divide: [
                            { $subtract: ["$session_end", "$session_start"] },
                            60000
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$book_id",
                    total_reading_time_minutes: { $sum: "$session_duration_minutes" },
                    total_sessions: { $sum: 1 },
                    unique_readers: { $addToSet: "$user_id" },
                    average_session_time: { $avg: "$session_duration_minutes" },
                    total_pages_read: { $sum: "$pages_read" }
                }
            },
            {
                $addFields: {
                    unique_reader_count: { $size: "$unique_readers" }
                }
            },
            {
                $sort: { total_reading_time_minutes: -1 }
            },
            {
                $project: {
                    book_id: "$_id",
                    total_reading_time_hours: { $round: [{ $divide: ["$total_reading_time_minutes", 60] }, 2] },
                    total_sessions: 1,
                    unique_readers_count: "$unique_reader_count",
                    average_session_time_minutes: { $round: ["$average_session_time", 2] },
                    total_pages_read: 1,
                    _id: 0
                }
            },
            {
                $limit: 10
            }
        ];

        const results = await collection.aggregate(pipeline).toArray();

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        handleMongoError(error, res, 'fetch top books by reading time data');
    }
});

// Get reading patterns by device type
router.get('/reading-patterns-by-device', async (req, res) => {
    try {
        const db = getMongoDB();
        const collection = db.collection('reading_sessions');

        const pipeline = [
            {
                $addFields: {
                    session_duration_minutes: {
                        $divide: [
                            { $subtract: ["$session_end", "$session_start"] },
                            60000
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$device_info.device_type",
                    total_sessions: { $sum: 1 },
                    total_reading_time: { $sum: "$session_duration_minutes" },
                    average_session_time: { $avg: "$session_duration_minutes" },
                    average_pages_per_session: { $avg: "$pages_read" },
                    total_highlights: { $sum: { $size: { $ifNull: ["$highlights", []] } } },
                    unique_users: { $addToSet: "$user_id" }
                }
            },
            {
                $addFields: {
                    unique_user_count: { $size: "$unique_users" }
                }
            },
            {
                $sort: { total_reading_time: -1 }
            },
            {
                $project: {
                    device_type: "$_id",
                    total_sessions: 1,
                    total_reading_time_hours: { $round: [{ $divide: ["$total_reading_time", 60] }, 2] },
                    average_session_time_minutes: { $round: ["$average_session_time", 2] },
                    average_pages_per_session: { $round: ["$average_pages_per_session", 2] },
                    total_highlights: 1,
                    unique_users_count: "$unique_user_count",
                    _id: 0
                }
            }
        ];

        const results = await collection.aggregate(pipeline).toArray();

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        handleMongoError(error, res, 'fetch reading patterns by device data');
    }
});

// Get reading activity by time of day
router.get('/reading-activity-by-time', async (req, res) => {
    try {
        const db = getMongoDB();
        const collection = db.collection('reading_sessions');

        const pipeline = [
            {
                $addFields: {
                    hour_of_day: { $hour: "$session_start" },
                    session_duration_minutes: {
                        $divide: [
                            { $subtract: ["$session_end", "$session_start"] },
                            60000
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$hour_of_day",
                    total_sessions: { $sum: 1 },
                    total_reading_time: { $sum: "$session_duration_minutes" },
                    average_session_time: { $avg: "$session_duration_minutes" },
                    unique_users: { $addToSet: "$user_id" }
                }
            },
            {
                $addFields: {
                    unique_user_count: { $size: "$unique_users" }
                }
            },
            {
                $sort: { _id: 1 }
            },
            {
                $project: {
                    hour_of_day: "$_id",
                    total_sessions: 1,
                    total_reading_time_hours: { $round: [{ $divide: ["$total_reading_time", 60] }, 2] },
                    average_session_time_minutes: { $round: ["$average_session_time", 2] },
                    unique_users_count: "$unique_user_count",
                    _id: 0
                }
            }
        ];

        const results = await collection.aggregate(pipeline).toArray();

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        handleMongoError(error, res, 'fetch reading activity by time data');
    }
});

// Get user reading behavior
router.get('/user-behavior/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        if (isNaN(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        const db = getMongoDB();
        const collection = db.collection('reading_sessions');

        const pipeline = [
            {
                $match: { user_id: userId }
            },
            {
                $addFields: {
                    session_duration_minutes: {
                        $divide: [
                            { $subtract: ["$session_end", "$session_start"] },
                            60000
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    total_sessions: { $sum: 1 },
                    total_reading_time: { $sum: "$session_duration_minutes" },
                    average_session_time: { $avg: "$session_duration_minutes" },
                    total_books_read: { $addToSet: "$book_id" },
                    total_highlights: { $sum: { $size: { $ifNull: ["$highlights", []] } } },
                    total_bookmarks: { $sum: { $size: { $ifNull: ["$bookmarks", []] } } },
                    preferred_device: { $first: "$device_info.device_type" },
                    first_session: { $min: "$session_start" },
                    last_session: { $max: "$session_end" }
                }
            },
            {
                $addFields: {
                    unique_books_count: { $size: "$total_books_read" }
                }
            },
            {
                $project: {
                    user_id: userId,
                    total_sessions: 1,
                    total_reading_time_hours: { $round: [{ $divide: ["$total_reading_time", 60] }, 2] },
                    average_session_time_minutes: { $round: ["$average_session_time", 2] },
                    unique_books_read: "$unique_books_count",
                    total_highlights: 1,
                    total_bookmarks: 1,
                    preferred_device: 1,
                    first_session: 1,
                    last_session: 1,
                    _id: 0
                }
            }
        ];

        const results = await collection.aggregate(pipeline).toArray();

        res.json({
            success: true,
            data: results[0] || {
                user_id: userId,
                total_sessions: 0,
                total_reading_time_hours: 0,
                average_session_time_minutes: 0,
                unique_books_read: 0,
                total_highlights: 0,
                total_bookmarks: 0,
                preferred_device: null,
                first_session: null,
                last_session: null
            }
        });

    } catch (error) {
        handleMongoError(error, res, 'fetch user behavior data');
    }
});

module.exports = router;
