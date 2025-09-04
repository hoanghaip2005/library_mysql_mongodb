-- Smart Library Platform - Sample Data
-- This file contains sample data for testing and demonstration

USE smart_library;

-- Insert sample users
INSERT INTO users (username, email, password_hash, first_name, last_name, user_type, phone, address, is_active) VALUES
('admin', 'admin@smartlibrary.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Qz8K2', 'Admin', 'User', 'staff', '555-0101', '123 Library St, City, State', TRUE),
('john_reader', 'john@email.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Qz8K2', 'John', 'Doe', 'reader', '555-0102', '456 Reader Ave, City, State', TRUE),
('jane_reader', 'jane@email.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Qz8K2', 'Jane', 'Smith', 'reader', '555-0103', '789 Book Ln, City, State', TRUE),
('bob_reader', 'bob@email.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Qz8K2', 'Bob', 'Johnson', 'reader', '555-0104', '321 Library Rd, City, State', TRUE),
('alice_reader', 'alice@email.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Qz8K2', 'Alice', 'Brown', 'reader', '555-0105', '654 Reading St, City, State', TRUE),
('staff1', 'staff1@smartlibrary.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Qz8K2', 'Sarah', 'Wilson', 'staff', '555-0106', '987 Staff Blvd, City, State', TRUE);

-- Insert sample authors
INSERT INTO authors (first_name, last_name, birth_date, nationality, biography) VALUES
('J.K.', 'Rowling', '1965-07-31', 'British', 'Joanne Rowling, better known by her pen name J.K. Rowling, is a British author, philanthropist, film producer, television producer, and screenwriter. She is best known for writing the Harry Potter fantasy series.'),
('George', 'Orwell', '1903-06-25', 'British', 'Eric Arthur Blair, known by his pen name George Orwell, was an English novelist, essayist, journalist, and critic. His work is characterised by lucid prose, biting social criticism, and opposition to totalitarianism.'),
('Harper', 'Lee', '1926-04-28', 'American', 'Nelle Harper Lee was an American novelist best known for her 1960 novel To Kill a Mockingbird. It won the 1961 Pulitzer Prize and has become a classic of modern American literature.'),
('F. Scott', 'Fitzgerald', '1896-09-24', 'American', 'Francis Scott Key Fitzgerald was an American novelist, essayist, and short story writer. He is best known for his novels depicting the flamboyance and excess of the Jazz Age.'),
('Jane', 'Austen', '1775-12-16', 'British', 'Jane Austen was an English novelist known primarily for her six major novels, which interpret, critique and comment upon the British landed gentry at the end of the 18th century.'),
('Mark', 'Twain', '1835-11-30', 'American', 'Samuel Langhorne Clemens, known by his pen name Mark Twain, was an American writer, humorist, entrepreneur, publisher, and lecturer. He was lauded as the "greatest humorist the United States has produced".'),
('Virginia', 'Woolf', '1882-01-25', 'British', 'Adeline Virginia Woolf was an English writer, considered one of the most important modernist 20th-century authors and a pioneer in the use of stream of consciousness as a narrative device.'),
('Ernest', 'Hemingway', '1899-07-21', 'American', 'Ernest Miller Hemingway was an American novelist, short story writer, and journalist. His economical and understated style had a strong influence on 20th-century fiction.'),
('Toni', 'Morrison', '1931-02-18', 'American', 'Chloe Anthony Wofford Morrison, known as Toni Morrison, was an American novelist, essayist, book editor, and college professor. She won the Nobel Prize in Literature in 1993.'),
('Gabriel', 'García Márquez', '1927-03-06', 'Colombian', 'Gabriel José de la Concordia García Márquez was a Colombian novelist, short-story writer, screenwriter, and journalist, known affectionately as Gabo or Gabito throughout Latin America.');

