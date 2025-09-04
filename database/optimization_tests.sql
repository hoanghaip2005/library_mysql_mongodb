-- Smart Library Platform - Database Optimization and Performance Tests
-- This file contains optimization strategies and performance testing queries

USE smart_library;

-- =============================================
-- PERFORMANCE OPTIMIZATION STRATEGIES
-- =============================================

-- 1. Additional Indexes for Better Performance
-- Composite index for book search optimization
CREATE INDEX idx_books_search_composite ON books(title, genre, publisher, available_copies, is_retired);

-- Index for checkout date range queries
CREATE INDEX idx_checkouts_date_range ON checkouts(checkout_date, due_date, status);

-- Index for user activity queries
CREATE INDEX idx_user_activity ON checkouts(user_id, checkout_date, status);

-- Index for review analytics
CREATE INDEX idx_reviews_analytics ON reviews(book_id, rating, review_date, is_approved);

-- Index for staff logs by date and action
CREATE INDEX idx_staff_logs_analytics ON staff_logs(action_timestamp, action_type, staff_id);

-- 2. Partitioning Strategy (for large datasets)
-- Note: Partitioning requires MySQL 5.7+ and is shown here as an example
-- In practice, you would implement this based on your data volume

-- Example: Partition checkouts table by year
-- ALTER TABLE checkouts PARTITION BY RANGE (YEAR(checkout_date)) (
--     PARTITION p2020 VALUES LESS THAN (2021),
--     PARTITION p2021 VALUES LESS THAN (2022),
--     PARTITION p2022 VALUES LESS THAN (2023),
--     PARTITION p2023 VALUES LESS THAN (2024),
--     PARTITION p2024 VALUES LESS THAN (2025),
--     PARTITION p_future VALUES LESS THAN MAXVALUE
-- );

-- =============================================
-- PERFORMANCE TESTING QUERIES
-- =============================================

-- Test 1: Book Search Performance
-- This query tests the performance of book search with various filters
EXPLAIN ANALYZE
SELECT 
    b.book_id,
    b.title,
    b.publisher,
    b.genre,
    b.available_copies,
    b.average_rating,
    GROUP_CONCAT(
        CONCAT(a.first_name, ' ', a.last_name) 
        ORDER BY ba.author_id SEPARATOR ', '
    ) as authors
FROM books b
LEFT JOIN book_authors ba ON b.book_id = ba.book_id
LEFT JOIN authors a ON ba.author_id = a.author_id
WHERE b.is_retired = FALSE
    AND b.title LIKE '%Harry%'
    AND b.genre = 'Fantasy'
    AND b.available_copies > 0
GROUP BY b.book_id
ORDER BY b.average_rating DESC
LIMIT 20;

-- Test 2: User Checkout History Performance
-- This query tests the performance of user checkout history retrieval
EXPLAIN ANALYZE
SELECT 
    c.checkout_id,
    c.checkout_date,
    c.due_date,
    c.return_date,
    c.status,
    b.title,
    b.isbn
FROM checkouts c
JOIN books b ON c.book_id = b.book_id
WHERE c.user_id = 2
    AND c.checkout_date >= '2024-01-01'
    AND c.checkout_date <= '2024-12-31'
ORDER BY c.checkout_date DESC
LIMIT 50;

-- Test 3: Most Borrowed Books Report Performance
-- This query tests the performance of the most borrowed books report
EXPLAIN ANALYZE
SELECT 
    b.book_id,
    b.title,
    b.genre,
    b.publisher,
    COUNT(c.checkout_id) as total_checkouts,
    COUNT(DISTINCT c.user_id) as unique_borrowers,
    AVG(r.rating) as average_rating,
    COUNT(r.review_id) as total_reviews
FROM books b
LEFT JOIN checkouts c ON b.book_id = c.book_id 
    AND c.checkout_date BETWEEN '2024-01-01' AND '2024-12-31'
LEFT JOIN reviews r ON b.book_id = r.book_id AND r.is_approved = TRUE
WHERE b.is_retired = FALSE
GROUP BY b.book_id
HAVING total_checkouts > 0
ORDER BY total_checkouts DESC, average_rating DESC
LIMIT 20;

-- Test 4: Overdue Books Report Performance
-- This query tests the performance of overdue books retrieval
EXPLAIN ANALYZE
SELECT 
    c.checkout_id,
    c.checkout_date,
    c.due_date,
    DATEDIFF(NOW(), c.due_date) as days_overdue,
    c.late_fee,
    u.username,
    u.first_name,
    u.last_name,
    u.email,
    b.title,
    b.isbn
FROM checkouts c
JOIN users u ON c.user_id = u.user_id
JOIN books b ON c.book_id = b.book_id
WHERE c.status = 'overdue'
ORDER BY days_overdue DESC, c.late_fee DESC
LIMIT 50;

