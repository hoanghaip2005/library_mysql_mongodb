-- Smart Library - Sample data for development
USE smart_library;

-- Users (staff and readers)
INSERT INTO users (username, email, password_hash, first_name, last_name, user_type)
VALUES
('admin', 'admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewqkfQQKPJ.80FSO', 'Admin', 'User', 'staff'), -- password: admin123
('librarian1', 'librarian1@example.com', '$2b$12$1V0kcgCUbM8XsSbDU18Opu0zwRlpXjZuPRd23AWkHt3Pg4ow/TtAS', 'Sarah', 'Johnson', 'staff'), -- password: librarian123
('librarian2', 'librarian2@example.com', '$2b$12$LQ9J0AMrWg/a/C1gXKYeR.o4/tRHHnZsK8yH9QhRwA2wGeAEV8Yfy', 'Michael', 'Brown', 'staff'), -- password: librarian123
('john_reader', 'john@example.com', '$2b$12$k8Y1THPD5MsEVkqhFX1/ROuQTH2rnzYqmBpYwvYQ0p1lHvJdVzKue', 'John', 'Reader', 'reader'), -- password: password123
('jane_reader', 'jane@example.com', '$2b$12$TCwQJ9DtE/MCpxHcH3q8n.BzwDQyi2EsQ0ePUyqzQOYoCGWoQ9IVm', 'Jane', 'Reader', 'reader'), -- password: password123
('alice_smith', 'alice@example.com', '$2b$12$mpQ6MUY9Qz8iSyHUe1HKbOkXM3t/0o1akRo4g8OJR3zmaNuJJ0L4K', 'Alice', 'Smith', 'reader'), -- password: password123
('bob_jones', 'bob@example.com', '$2b$12$t6l2woEKG94cxHr6Y9O6pejXtNBANIRcPVOeTHwlXndzCqHtxoRyW', 'Bob', 'Jones', 'reader'), -- password: password123
('emma_davis', 'emma@example.com', '$2b$12$6YBpqttN4oP0eK.eLEGoge8rTWp0dGR1eCpIJQVrjmzFqX6s0QweC', 'Emma', 'Davis', 'reader'), -- password: password123
('david_wilson', 'david@example.com', '$2b$12$yQ3N8gZ0RQVjk4.lM4k0EO5pSvOolhGYL8QEXuaH.HrMCexJ7q1Vu', 'David', 'Wilson', 'reader')
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- Authors with more diverse nationalities and birth dates
INSERT INTO authors (first_name, last_name, nationality, birth_date, biography)
VALUES
('George', 'Orwell', 'British', '1903-06-25', 'English novelist and essayist, known for political writing.'),
('Jane', 'Austen', 'British', '1775-12-16', 'English novelist known for romantic fiction and social commentary.'),
('Haruki', 'Murakami', 'Japanese', '1949-01-12', 'Contemporary Japanese writer known for surrealist fiction.'),
('Gabriel', 'García Márquez', 'Colombian', '1927-03-06', 'Nobel Prize winner known for magical realism.'),
('Virginia', 'Woolf', 'British', '1882-01-25', 'Modernist writer and pioneer of stream of consciousness.'),
('Franz', 'Kafka', 'Czech', '1883-07-03', 'Influential German-language writer of the 20th century.'),
('Agatha', 'Christie', 'British', '1890-09-15', 'Best-selling novelist of all time, queen of mystery.'),
('Jorge Luis', 'Borges', 'Argentine', '1899-08-24', 'Pioneer of magical realism and philosophical literature.'),
('Leo', 'Tolstoy', 'Russian', '1828-09-09', 'Master of realistic fiction and philosophical thought.'),
('Isabel', 'Allende', 'Chilean', '1942-08-02', 'Known for magical realist novels and historical fiction.')
ON DUPLICATE KEY UPDATE nationality = VALUES(nationality);

