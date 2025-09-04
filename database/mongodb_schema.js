// Smart Library Platform - MongoDB Schema and Aggregation Pipelines

// Database: smart_library_analytics
// Collection: reading_sessions

// Reading Sessions Collection Schema
// Each document represents a reading session for an eBook
db = db.getSiblingDB('smart_library_analytics');

// Create reading_sessions collection with validation
db.createCollection('reading_sessions', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['user_id', 'book_id', 'session_start', 'session_end', 'device_info'],
            properties: {
                user_id: {
                    bsonType: 'int',
                    description: 'User ID from MySQL users table'
                },
                book_id: {
                    bsonType: 'int',
                    description: 'Book ID from MySQL books table'
                },
                session_start: {
                    bsonType: 'date',
                    description: 'When the reading session started'
                },
                session_end: {
                    bsonType: 'date',
                    description: 'When the reading session ended'
                },
                device_info: {
                    bsonType: 'object',
                    required: ['device_type', 'platform'],
                    properties: {
                        device_type: {
                            bsonType: 'string',
                            enum: ['desktop', 'tablet', 'mobile', 'ereader'],
                            description: 'Type of device used for reading'
                        },
                        platform: {
                            bsonType: 'string',
                            description: 'Operating system or platform'
                        },
                        browser: {
                            bsonType: 'string',
                            description: 'Browser used (if applicable)'
                        },
                        app_version: {
                            bsonType: 'string',
                            description: 'App version (if applicable)'
                        }
                    }
                },
                pages_read: {
                    bsonType: 'int',
                    minimum: 0,
                    description: 'Number of pages read in this session'
                },
                total_pages: {
                    bsonType: 'int',
                    minimum: 1,
                    description: 'Total pages in the book'
                },
                reading_progress: {
                    bsonType: 'double',
                    minimum: 0,
                    maximum: 100,
                    description: 'Reading progress percentage'
                },
                highlights: {
                    bsonType: 'array',
                    items: {
                        bsonType: 'object',
                        required: ['page_number', 'text', 'highlighted_at'],
                        properties: {
                            page_number: {
                                bsonType: 'int',
                                minimum: 1
                            },
                            text: {
                                bsonType: 'string',
                                minLength: 1
                            },
                            highlight_type: {
                                bsonType: 'string',
                                enum: ['yellow', 'blue', 'green', 'pink', 'underline']
                            },
                            highlighted_at: {
                                bsonType: 'date'
                            },
                            note: {
                                bsonType: 'string'
                            }
                        }
                    }
                },
                bookmarks: {
                    bsonType: 'array',
                    items: {
                        bsonType: 'object',
                        required: ['page_number', 'bookmarked_at'],
                        properties: {
                            page_number: {
                                bsonType: 'int',
                                minimum: 1
                            },
                            bookmarked_at: {
                                bsonType: 'date'
                            },
                            note: {
                                bsonType: 'string'
                            }
                        }
                    }
                },
                session_quality: {
                    bsonType: 'object',
                    properties: {
                        focus_score: {
                            bsonType: 'double',
                            minimum: 0,
                            maximum: 1,
                            description: 'How focused the user was during reading'
                        },
                        reading_speed: {
                            bsonType: 'double',
                            minimum: 0,
                            description: 'Pages per minute'
                        },
                        interruptions: {
                            bsonType: 'int',
                            minimum: 0,
                            description: 'Number of times user left and returned'
                        }
                    }
                },
                location: {
                    bsonType: 'object',
                    properties: {
                        country: {
                            bsonType: 'string'
                        },
                        city: {
                            bsonType: 'string'
                        },
                        timezone: {
                            bsonType: 'string'
                        }
                    }
                },
                created_at: {
                    bsonType: 'date'
                }
            }
        }
    }
});

// Create indexes for better performance
db.reading_sessions.createIndex({ user_id: 1, session_start: -1 });
db.reading_sessions.createIndex({ book_id: 1, session_start: -1 });
db.reading_sessions.createIndex({ session_start: -1, session_end: -1 });
db.reading_sessions.createIndex({ "device_info.device_type": 1 });
db.reading_sessions.createIndex({ "highlights.page_number": 1 });
db.reading_sessions.createIndex({ "location.country": 1 });

// =============================================
// AGGREGATION PIPELINES
// =============================================

// 1. Average session time per user
function getAverageSessionTimePerUser() {
    return db.reading_sessions.aggregate([
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
    ]);
}

// 2. Most highlighted books
function getMostHighlightedBooks() {
    return db.reading_sessions.aggregate([
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
    ]);
}

// 3. Top 10 books by total reading time
function getTopBooksByReadingTime() {
    return db.reading_sessions.aggregate([
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
    ]);
}

// 4. Reading patterns by device type
function getReadingPatternsByDevice() {
    return db.reading_sessions.aggregate([
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
    ]);
}

// 5. Reading activity by time of day
function getReadingActivityByTimeOfDay() {
    return db.reading_sessions.aggregate([
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
    ]);
}

// 6. User reading behavior analysis
function getUserReadingBehavior(user_id) {
    return db.reading_sessions.aggregate([
        {
            $match: { user_id: user_id }
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
                user_id: user_id,
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
    ]);
}

// Export functions for use in the application
print("MongoDB schema and aggregation pipelines created successfully!");
print("Available functions:");
print("- getAverageSessionTimePerUser()");
print("- getMostHighlightedBooks()");
print("- getTopBooksByReadingTime()");
print("- getReadingPatternsByDevice()");
print("- getReadingActivityByTimeOfDay()");
print("- getUserReadingBehavior(user_id)");