-- Test 5: Review Analytics Performance
-- This query tests the performance of review analytics
EXPLAIN ANALYZE
SELECT 
    b.book_id,
    b.title,
    b.average_rating,
    b.total_reviews,
    COUNT(r.review_id) as recent_reviews,
    AVG(r.rating) as recent_average_rating
FROM books b
LEFT JOIN reviews r ON b.book_id = r.book_id 
    AND r.review_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    AND r.is_approved = TRUE
WHERE b.is_retired = FALSE
GROUP BY b.book_id
ORDER BY recent_reviews DESC, b.average_rating DESC
LIMIT 20;

-- =============================================
-- QUERY OPTIMIZATION TECHNIQUES
-- =============================================

-- 1. Optimized Book Search Query
-- Using covering index and avoiding unnecessary joins
CREATE VIEW optimized_book_search AS
SELECT 
    b.book_id,
    b.title,
    b.publisher,
    b.genre,
    b.available_copies,
    b.average_rating,
    b.total_reviews,
    (SELECT GROUP_CONCAT(
        CONCAT(a.first_name, ' ', a.last_name) 
        ORDER BY ba.author_id SEPARATOR ', '
    ) FROM book_authors ba 
    JOIN authors a ON ba.author_id = a.author_id 
    WHERE ba.book_id = b.book_id) as authors
FROM books b
WHERE b.is_retired = FALSE;

-- 2. Optimized User Activity Query
-- Using materialized view approach for frequently accessed data
CREATE VIEW user_checkout_summary AS
SELECT 
    u.user_id,
    u.username,
    u.first_name,
    u.last_name,
    COUNT(c.checkout_id) as total_checkouts,
    COUNT(CASE WHEN c.status = 'returned' THEN 1 END) as books_returned,
    COUNT(CASE WHEN c.status = 'active' THEN 1 END) as current_checkouts,
    COUNT(CASE WHEN c.status = 'overdue' THEN 1 END) as overdue_books,
    COUNT(CASE WHEN c.is_late = TRUE THEN 1 END) as late_returns,
    SUM(c.late_fee) as total_late_fees
FROM users u
LEFT JOIN checkouts c ON u.user_id = c.user_id
WHERE u.user_type = 'reader' AND u.is_active = TRUE
GROUP BY u.user_id;

-- =============================================
-- PERFORMANCE MONITORING QUERIES
-- =============================================

-- Query to check index usage
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    CARDINALITY,
    SUB_PART,
    PACKED,
    NULLABLE,
    INDEX_TYPE
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'smart_library'
ORDER BY TABLE_NAME, INDEX_NAME;

-- Query to check table sizes
SELECT 
    table_name AS 'Table',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)',
    table_rows AS 'Rows'
FROM information_schema.TABLES 
WHERE table_schema = 'smart_library'
ORDER BY (data_length + index_length) DESC;

-- Query to check slow queries (if slow query log is enabled)
-- SHOW VARIABLES LIKE 'slow_query_log';
-- SHOW VARIABLES LIKE 'long_query_time';

-- =============================================
-- PERFORMANCE BENCHMARKING
-- =============================================

-- Benchmark 1: Book Search Performance
-- Measure execution time for book search queries
SET @start_time = NOW(6);
SELECT COUNT(*) FROM books WHERE title LIKE '%Harry%' AND genre = 'Fantasy' AND available_copies > 0;
SET @end_time = NOW(6);
SELECT TIMESTAMPDIFF(MICROSECOND, @start_time, @end_time) AS 'Search Time (microseconds)';

-- Benchmark 2: Checkout History Performance
-- Measure execution time for checkout history queries
SET @start_time = NOW(6);
SELECT COUNT(*) FROM checkouts WHERE user_id = 2 AND checkout_date >= '2024-01-01';
SET @end_time = NOW(6);
SELECT TIMESTAMPDIFF(MICROSECOND, @start_time, @end_time) AS 'Checkout History Time (microseconds)';

-- Benchmark 3: Report Generation Performance
-- Measure execution time for report generation
SET @start_time = NOW(6);
SELECT COUNT(*) FROM books b 
LEFT JOIN checkouts c ON b.book_id = c.book_id 
WHERE c.checkout_date BETWEEN '2024-01-01' AND '2024-12-31';
SET @end_time = NOW(6);
SELECT TIMESTAMPDIFF(MICROSECOND, @start_time, @end_time) AS 'Report Generation Time (microseconds)';

-- =============================================
-- CACHING STRATEGIES
-- =============================================