-- Insert sample books
INSERT INTO books (isbn, title, publisher, publication_date, genre, language, total_copies, available_copies, pages, description, average_rating, total_reviews) VALUES
('978-0-7475-3269-9', 'Harry Potter and the Philosopher\'s Stone', 'Bloomsbury Publishing', '1997-06-26', 'Fantasy', 'English', 10, 8, 223, 'The first novel in the Harry Potter series, following Harry Potter, a young wizard who discovers his magical heritage on his eleventh birthday.', 4.5, 150),
('978-0-451-52493-5', '1984', 'Signet Classic', '1949-06-08', 'Dystopian Fiction', 'English', 8, 6, 328, 'A dystopian social science fiction novel and cautionary tale about the dangers of totalitarianism.', 4.3, 89),
('978-0-06-112008-4', 'To Kill a Mockingbird', 'J.B. Lippincott & Co.', '1960-07-11', 'Fiction', 'English', 12, 10, 281, 'The story of young Scout Finch, whose father defends a black man falsely accused of rape in 1930s Alabama.', 4.2, 120),
('978-0-7432-7356-5', 'The Great Gatsby', 'Scribner', '1925-04-10', 'Fiction', 'English', 6, 4, 180, 'A story of the fabulously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan.', 4.0, 95),
('978-0-14-143951-8', 'Pride and Prejudice', 'Penguin Classics', '1813-01-28', 'Romance', 'English', 9, 7, 432, 'A romantic novel of manners written by Jane Austen, following the character development of Elizabeth Bennet.', 4.4, 110),
('978-0-14-303956-3', 'The Adventures of Huckleberry Finn', 'Penguin Classics', '1884-12-10', 'Adventure', 'English', 7, 5, 366, 'A novel by Mark Twain, first published in the United Kingdom in December 1884 and in the United States in February 1885.', 4.1, 78),
('978-0-15-603041-0', 'Mrs. Dalloway', 'Harcourt Brace', '1925-05-14', 'Modernist Literature', 'English', 5, 3, 194, 'A novel by Virginia Woolf that details a day in the life of Clarissa Dalloway, a fictional high-society woman in post-First World War England.', 4.2, 65),
('978-0-684-80122-3', 'The Old Man and the Sea', 'Scribner', '1952-09-01', 'Fiction', 'English', 8, 6, 127, 'A short novel written by Ernest Hemingway about an aging Cuban fisherman who struggles with a giant marlin far out in the Gulf Stream.', 4.0, 85),
('978-0-452-26417-4', 'Beloved', 'Plume', '1987-09-02', 'Fiction', 'English', 6, 4, 324, 'A novel by Toni Morrison about a former slave who is haunted by the ghost of her baby daughter.', 4.3, 92),
('978-0-06-088328-7', 'One Hundred Years of Solitude', 'Harper Perennial', '1967-05-30', 'Magical Realism', 'English', 7, 5, 417, 'A landmark 1967 novel by Colombian author Gabriel García Márquez that tells the multi-generational story of the Buendía family.', 4.4, 105),
('978-0-7475-3270-5', 'Harry Potter and the Chamber of Secrets', 'Bloomsbury Publishing', '1998-07-02', 'Fantasy', 'English', 10, 8, 251, 'The second novel in the Harry Potter series, following Harry\'s second year at Hogwarts School of Witchcraft and Wizardry.', 4.4, 140),
('978-0-451-52494-2', 'Animal Farm', 'Signet Classic', '1945-08-17', 'Political Satire', 'English', 9, 7, 112, 'An allegorical novella by George Orwell that reflects events leading up to the Russian Revolution of 1917.', 4.2, 88),
('978-0-14-143956-3', 'Emma', 'Penguin Classics', '1815-12-23', 'Romance', 'English', 8, 6, 474, 'A novel by Jane Austen about youthful hubris and the perils of misconstrued romance.', 4.1, 75),
('978-0-7432-7357-2', 'Tender Is the Night', 'Scribner', '1934-04-12', 'Fiction', 'English', 5, 3, 315, 'A novel by F. Scott Fitzgerald about the rise and fall of Dick Diver, a promising young psychiatrist.', 3.9, 45),
('978-0-15-603042-7', 'To the Lighthouse', 'Harcourt Brace', '1927-05-05', 'Modernist Literature', 'English', 6, 4, 209, 'A novel by Virginia Woolf that follows the Ramsay family and their guests during visits to the Isle of Skye.', 4.0, 55);

