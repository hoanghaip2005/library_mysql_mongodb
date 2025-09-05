// Smart Library - Sample analytics documents for development

/* Example to run in Mongo shell or a script:
use smart_library_analytics
db.reading_sessions.insertMany([
  {
    user_id: 2,
    book_id: 1,
    session_start: new Date(Date.now() - 2 * 60 * 60 * 1000),
    session_end: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
    device_info: { device_type: 'mobile', os: 'Android', app_version: '1.0.0' },
    pages_read: 30,
        total_pages: 328,
    reading_progress: 10,
    highlights: [{ page: 10, highlight_type: 'text' }],
    bookmarks: [{ page: 15 }],
    session_quality: { focus: 0.9 },
    location: { country: 'VN' },
    created_at: new Date()
  },
  {
    user_id: 3,
    book_id: 2,
    session_start: new Date(Date.now() - 90 * 60 * 1000),
    session_end: new Date(Date.now() - 45 * 60 * 1000),
    device_info: { device_type: 'desktop', os: 'Windows', app_version: '1.0.0' },
        pages_read: 25,
    total_pages: 279,
    reading_progress: 9,
    highlights: [],
    bookmarks: [{ page: 40 }],
    session_quality: { focus: 0.8 },
    location: { country: 'VN' },
    created_at: new Date()
  }
])
*/