-- 1. Create a materialized view for popular books
-- (Note: MySQL doesn't have materialized views, so we use a regular table)
CREATE TABLE popular_books_cache (
    book_id INT PRIMARY KEY,
    title VARCHAR(200),
    checkout_count INT,
    average_rating DECIMAL(3,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE CASCADE
);

-- Procedure to refresh popular books cache
DELIMITER //
CREATE PROCEDURE RefreshPopularBooksCache()
BEGIN
    DELETE FROM popular_books_cache;
    
    INSERT INTO popular_books_cache (book_id, title, checkout_count, average_rating)
    SELECT 
        b.book_id,
        b.title,
        COUNT(c.checkout_id) as checkout_count,
        b.average_rating
    FROM books b
    LEFT JOIN checkouts c ON b.book_id = c.book_id
    WHERE b.is_retired = FALSE
    GROUP BY b.book_id
    HAVING checkout_count > 0
    ORDER BY checkout_count DESC
    LIMIT 50;
END //
DELIMITER ;

-- 2. Create a cache for user statistics
CREATE TABLE user_stats_cache (
    user_id INT PRIMARY KEY,
    total_checkouts INT,
    books_returned INT,
    current_checkouts INT,
    overdue_books INT,
    total_late_fees DECIMAL(10,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Procedure to refresh user stats cache
DELIMITER //
CREATE PROCEDURE RefreshUserStatsCache()
BEGIN
    DELETE FROM user_stats_cache;
    
    INSERT INTO user_stats_cache (user_id, total_checkouts, books_returned, current_checkouts, overdue_books, total_late_fees)
    SELECT 
        u.user_id,
        COUNT(c.checkout_id) as total_checkouts,
        COUNT(CASE WHEN c.status = 'returned' THEN 1 END) as books_returned,
        COUNT(CASE WHEN c.status = 'active' THEN 1 END) as current_checkouts,
        COUNT(CASE WHEN c.status = 'overdue' THEN 1 END) as overdue_books,
        COALESCE(SUM(c.late_fee), 0) as total_late_fees
    FROM users u
    LEFT JOIN checkouts c ON u.user_id = c.user_id
    WHERE u.user_type = 'reader' AND u.is_active = TRUE
    GROUP BY u.user_id;
END //
DELIMITER ;

-- =============================================
-- MAINTENANCE PROCEDURES
-- =============================================

-- Procedure to optimize tables and update statistics
DELIMITER //
CREATE PROCEDURE OptimizeDatabase()
BEGIN
    -- Analyze tables to update statistics
    ANALYZE TABLE books, authors, checkouts, reviews, users, staff_logs;
    
    -- Optimize tables to defragment and reclaim space
    OPTIMIZE TABLE books, authors, checkouts, reviews, users, staff_logs;
    
    -- Refresh caches
    CALL RefreshPopularBooksCache();
    CALL RefreshUserStatsCache();
    
    SELECT 'Database optimization completed successfully' as Status;
END //
DELIMITER ;

-- Procedure to clean up old data
DELIMITER //
CREATE PROCEDURE CleanupOldData()
BEGIN
    -- Archive old checkout records (older than 2 years)
    -- Note: In production, you would move these to an archive table
    -- DELETE FROM checkouts WHERE checkout_date < DATE_SUB(NOW(), INTERVAL 2 YEAR);
    
    -- Clean up old staff logs (older than 1 year)
    -- DELETE FROM staff_logs WHERE action_timestamp < DATE_SUB(NOW(), INTERVAL 1 YEAR);
    
    -- Clean up inactive users (older than 1 year with no activity)
    -- DELETE FROM users WHERE is_active = FALSE 
    -- AND user_id NOT IN (SELECT DISTINCT user_id FROM checkouts)
    -- AND user_id NOT IN (SELECT DISTINCT user_id FROM reviews)
    -- AND created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR);
    
    SELECT 'Old data cleanup completed successfully' as Status;
END //
DELIMITER ;

-- =============================================
-- PERFORMANCE MONITORING VIEWS
-- =============================================

-- View for monitoring query performance
CREATE VIEW query_performance_stats AS
SELECT 
    'Book Search' as query_type,
    COUNT(*) as execution_count,
    AVG(TIMESTAMPDIFF(MICROSECOND, start_time, end_time)) as avg_execution_time_microseconds
FROM (
    -- This would be populated by application logging in practice
    SELECT NOW(6) as start_time, NOW(6) as end_time
    LIMIT 1
) as sample_data;

-- View for monitoring index usage
CREATE VIEW index_usage_stats AS
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    CARDINALITY,
    CASE 
        WHEN CARDINALITY = 0 THEN 'No data'
        WHEN CARDINALITY < 100 THEN 'Low cardinality'
        WHEN CARDINALITY < 1000 THEN 'Medium cardinality'
        ELSE 'High cardinality'
    END as cardinality_level
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = 'smart_library'
ORDER BY CARDINALITY DESC;

-- Display optimization summary
SELECT 'Database optimization setup completed successfully' as Status;
SELECT 'Available procedures: OptimizeDatabase(), CleanupOldData(), RefreshPopularBooksCache(), RefreshUserStatsCache()' as Procedures;
SELECT 'Available views: optimized_book_search, user_checkout_summary, query_performance_stats, index_usage_stats' as Views;
