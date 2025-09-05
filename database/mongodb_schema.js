// Smart Library - MongoDB analytics collections and indexes
// This script describes the collections expected by analytics routes.

/*
Database: smart_library_analytics

Collections:
- reading_sessions

Fields used by routes:
- user_id (Number)
- book_id (Number)
- session_start (Date)
- session_end (Date)
- device_info (Object) { device_type, os, app_version }
- pages_read (Number)
- total_pages (Number)
- reading_progress (Number)
- highlights (Array of Objects)
- bookmarks (Array of Objects)
- session_quality (Object)
- location (Object)
- created_at (Date)
*/

// Example Mongo shell commands (run manually or via a driver):
// use smart_library_analytics
// db.createCollection('reading_sessions')
// db.reading_sessions.createIndexes([
//   { key: { user_id: 1 } },
//   { key: { book_id: 1 } },
//   { key: { session_start: -1 } },
//   { key: { 'device_info.device_type': 1 } }
// ])