-- Insert book-author relationships
INSERT INTO book_authors (book_id, author_id) VALUES
(1, 1),   -- Harry Potter and the Philosopher's Stone - J.K. Rowling
(2, 2),   -- 1984 - George Orwell
(3, 3),   -- To Kill a Mockingbird - Harper Lee
(4, 4),   -- The Great Gatsby - F. Scott Fitzgerald
(5, 5),   -- Pride and Prejudice - Jane Austen
(6, 6),   -- The Adventures of Huckleberry Finn - Mark Twain
(7, 7),   -- Mrs. Dalloway - Virginia Woolf
(8, 8),   -- The Old Man and the Sea - Ernest Hemingway
(9, 9),   -- Beloved - Toni Morrison
(10, 10), -- One Hundred Years of Solitude - Gabriel García Márquez
(11, 1),  -- Harry Potter and the Chamber of Secrets - J.K. Rowling
(12, 2),  -- Animal Farm - George Orwell
(13, 5),  -- Emma - Jane Austen
(14, 4),  -- Tender Is the Night - F. Scott Fitzgerald
(15, 7);  -- To the Lighthouse - Virginia Woolf

-- Insert sample checkouts
INSERT INTO checkouts (user_id, book_id, checkout_date, due_date, return_date, is_late, late_fee, status) VALUES
(2, 1, '2024-01-15 10:30:00', '2024-01-29 23:59:59', '2024-01-28 14:20:00', FALSE, 0.00, 'returned'),
(2, 3, '2024-01-20 09:15:00', '2024-02-03 23:59:59', '2024-02-01 16:45:00', FALSE, 0.00, 'returned'),
(3, 2, '2024-01-25 14:20:00', '2024-02-08 23:59:59', '2024-02-05 11:30:00', FALSE, 0.00, 'returned'),
(3, 5, '2024-02-01 11:45:00', '2024-02-15 23:59:59', '2024-02-12 13:15:00', FALSE, 0.00, 'returned'),
(4, 4, '2024-02-05 16:30:00', '2024-02-19 23:59:59', '2024-02-18 10:20:00', FALSE, 0.00, 'returned'),
(4, 6, '2024-02-10 13:15:00', '2024-02-24 23:59:59', '2024-02-22 15:45:00', FALSE, 0.00, 'returned'),
(5, 7, '2024-02-15 09:30:00', '2024-03-01 23:59:59', '2024-02-28 12:10:00', FALSE, 0.00, 'returned'),
(5, 9, '2024-02-20 15:45:00', '2024-03-06 23:59:59', '2024-03-03 14:25:00', FALSE, 0.00, 'returned'),
(2, 8, '2024-03-01 10:20:00', '2024-03-15 23:59:59', '2024-03-12 16:30:00', FALSE, 0.00, 'returned'),
(3, 10, '2024-03-05 14:10:00', '2024-03-19 23:59:59', '2024-03-16 11:45:00', FALSE, 0.00, 'returned'),
(4, 11, '2024-03-10 12:30:00', '2024-03-24 23:59:59', '2024-03-21 13:20:00', FALSE, 0.00, 'returned'),
(5, 12, '2024-03-15 16:45:00', '2024-03-29 23:59:59', '2024-03-26 10:15:00', FALSE, 0.00, 'returned'),
(2, 13, '2024-03-20 11:15:00', '2024-04-03 23:59:59', '2024-03-30 15:30:00', FALSE, 0.00, 'returned'),
(3, 14, '2024-03-25 13:40:00', '2024-04-08 23:59:59', '2024-04-05 12:45:00', FALSE, 0.00, 'returned'),
(4, 15, '2024-03-30 15:20:00', '2024-04-13 23:59:59', '2024-04-10 14:10:00', FALSE, 0.00, 'returned'),
-- Current active checkouts
(2, 2, '2024-04-01 10:30:00', '2024-04-15 23:59:59', NULL, FALSE, 0.00, 'active'),
(3, 6, '2024-04-02 14:15:00', '2024-04-16 23:59:59', NULL, FALSE, 0.00, 'active'),
(4, 9, '2024-04-03 11:45:00', '2024-04-17 23:59:59', NULL, FALSE, 0.00, 'active'),
(5, 11, '2024-04-04 16:20:00', '2024-04-18 23:59:59', NULL, FALSE, 0.00, 'active'),
(2, 13, '2024-04-05 09:30:00', '2024-04-19 23:59:59', NULL, FALSE, 0.00, 'active'),
-- Overdue checkouts
(3, 1, '2024-03-15 10:30:00', '2024-03-29 23:59:59', NULL, TRUE, 5.00, 'overdue'),
(4, 5, '2024-03-20 14:15:00', '2024-04-03 23:59:59', NULL, TRUE, 8.00, 'overdue'),
(5, 8, '2024-03-25 11:45:00', '2024-04-08 23:59:59', NULL, TRUE, 3.00, 'overdue');

