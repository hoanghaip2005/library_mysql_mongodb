-- Optional indexes to support common queries from routes
USE smart_library;

-- Books search
ALTER TABLE books ADD INDEX idx_books_title_full (title);
ALTER TABLE books ADD INDEX idx_books_available (available_copies);

-- Checkouts queries
ALTER TABLE checkouts ADD INDEX idx_checkouts_user_status (user_id, status);
ALTER TABLE checkouts ADD INDEX idx_checkouts_due_date (due_date);

-- Reviews queries
ALTER TABLE reviews ADD INDEX idx_reviews_book_date (book_id, review_date);

-- Users queries
ALTER TABLE users ADD INDEX idx_users_username_email (username, email);


