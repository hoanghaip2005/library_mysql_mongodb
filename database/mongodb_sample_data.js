// Smart Library Platform - MongoDB Sample Data
// This file contains sample reading session data for testing and demonstration

// Connect to MongoDB
db = db.getSiblingDB('smart_library_analytics');

// Clear existing data
db.reading_sessions.deleteMany({});

// Sample reading sessions data
const sampleReadingSessions = [
    {
        user_id: 2, // john_reader
        book_id: 1, // Harry Potter and the Philosopher's Stone
        session_start: new Date('2024-01-15T10:30:00Z'),
        session_end: new Date('2024-01-15T12:45:00Z'),
        device_info: {
            device_type: 'desktop',
            platform: 'Windows 11',
            browser: 'Chrome 120.0.0.0'
        },
        pages_read: 45,
        total_pages: 223,
        reading_progress: 20.2,
        highlights: [
            {
                page_number: 12,
                text: "You're a wizard, Harry.",
                highlight_type: 'yellow',
                highlighted_at: new Date('2024-01-15T11:15:00Z'),
                note: 'Iconic quote!'
            },
            {
                page_number: 25,
                text: "It does not do to dwell on dreams and forget to live.",
                highlight_type: 'blue',
                highlighted_at: new Date('2024-01-15T11:45:00Z'),
                note: 'Dumbledore wisdom'
            }
        ],
        bookmarks: [
            {
                page_number: 30,
                bookmarked_at: new Date('2024-01-15T11:30:00Z'),
                note: 'Chapter 3 - The Letters from No One'
            }
        ],
        session_quality: {
            focus_score: 0.85,
            reading_speed: 1.2, // pages per minute
            interruptions: 2
        },
        location: {
            country: 'United States',
            city: 'New York',
            timezone: 'America/New_York'
        },
        created_at: new Date('2024-01-15T10:30:00Z')
    },
    {
        user_id: 2, // john_reader
        book_id: 1, // Harry Potter and the Philosopher's Stone
        session_start: new Date('2024-01-16T14:20:00Z'),
        session_end: new Date('2024-01-16T16:30:00Z'),
        device_info: {
            device_type: 'mobile',
            platform: 'iOS 17.2',
            app_version: '2.1.0'
        },
        pages_read: 38,
        total_pages: 223,
        reading_progress: 35.9,
        highlights: [
            {
                page_number: 45,
                text: "There is no good and evil, there is only power and those too weak to seek it.",
                highlight_type: 'pink',
                highlighted_at: new Date('2024-01-16T15:10:00Z'),
                note: 'Voldemort quote'
            }
        ],
        bookmarks: [
            {
                page_number: 50,
                bookmarked_at: new Date('2024-01-16T15:30:00Z'),
                note: 'Chapter 4 - The Keeper of the Keys'
            }
        ],
        session_quality: {
            focus_score: 0.92,
            reading_speed: 1.1,
            interruptions: 1
        },
        location: {
            country: 'United States',
            city: 'New York',
            timezone: 'America/New_York'
        },
        created_at: new Date('2024-01-16T14:20:00Z')
    },
    {
        user_id: 3, // jane_reader
        book_id: 2, // 1984
        session_start: new Date('2024-01-25T09:15:00Z'),
        session_end: new Date('2024-01-25T11:45:00Z'),
        device_info: {
            device_type: 'tablet',
            platform: 'Android 14',
            browser: 'Chrome Mobile 120.0.0.0'
        },
        pages_read: 52,
        total_pages: 328,
        reading_progress: 15.9,
        highlights: [
            {
                page_number: 15,
                text: "Big Brother is watching you.",
                highlight_type: 'yellow',
                highlighted_at: new Date('2024-01-25T09:45:00Z'),
                note: 'Famous quote'
            },
            {
                page_number: 28,
                text: "War is peace. Freedom is slavery. Ignorance is strength.",
                highlight_type: 'red',
                highlighted_at: new Date('2024-01-25T10:20:00Z'),
                note: 'Party slogans'
            }
        ],
        bookmarks: [
            {
                page_number: 35,
                bookmarked_at: new Date('2024-01-25T10:30:00Z'),
                note: 'Chapter 2 - Important concepts'
            }
        ],
        session_quality: {
            focus_score: 0.88,
            reading_speed: 0.9,
            interruptions: 3
        },
        location: {
            country: 'United States',
            city: 'Los Angeles',
            timezone: 'America/Los_Angeles'
        },
        created_at: new Date('2024-01-25T09:15:00Z')
    },
    {
        user_id: 3, // jane_reader
        book_id: 2, // 1984
        session_start: new Date('2024-01-26T19:30:00Z'),
        session_end: new Date('2024-01-26T22:15:00Z'),
        device_info: {
            device_type: 'desktop',
            platform: 'macOS 14.2',
            browser: 'Safari 17.2'
        },
        pages_read: 67,
        total_pages: 328,
        reading_progress: 36.3,
        highlights: [
            {
                page_number: 45,
                text: "The Party seeks power entirely for its own sake.",
                highlight_type: 'blue',
                highlighted_at: new Date('2024-01-26T20:15:00Z'),
                note: 'Key insight'
            }
        ],
        bookmarks: [
            {
                page_number: 60,
                bookmarked_at: new Date('2024-01-26T21:00:00Z'),
                note: 'Chapter 3 - Thought Police'
            }
        ],
        session_quality: {
            focus_score: 0.95,
            reading_speed: 1.0,
            interruptions: 0
        },
        location: {
            country: 'United States',
            city: 'Los Angeles',
            timezone: 'America/Los_Angeles'
        },
        created_at: new Date('2024-01-26T19:30:00Z')
    },
    {
        user_id: 4, // bob_reader
        book_id: 3, // To Kill a Mockingbird
        session_start: new Date('2024-02-01T08:00:00Z'),
        session_end: new Date('2024-02-01T10:30:00Z'),
        device_info: {
            device_type: 'ereader',
            platform: 'Kindle OS 5.16.4',
            app_version: '1.0.0'
        },
        pages_read: 42,
        total_pages: 281,
        reading_progress: 15.0,
        highlights: [
            {
                page_number: 8,
                text: "You never really understand a person until you consider things from his point of view... Until you climb inside of his skin and walk around in it.",
                highlight_type: 'yellow',
                highlighted_at: new Date('2024-02-01T08:45:00Z'),
                note: 'Atticus wisdom'
            }
        ],
        bookmarks: [
            {
                page_number: 20,
                bookmarked_at: new Date('2024-02-01T09:15:00Z'),
                note: 'Chapter 2 - School begins'
            }
        ],
        session_quality: {
            focus_score: 0.90,
            reading_speed: 1.1,
            interruptions: 1
        },
        location: {
            country: 'United States',
            city: 'Chicago',
            timezone: 'America/Chicago'
        },
        created_at: new Date('2024-02-01T08:00:00Z')
    },
    {
        user_id: 4, // bob_reader
        book_id: 3, // To Kill a Mockingbird
        session_start: new Date('2024-02-02T20:15:00Z'),
        session_end: new Date('2024-02-02T23:00:00Z'),
        device_info: {
            device_type: 'desktop',
            platform: 'Windows 11',
            browser: 'Edge 120.0.0.0'
        },
        pages_read: 58,
        total_pages: 281,
        reading_progress: 35.6,
        highlights: [
            {
                page_number: 35,
                text: "The one place where a man ought to get a square deal is in a courtroom.",
                highlight_type: 'green',
                highlighted_at: new Date('2024-02-02T21:00:00Z'),
                note: 'Justice theme'
            }
        ],
        bookmarks: [
            {
                page_number: 45,
                bookmarked_at: new Date('2024-02-02T21:30:00Z'),
                note: 'Chapter 4 - Important scene'
            }
        ],
        session_quality: {
            focus_score: 0.87,
            reading_speed: 1.0,
            interruptions: 2
        },
        location: {
            country: 'United States',
            city: 'Chicago',
            timezone: 'America/Chicago'
        },
        created_at: new Date('2024-02-02T20:15:00Z')
    },
    {
        user_id: 5, // alice_reader
        book_id: 4, // The Great Gatsby
        session_start: new Date('2024-02-05T16:45:00Z'),
        session_end: new Date('2024-02-05T18:30:00Z'),
        device_info: {
            device_type: 'mobile',
            platform: 'iOS 17.2',
            app_version: '2.1.0'
        },
        pages_read: 35,
        total_pages: 180,
        reading_progress: 19.4,
        highlights: [
            {
                page_number: 12,
                text: "So we beat on, boats against the current, borne back ceaselessly into the past.",
                highlight_type: 'yellow',
                highlighted_at: new Date('2024-02-05T17:30:00Z'),
                note: 'Famous ending line'
            }
        ],
        bookmarks: [
            {
                page_number: 18,
                bookmarked_at: new Date('2024-02-05T17:45:00Z'),
                note: 'Chapter 1 - Nick meets Gatsby'
            }
        ],
        session_quality: {
            focus_score: 0.82,
            reading_speed: 1.3,
            interruptions: 4
        },
        location: {
            country: 'United States',
            city: 'Miami',
            timezone: 'America/New_York'
        },
        created_at: new Date('2024-02-05T16:45:00Z')
    },
    {
        user_id: 5, // alice_reader
        book_id: 4, // The Great Gatsby
        session_start: new Date('2024-02-06T21:00:00Z'),
        session_end: new Date('2024-02-06T23:45:00Z'),
        device_info: {
            device_type: 'tablet',
            platform: 'iPadOS 17.2',
            browser: 'Safari 17.2'
        },
        pages_read: 48,
        total_pages: 180,
        reading_progress: 46.1,
        highlights: [
            {
                page_number: 25,
                text: "Gatsby believed in the green light, the orgastic future that year by year recedes before us.",
                highlight_type: 'blue',
                highlighted_at: new Date('2024-02-06T22:15:00Z'),
                note: 'Green light symbolism'
            }
        ],
        bookmarks: [
            {
                page_number: 30,
                bookmarked_at: new Date('2024-02-06T22:30:00Z'),
                note: 'Chapter 2 - Valley of Ashes'
            }
        ],
        session_quality: {
            focus_score: 0.91,
            reading_speed: 1.1,
            interruptions: 1
        },
        location: {
            country: 'United States',
            city: 'Miami',
            timezone: 'America/New_York'
        },
        created_at: new Date('2024-02-06T21:00:00Z')
    },
    {
        user_id: 2, // john_reader
        book_id: 5, // Pride and Prejudice
        session_start: new Date('2024-02-10T13:30:00Z'),
        session_end: new Date('2024-02-10T16:15:00Z'),
        device_info: {
            device_type: 'desktop',
            platform: 'Windows 11',
            browser: 'Chrome 120.0.0.0'
        },
        pages_read: 55,
        total_pages: 432,
        reading_progress: 12.7,
        highlights: [
            {
                page_number: 20,
                text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
                highlight_type: 'yellow',
                highlighted_at: new Date('2024-02-10T14:00:00Z'),
                note: 'Famous opening line'
            }
        ],
        bookmarks: [
            {
                page_number: 35,
                bookmarked_at: new Date('2024-02-10T14:45:00Z'),
                note: 'Chapter 3 - The ball at Netherfield'
            }
        ],
        session_quality: {
            focus_score: 0.89,
            reading_speed: 0.8,
            interruptions: 2
        },
        location: {
            country: 'United States',
            city: 'New York',
            timezone: 'America/New_York'
        },
        created_at: new Date('2024-02-10T13:30:00Z')
    },
    {
        user_id: 3, // jane_reader
        book_id: 6, // The Adventures of Huckleberry Finn
        session_start: new Date('2024-02-12T10:15:00Z'),
        session_end: new Date('2024-02-12T12:30:00Z'),
        device_info: {
            device_type: 'mobile',
            platform: 'Android 14',
            app_version: '2.1.0'
        },
        pages_read: 40,
        total_pages: 366,
        reading_progress: 10.9,
        highlights: [
            {
                page_number: 15,
                text: "The Widow Douglas she took me for her son, and allowed she would sivilize me; but it was rough living in the house all the time.",
                highlight_type: 'green',
                highlighted_at: new Date('2024-02-12T11:00:00Z'),
                note: 'Huck\'s voice'
            }
        ],
        bookmarks: [
            {
                page_number: 25,
                bookmarked_at: new Date('2024-02-12T11:30:00Z'),
                note: 'Chapter 2 - Tom Sawyer\'s Gang'
            }
        ],
        session_quality: {
            focus_score: 0.85,
            reading_speed: 1.0,
            interruptions: 3
        },
        location: {
            country: 'United States',
            city: 'Los Angeles',
            timezone: 'America/Los_Angeles'
        },
        created_at: new Date('2024-02-12T10:15:00Z')
    },
    {
        user_id: 4, // bob_reader
        book_id: 7, // Mrs. Dalloway
        session_start: new Date('2024-02-15T15:20:00Z'),
        session_end: new Date('2024-02-15T17:45:00Z'),
        device_info: {
            device_type: 'ereader',
            platform: 'Kindle OS 5.16.4',
            app_version: '1.0.0'
        },
        pages_read: 38,
        total_pages: 194,
        reading_progress: 19.6,
        highlights: [
            {
                page_number: 8,
                text: "She had a perpetual sense, as she watched the taxi cabs, of being out, out, far out to sea and alone.",
                highlight_type: 'blue',
                highlighted_at: new Date('2024-02-15T16:00:00Z'),
                note: 'Stream of consciousness'
            }
        ],
        bookmarks: [
            {
                page_number: 20,
                bookmarked_at: new Date('2024-02-15T16:30:00Z'),
                note: 'Chapter 2 - Clarissa\'s morning'
            }
        ],
        session_quality: {
            focus_score: 0.93,
            reading_speed: 0.7,
            interruptions: 1
        },
        location: {
            country: 'United States',
            city: 'Chicago',
            timezone: 'America/Chicago'
        },
        created_at: new Date('2024-02-15T15:20:00Z')
    },
    {
        user_id: 5, // alice_reader
        book_id: 8, // The Old Man and the Sea
        session_start: new Date('2024-02-18T09:30:00Z'),
        session_end: new Date('2024-02-18T11:15:00Z'),
        device_info: {
            device_type: 'desktop',
            platform: 'macOS 14.2',
            browser: 'Safari 17.2'
        },
        pages_read: 25,
        total_pages: 127,
        reading_progress: 19.7,
        highlights: [
            {
                page_number: 10,
                text: "A man can be destroyed but not defeated.",
                highlight_type: 'yellow',
                highlighted_at: new Date('2024-02-18T10:15:00Z'),
                note: 'Key theme'
            }
        ],
        bookmarks: [
            {
                page_number: 15,
                bookmarked_at: new Date('2024-02-18T10:30:00Z'),
                note: 'The old man sets out'
            }
        ],
        session_quality: {
            focus_score: 0.88,
            reading_speed: 1.2,
            interruptions: 2
        },
        location: {
            country: 'United States',
            city: 'Miami',
            timezone: 'America/New_York'
        },
        created_at: new Date('2024-02-18T09:30:00Z')
    },
    {
        user_id: 2, // john_reader
        book_id: 9, // Beloved
        session_start: new Date('2024-02-20T19:45:00Z'),
        session_end: new Date('2024-02-20T22:30:00Z'),
        device_info: {
            device_type: 'tablet',
            platform: 'iPadOS 17.2',
            browser: 'Safari 17.2'
        },
        pages_read: 48,
        total_pages: 324,
        reading_progress: 14.8,
        highlights: [
            {
                page_number: 18,
                text: "Freeing yourself was one thing, claiming ownership of that freed self was another.",
                highlight_type: 'pink',
                highlighted_at: new Date('2024-02-20T20:30:00Z'),
                note: 'Powerful quote'
            }
        ],
        bookmarks: [
            {
                page_number: 30,
                bookmarked_at: new Date('2024-02-20T21:00:00Z'),
                note: 'Chapter 2 - Sethe\'s story'
            }
        ],
        session_quality: {
            focus_score: 0.94,
            reading_speed: 0.9,
            interruptions: 0
        },
        location: {
            country: 'United States',
            city: 'New York',
            timezone: 'America/New_York'
        },
        created_at: new Date('2024-02-20T19:45:00Z')
    },
    {
        user_id: 3, // jane_reader
        book_id: 10, // One Hundred Years of Solitude
        session_start: new Date('2024-02-22T14:00:00Z'),
        session_end: new Date('2024-02-22T17:30:00Z'),
        device_info: {
            device_type: 'desktop',
            platform: 'Windows 11',
            browser: 'Chrome 120.0.0.0'
        },
        pages_read: 62,
        total_pages: 417,
        reading_progress: 14.9,
        highlights: [
            {
                page_number: 25,
                text: "Many years later, as he faced the firing squad, Colonel Aureliano Buendía was to remember that distant afternoon when his father took him to discover ice.",
                highlight_type: 'yellow',
                highlighted_at: new Date('2024-02-22T15:15:00Z'),
                note: 'Famous opening'
            }
        ],
        bookmarks: [
            {
                page_number: 40,
                bookmarked_at: new Date('2024-02-22T16:00:00Z'),
                note: 'Chapter 2 - The founding of Macondo'
            }
        ],
        session_quality: {
            focus_score: 0.91,
            reading_speed: 0.8,
            interruptions: 1
        },
        location: {
            country: 'United States',
            city: 'Los Angeles',
            timezone: 'America/Los_Angeles'
        },
        created_at: new Date('2024-02-22T14:00:00Z')
    },
    {
        user_id: 4, // bob_reader
        book_id: 11, // Harry Potter and the Chamber of Secrets
        session_start: new Date('2024-03-01T11:30:00Z'),
        session_end: new Date('2024-03-01T14:15:00Z'),
        device_info: {
            device_type: 'mobile',
            platform: 'iOS 17.2',
            app_version: '2.1.0'
        },
        pages_read: 52,
        total_pages: 251,
        reading_progress: 20.7,
        highlights: [
            {
                page_number: 15,
                text: "It is our choices, Harry, that show what we truly are, far more than our abilities.",
                highlight_type: 'blue',
                highlighted_at: new Date('2024-03-01T12:30:00Z'),
                note: 'Dumbledore wisdom'
            }
        ],
        bookmarks: [
            {
                page_number: 30,
                bookmarked_at: new Date('2024-03-01T13:00:00Z'),
                note: 'Chapter 3 - The Burrow'
            }
        ],
        session_quality: {
            focus_score: 0.87,
            reading_speed: 1.1,
            interruptions: 2
        },
        location: {
            country: 'United States',
            city: 'Chicago',
            timezone: 'America/Chicago'
        },
        created_at: new Date('2024-03-01T11:30:00Z')
    },
    {
        user_id: 5, // alice_reader
        book_id: 12, // Animal Farm
        session_start: new Date('2024-03-05T16:20:00Z'),
        session_end: new Date('2024-03-05T18:45:00Z'),
        device_info: {
            device_type: 'ereader',
            platform: 'Kindle OS 5.16.4',
            app_version: '1.0.0'
        },
        pages_read: 28,
        total_pages: 112,
        reading_progress: 25.0,
        highlights: [
            {
                page_number: 8,
                text: "All animals are equal, but some animals are more equal than others.",
                highlight_type: 'red',
                highlighted_at: new Date('2024-03-05T17:00:00Z'),
                note: 'Famous quote'
            }
        ],
        bookmarks: [
            {
                page_number: 15,
                bookmarked_at: new Date('2024-03-05T17:30:00Z'),
                note: 'Chapter 2 - The rebellion'
            }
        ],
        session_quality: {
            focus_score: 0.92,
            reading_speed: 1.3,
            interruptions: 1
        },
        location: {
            country: 'United States',
            city: 'Miami',
            timezone: 'America/New_York'
        },
        created_at: new Date('2024-03-05T16:20:00Z')
    }
];

// Insert sample data
db.reading_sessions.insertMany(sampleReadingSessions);

// Display summary
print("MongoDB Sample Data Inserted Successfully");
print("Total reading sessions: " + db.reading_sessions.countDocuments());

// Show some statistics
print("\nReading Sessions by Device Type:");
db.reading_sessions.aggregate([
    {
        $group: {
            _id: "$device_info.device_type",
            count: { $sum: 1 },
            total_pages: { $sum: "$pages_read" }
        }
    },
    { $sort: { count: -1 } }
]).forEach(printjson);

print("\nReading Sessions by User:");
db.reading_sessions.aggregate([
    {
        $group: {
            _id: "$user_id",
            sessions: { $sum: 1 },
            total_pages: { $sum: "$pages_read" },
            total_highlights: { $sum: { $size: { $ifNull: ["$highlights", []] } } }
        }
    },
    { $sort: { sessions: -1 } }
]).forEach(printjson);

print("\nMost Highlighted Books:");
db.reading_sessions.aggregate([
    { $unwind: "$highlights" },
    {
        $group: {
            _id: "$book_id",
            highlight_count: { $sum: 1 }
        }
    },
    { $sort: { highlight_count: -1 } },
    { $limit: 5 }
]).forEach(printjson);
