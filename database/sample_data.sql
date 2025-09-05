-- Smart Library - Minimal sample data for development
USE smart_library;

-- Users (2 readers, 1 staff). Password hashes are placeholders.
INSERT INTO users (username, email, password_hash, first_name, last_name, user_type)
VALUES
('admin', 'admin@example.com', '$2b$10$abcdefghijklmnopqrstuv', 'Admin', 'User', 'staff'),
('john_reader', 'john@example.com', '$2b$10$abcdefghijklmnopqrstuv', 'John', 'Reader', 'reader'),
('jane_reader', 'jane@example.com', '$2b$10$abcdefghijklmnopqrstuv', 'Jane', 'Reader', 'reader')
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- Authors
INSERT INTO authors (first_name, last_name, nationality)
VALUES
('George', 'Orwell', 'British'),
('Jane', 'Austen', 'British'),
('Haruki', 'Murakami', 'Japanese')
ON DUPLICATE KEY UPDATE nationality = VALUES(nationality);

-- Books
INSERT INTO books (isbn, title, publisher, publication_date, genre, language, total_copies, available_copies, pages, description)
VALUES
('9780451524935', '1984', 'Secker & Warburg', '1949-06-08', 'Dystopian', 'English', 5, 5, 328, 'A dystopian social science fiction novel.'),
('9780141439518', 'Pride and Prejudice', 'T. Egerton', '1813-01-28', 'Romance', 'English', 4, 4, 279, 'A romantic novel of manners.'),
('9780307476463', 'Kafka on the Shore', 'Shinchosha', '2002-09-12', 'Magical Realism', 'English', 3, 3, 505, 'A novel by Haruki Murakami.')
ON DUPLICATE KEY UPDATE publisher = VALUES(publisher);

-- Link authors to books
INSERT IGNORE INTO book_authors (book_id, author_id)
SELECT b.book_id, a.author_id FROM books b JOIN authors a ON b.title = '1984' AND a.last_name = 'Orwell';
INSERT IGNORE INTO book_authors (book_id, author_id)
SELECT b.book_id, a.author_id FROM books b JOIN authors a ON b.title = 'Pride and Prejudice' AND a.last_name = 'Austen';
INSERT IGNORE INTO book_authors (book_id, author_id)
SELECT b.book_id, a.author_id FROM books b JOIN authors a ON b.title = 'Kafka on the Shore' AND a.last_name = 'Murakami';

-- Reviews (avoid selecting from books within INSERT due to triggers)
SET @john := (SELECT user_id FROM users WHERE username = 'john_reader');
SET @jane := (SELECT user_id FROM users WHERE username = 'jane_reader');
SET @b1984 := (SELECT book_id FROM books WHERE isbn = '9780451524935' ORDER BY book_id LIMIT 1);
SET @bpp := (SELECT book_id FROM books WHERE isbn = '9780141439518' ORDER BY book_id LIMIT 1);

INSERT INTO reviews (user_id, book_id, rating, comment, is_approved)
VALUES (@john, @b1984, 5, 'Amazing book!', 1);

INSERT INTO reviews (user_id, book_id, rating, comment, is_approved)
VALUES (@jane, @bpp, 4, 'Lovely classic.', 1);