-- Insert sample reviews
INSERT INTO reviews (user_id, book_id, rating, comment, review_date, is_approved) VALUES
(2, 1, 5, 'Absolutely magical! J.K. Rowling created an incredible world that I never wanted to leave. The characters are so well-developed and the story is engaging from start to finish.', '2024-01-30 10:15:00', TRUE),
(3, 1, 4, 'Great book for all ages. The writing is excellent and the plot is well-paced. Highly recommend to anyone who loves fantasy.', '2024-02-01 14:30:00', TRUE),
(4, 1, 5, 'A timeless classic that I will read again and again. The magic system is unique and the characters are unforgettable.', '2024-02-05 16:45:00', TRUE),
(2, 2, 4, 'Disturbing but important read. Orwell\'s vision of a totalitarian society is chilling and unfortunately still relevant today.', '2024-02-10 11:20:00', TRUE),
(3, 2, 5, 'One of the most thought-provoking books I\'ve ever read. The ending still haunts me months later.', '2024-02-12 13:15:00', TRUE),
(4, 2, 4, 'Classic dystopian fiction. Well-written and engaging, though quite dark in tone.', '2024-02-15 09:30:00', TRUE),
(2, 3, 5, 'A masterpiece of American literature. Harper Lee\'s writing is beautiful and the story is both heartwarming and heartbreaking.', '2024-02-20 15:45:00', TRUE),
(3, 3, 4, 'Powerful story about justice and morality. Atticus Finch is one of the greatest literary characters ever created.', '2024-02-22 12:10:00', TRUE),
(4, 3, 5, 'Required reading for everyone. The themes are still relevant today and the writing is exceptional.', '2024-02-25 14:20:00', TRUE),
(2, 4, 4, 'Fitzgerald\'s prose is beautiful and the Jazz Age setting is vividly portrayed. A great American novel.', '2024-03-01 16:30:00', TRUE),
(3, 4, 3, 'Good book but I found some parts slow. The writing style is elegant though.', '2024-03-03 10:45:00', TRUE),
(4, 4, 4, 'Classic American literature. The characters are complex and the themes are timeless.', '2024-03-05 13:15:00', TRUE),
(2, 5, 5, 'Jane Austen at her finest. The wit and social commentary are brilliant, and Elizabeth Bennet is a wonderful heroine.', '2024-03-10 11:30:00', TRUE),
(3, 5, 4, 'Charming romance with great character development. Austen\'s writing is witty and engaging.', '2024-03-12 14:45:00', TRUE),
(4, 5, 5, 'A perfect novel. The dialogue is sharp, the characters are memorable, and the story is timeless.', '2024-03-15 16:20:00', TRUE),
(2, 6, 4, 'Adventure story with important themes about friendship and morality. Twain\'s humor shines through.', '2024-03-20 12:15:00', TRUE),
(3, 6, 3, 'Interesting historical perspective but some language and attitudes are outdated.', '2024-03-22 15:30:00', TRUE),
(4, 6, 4, 'Classic American literature. The relationship between Huck and Jim is beautifully written.', '2024-03-25 10:45:00', TRUE),
(2, 7, 4, 'Stream of consciousness writing that takes some getting used to, but very rewarding once you get into it.', '2024-03-30 13:20:00', TRUE),
(3, 7, 3, 'Experimental writing style. Not for everyone but worth reading for the literary techniques.', '2024-04-01 16:10:00', TRUE),
(4, 7, 4, 'Woolf\'s exploration of consciousness and time is fascinating. A challenging but rewarding read.', '2024-04-03 11:25:00', TRUE),
(2, 8, 4, 'Hemingway\'s sparse writing style works perfectly for this story of man vs. nature.', '2024-04-05 14:40:00', TRUE),
(3, 8, 5, 'Simple but profound. The old man\'s struggle is both physical and spiritual.', '2024-04-07 12:15:00', TRUE),
(4, 8, 4, 'Classic Hemingway. The themes of perseverance and dignity are timeless.', '2024-04-09 15:30:00', TRUE),
(2, 9, 5, 'Powerful and haunting. Morrison\'s writing is beautiful and the story is deeply moving.', '2024-04-10 10:20:00', TRUE),
(3, 9, 4, 'Difficult subject matter but handled with grace and skill. A must-read.', '2024-04-12 13:45:00', TRUE),
(4, 9, 5, 'Toni Morrison at her best. The prose is lyrical and the themes are profound.', '2024-04-14 16:00:00', TRUE),
(2, 10, 4, 'Magical realism at its finest. The Buendía family saga is epic and unforgettable.', '2024-04-15 11:35:00', TRUE),
(3, 10, 5, 'A masterpiece of Latin American literature. García Márquez\'s imagination is boundless.', '2024-04-17 14:50:00', TRUE),
(4, 10, 4, 'Complex and rewarding. The magical elements blend seamlessly with the realistic story.', '2024-04-19 12:05:00', TRUE);

