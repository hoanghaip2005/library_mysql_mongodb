-- Smart Library - MySQL schema rebuilt to match current routes

-- Create database if not exists (safety for manual runs)
CREATE DATABASE IF NOT EXISTS smart_library;
USE smart_library;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- Users table (readers and staff)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    user_type ENUM('reader','staff') NOT NULL DEFAULT 'reader',
    phone VARCHAR(20) NULL,
    address VARCHAR(500) NULL,
    date_joined DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_user_type (user_type),
    INDEX idx_users_active (is_active)
);

-- Authors
CREATE TABLE IF NOT EXISTS authors (
    author_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    birth_date DATE NULL,
    nationality VARCHAR(50) NULL,
    biography TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_authors_name (last_name, first_name)
);

-- Books
CREATE TABLE IF NOT EXISTS books (
    book_id INT AUTO_INCREMENT PRIMARY KEY,
    isbn VARCHAR(20) NULL,
    title VARCHAR(200) NOT NULL,
    publisher VARCHAR(100) NULL,
    publication_date DATE NULL,
    genre VARCHAR(50) NULL,
    language VARCHAR(20) NOT NULL DEFAULT 'English',
    total_copies INT NOT NULL DEFAULT 1,
    available_copies INT NOT NULL DEFAULT 1,
    pages INT NULL,
    description TEXT NULL,
    cover_image_url VARCHAR(255) NULL,
    average_rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    total_reviews INT NOT NULL DEFAULT 0,
    is_retired TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_books_title (title),
    INDEX idx_books_genre (genre),
    INDEX idx_books_publisher (publisher),
    INDEX idx_books_retired (is_retired)
);

-- Book-Author join
CREATE TABLE IF NOT EXISTS book_authors (
    book_id INT NOT NULL,
    author_id INT NOT NULL,
    PRIMARY KEY (book_id, author_id),
    CONSTRAINT fk_ba_book FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE,
    CONSTRAINT fk_ba_author FOREIGN KEY (author_id) REFERENCES authors(author_id) ON DELETE CASCADE,
    INDEX idx_ba_author (author_id)
);

-- Checkouts
CREATE TABLE IF NOT EXISTS checkouts (
    checkout_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    checkout_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME NOT NULL,
    return_date DATETIME NULL,
    is_late TINYINT(1) NOT NULL DEFAULT 0,
    late_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('active','returned','overdue') NOT NULL DEFAULT 'active',
    renewal_count INT NOT NULL DEFAULT 0,
    last_renewal_date DATETIME NULL,
    CONSTRAINT fk_checkouts_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_checkouts_book FOREIGN KEY (book_id) REFERENCES books(book_id),
    INDEX idx_checkouts_user (user_id),
    INDEX idx_checkouts_book (book_id),
    INDEX idx_checkouts_status (status)
);

-- Reviews
CREATE TABLE IF NOT EXISTS reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    rating INT NOT NULL,
    comment TEXT NULL,
    review_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_approved TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_book FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE,
    INDEX idx_reviews_book (book_id),
    INDEX idx_reviews_user (user_id),
    INDEX idx_reviews_rating (rating),
    INDEX idx_reviews_approved (is_approved)
);

-- Staff action logs (admin routes)
CREATE TABLE IF NOT EXISTS staff_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    staff_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_table VARCHAR(50) NOT NULL,
    target_id INT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    action_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_staff_logs_staff FOREIGN KEY (staff_id) REFERENCES users(user_id),
    INDEX idx_staff_logs_action_time (action_timestamp),
    INDEX idx_staff_logs_action_type (action_type)
);

-- Helper: maintain book aggregates (average_rating, total_reviews, available copies)
DELIMITER $$
DROP TRIGGER IF EXISTS trg_reviews_after_insert$$
CREATE TRIGGER trg_reviews_after_insert
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
    UPDATE books b
    SET 
        b.total_reviews = (
            SELECT COUNT(*) FROM reviews r WHERE r.book_id = NEW.book_id AND r.is_approved = 1
        ),
        b.average_rating = (
            SELECT IFNULL(AVG(rating), 0) FROM reviews r WHERE r.book_id = NEW.book_id AND r.is_approved = 1
        )
    WHERE b.book_id = NEW.book_id;
END$$

DROP TRIGGER IF EXISTS trg_reviews_after_update$$
CREATE TRIGGER trg_reviews_after_update
AFTER UPDATE ON reviews
FOR EACH ROW
BEGIN
    UPDATE books b
    SET 
        b.total_reviews = (
            SELECT COUNT(*) FROM reviews r WHERE r.book_id = NEW.book_id AND r.is_approved = 1
        ),
        b.average_rating = (
            SELECT IFNULL(AVG(rating), 0) FROM reviews r WHERE r.book_id = NEW.book_id AND r.is_approved = 1
        )
    WHERE b.book_id = NEW.book_id;
END$$

DROP TRIGGER IF EXISTS trg_reviews_after_delete$$
CREATE TRIGGER trg_reviews_after_delete
AFTER DELETE ON reviews
FOR EACH ROW
BEGIN
    UPDATE books b
    SET 
        b.total_reviews = (
            SELECT COUNT(*) FROM reviews r WHERE r.book_id = OLD.book_id AND r.is_approved = 1
        ),
        b.average_rating = (
            SELECT IFNULL(AVG(rating), 0) FROM reviews r WHERE r.book_id = OLD.book_id AND r.is_approved = 1
        )
    WHERE b.book_id = OLD.book_id;
END$$

DELIMITER ;