-- Books with varied genres and publication dates
INSERT INTO books (isbn, title, publisher, publication_date, genre, language, total_copies, available_copies, pages, description)
VALUES
('9780451524935', '1984', 'Secker & Warburg', '1949-06-08', 'Dystopian', 'English', 5, 5, 328, 'A dystopian social science fiction novel.'),
('9780141439518', 'Pride and Prejudice', 'T. Egerton', '1813-01-28', 'Romance', 'English', 4, 4, 279, 'A romantic novel of manners.'),
('9780307476463', 'Kafka on the Shore', 'Shinchosha', '2002-09-12', 'Magical Realism', 'English', 3, 3, 505, 'A novel by Haruki Murakami.'),
('9780060883287', 'One Hundred Years of Solitude', 'Harper', '1967-05-30', 'Magical Realism', 'English', 3, 2, 417, 'Multi-generational saga of the Buendía family.'),
('9780156628709', 'To the Lighthouse', 'Hogarth Press', '1927-05-05', 'Modernist', 'English', 4, 4, 209, 'Pioneering work of modernist literature.'),
('9780805211061', 'The Metamorphosis', 'Schocken', '1915-10-15', 'Surrealist', 'English', 6, 5, 201, 'Novella about a man who transforms into an insect.'),
('9780062073495', 'Murder on the Orient Express', 'Collins Crime Club', '1934-01-01', 'Mystery', 'English', 5, 3, 256, 'Classic detective novel featuring Hercule Poirot.'),
('9780142437339', 'War and Peace', 'The Russian Messenger', '1869-01-01', 'Historical Fiction', 'English', 3, 3, 1225, 'Epic novel of Russian society during the Napoleonic Era.'),
('9780553383829', 'The House of the Spirits', 'Plaza & Janés', '1982-01-01', 'Magical Realism', 'English', 4, 4, 433, 'Story of the Trueba family spanning three generations.'),
('9780143039952', 'Mrs. Dalloway', 'Hogarth Press', '1925-05-14', 'Modernist', 'English', 5, 5, 194, 'A day in the life of Clarissa Dalloway.')
ON DUPLICATE KEY UPDATE publisher = VALUES(publisher);

-- Link authors to books
INSERT IGNORE INTO book_authors (book_id, author_id)
SELECT b.book_id, a.author_id FROM books b JOIN authors a 
WHERE (b.title = '1984' AND a.last_name = 'Orwell')
   OR (b.title = 'Pride and Prejudice' AND a.last_name = 'Austen')
   OR (b.title = 'Kafka on the Shore' AND a.last_name = 'Murakami')
   OR (b.title = 'One Hundred Years of Solitude' AND a.last_name = 'García Márquez')
   OR (b.title = 'To the Lighthouse' AND a.last_name = 'Woolf')
   OR (b.title = 'The Metamorphosis' AND a.last_name = 'Kafka')
   OR (b.title = 'Murder on the Orient Express' AND a.last_name = 'Christie')
   OR (b.title = 'War and Peace' AND a.last_name = 'Tolstoy')
   OR (b.title = 'The House of the Spirits' AND a.last_name = 'Allende')
   OR (b.title = 'Mrs. Dalloway' AND a.last_name = 'Woolf');

-- Set user variables for easier reference
SET @john := (SELECT user_id FROM users WHERE username = 'john_reader');
SET @jane := (SELECT user_id FROM users WHERE username = 'jane_reader');
SET @alice := (SELECT user_id FROM users WHERE username = 'alice_smith');
SET @bob := (SELECT user_id FROM users WHERE username = 'bob_jones');
SET @emma := (SELECT user_id FROM users WHERE username = 'emma_davis');
SET @david := (SELECT user_id FROM users WHERE username = 'david_wilson');

-- Store book IDs in variables for easier reference
SET @book_1984 := (SELECT book_id FROM books WHERE title = '1984' LIMIT 1);
SET @book_pride := (SELECT book_id FROM books WHERE title = 'Pride and Prejudice' LIMIT 1);
SET @book_kafka := (SELECT book_id FROM books WHERE title = 'Kafka on the Shore' LIMIT 1);
SET @book_solitude := (SELECT book_id FROM books WHERE title = 'One Hundred Years of Solitude' LIMIT 1);
SET @book_lighthouse := (SELECT book_id FROM books WHERE title = 'To the Lighthouse' LIMIT 1);
SET @book_metamorphosis := (SELECT book_id FROM books WHERE title = 'The Metamorphosis' LIMIT 1);
SET @book_murder := (SELECT book_id FROM books WHERE title = 'Murder on the Orient Express' LIMIT 1);
SET @book_war := (SELECT book_id FROM books WHERE title = 'War and Peace' LIMIT 1);
SET @book_spirits := (SELECT book_id FROM books WHERE title = 'The House of the Spirits' LIMIT 1);
SET @book_dalloway := (SELECT book_id FROM books WHERE title = 'Mrs. Dalloway' LIMIT 1);