-- Insert sample staff logs
INSERT INTO staff_logs (staff_id, action_type, target_table, target_id, old_values, new_values, action_timestamp, ip_address) VALUES
(1, 'add_book', 'books', 1, NULL, '{"title": "Harry Potter and the Philosopher\'s Stone", "isbn": "978-0-7475-3269-9", "total_copies": 10}', '2024-01-01 09:00:00', '192.168.1.100'),
(1, 'add_book', 'books', 2, NULL, '{"title": "1984", "isbn": "978-0-451-52493-5", "total_copies": 8}', '2024-01-01 09:15:00', '192.168.1.100'),
(1, 'add_book', 'books', 3, NULL, '{"title": "To Kill a Mockingbird", "isbn": "978-0-06-112008-4", "total_copies": 12}', '2024-01-01 09:30:00', '192.168.1.100'),
(1, 'add_author', 'authors', 1, NULL, '{"firstName": "J.K.", "lastName": "Rowling", "nationality": "British"}', '2024-01-01 08:45:00', '192.168.1.100'),
(1, 'add_author', 'authors', 2, NULL, '{"firstName": "George", "lastName": "Orwell", "nationality": "British"}', '2024-01-01 08:50:00', '192.168.1.100'),
(1, 'add_author', 'authors', 3, NULL, '{"firstName": "Harper", "lastName": "Lee", "nationality": "American"}', '2024-01-01 08:55:00', '192.168.1.100'),
(6, 'update_inventory', 'books', 1, '{"total_copies": 10}', '{"total_copies": 12}', '2024-02-15 14:30:00', '192.168.1.101'),
(6, 'update_inventory', 'books', 2, '{"total_copies": 8}', '{"total_copies": 10}', '2024-02-20 10:15:00', '192.168.1.101'),
(6, 'retire_book', 'books', 15, NULL, '{"is_retired": true}', '2024-03-01 16:45:00', '192.168.1.101');

-- Update book ratings based on reviews (this will be handled by triggers, but we can manually update for sample data)
UPDATE books SET 
    average_rating = (
        SELECT AVG(rating) 
        FROM reviews 
        WHERE book_id = books.book_id AND is_approved = TRUE
    ),
    total_reviews = (
        SELECT COUNT(*) 
        FROM reviews 
        WHERE book_id = books.book_id AND is_approved = TRUE
    );

-- Display sample data summary
SELECT 'Sample Data Inserted Successfully' as Status;
SELECT COUNT(*) as 'Total Users' FROM users;
SELECT COUNT(*) as 'Total Authors' FROM authors;
SELECT COUNT(*) as 'Total Books' FROM books;
SELECT COUNT(*) as 'Total Checkouts' FROM checkouts;
SELECT COUNT(*) as 'Total Reviews' FROM reviews;
SELECT COUNT(*) as 'Total Staff Logs' FROM staff_logs;