-- Add reviews one by one to avoid trigger conflicts
INSERT INTO reviews (user_id, book_id, rating, comment, is_approved)
VALUES
(@john, @book_1984, 5, 'Absolutely brilliant! A masterpiece that everyone should read.', 1),
(@jane, @book_pride, 4, 'Very engaging story with memorable characters.', 1),
(@alice, @book_kafka, 3, 'Interesting concept but somewhat difficult to follow.', 1),
(@bob, @book_solitude, 5, 'One of the best books I have ever read. Highly recommended!', 1),
(@emma, @book_lighthouse, 4, 'Well-written and thought-provoking.', 1),
(@david, @book_metamorphosis, 5, 'A classic for good reason. Fascinating read.', 1),
(@john, @book_murder, 4, 'Engaging mystery that keeps you guessing until the end.', 1),
(@jane, @book_war, 5, 'Epic masterpiece with deep character development.', 1),
(@alice, @book_spirits, 4, 'Beautiful blend of reality and magic.', 1),
(@bob, @book_dalloway, 3, 'Innovative writing style but requires careful reading.', 1);

-- Add checkouts one by one
INSERT INTO checkouts (user_id, book_id, checkout_date, due_date, return_date, status)
VALUES
(@john, @book_1984, 
    DATE_SUB(NOW(), INTERVAL 20 DAY),
    DATE_SUB(NOW(), INTERVAL 6 DAY),
    DATE_SUB(NOW(), INTERVAL 5 DAY),
    'returned'),
(@jane, @book_pride,
    DATE_SUB(NOW(), INTERVAL 10 DAY),
    DATE_SUB(NOW(), INTERVAL -4 DAY),
    NULL,
    'active'),
(@alice, @book_kafka,
    DATE_SUB(NOW(), INTERVAL 30 DAY),
    DATE_SUB(NOW(), INTERVAL 16 DAY),
    DATE_SUB(NOW(), INTERVAL 15 DAY),
    'returned'),
(@bob, @book_solitude,
    DATE_SUB(NOW(), INTERVAL 20 DAY),
    DATE_SUB(NOW(), INTERVAL 6 DAY),
    DATE_SUB(NOW(), INTERVAL 5 DAY),
    'returned'),
(@emma, @book_lighthouse,
    DATE_SUB(NOW(), INTERVAL 10 DAY),
    DATE_SUB(NOW(), INTERVAL -4 DAY),
    NULL,
    'active'),
(@david, @book_metamorphosis,
    DATE_SUB(NOW(), INTERVAL 30 DAY),
    DATE_SUB(NOW(), INTERVAL 16 DAY),
    DATE_SUB(NOW(), INTERVAL 15 DAY),
    'returned');

-- Update available copies for each book individually
UPDATE books SET available_copies = total_copies - 0 WHERE book_id = @book_1984;
UPDATE books SET available_copies = total_copies - 1 WHERE book_id = @book_pride;
UPDATE books SET available_copies = total_copies - 0 WHERE book_id = @book_kafka;
UPDATE books SET available_copies = total_copies - 0 WHERE book_id = @book_solitude;
UPDATE books SET available_copies = total_copies - 1 WHERE book_id = @book_lighthouse;
UPDATE books SET available_copies = total_copies - 0 WHERE book_id = @book_metamorphosis;

-- Add staff logs
INSERT INTO staff_logs (staff_id, action_type, target_table, target_id, new_values)
VALUES
((SELECT user_id FROM users WHERE username = 'admin'), 'add_book', 'books', @book_1984, JSON_OBJECT('title', '1984')),
((SELECT user_id FROM users WHERE username = 'admin'), 'add_book', 'books', @book_pride, JSON_OBJECT('title', 'Pride and Prejudice')),
((SELECT user_id FROM users WHERE username = 'admin'), 'add_book', 'books', @book_kafka, JSON_OBJECT('title', 'Kafka on the Shore')),
((SELECT user_id FROM users WHERE username = 'admin'), 'add_book', 'books', @book_solitude, JSON_OBJECT('title', 'One Hundred Years of Solitude')),
((SELECT user_id FROM users WHERE username = 'admin'), 'add_book', 'books', @book_lighthouse, JSON_OBJECT('title', 'To the Lighthouse')),
((SELECT user_id FROM users WHERE username = 'admin'), 'add_book', 'books', @book_metamorphosis, JSON_OBJECT('title', 'The Metamorphosis'));


