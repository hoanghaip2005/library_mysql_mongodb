-- Smart Library Platform - MySQL Functions, Stored Procedures, and Triggers

USE smart_library;

-- =============================================
-- FUNCTIONS
-- =============================================

DELIMITER //

-- Function to check if a book is available
CREATE FUNCTION IsBookAvailable(book_id_param INT) 
RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE available_count INT DEFAULT 0;
    
    SELECT available_copies INTO available_count
    FROM books 
    WHERE book_id = book_id_param AND is_retired = FALSE;
    
    RETURN available_count > 0;
END //

-- Function to check if a book is returned on time
CREATE FUNCTION IsReturnedOnTime(checkout_id_param INT) 
RETURNS BOOLEAN
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE due_date_val TIMESTAMP;
    DECLARE return_date_val TIMESTAMP;
    
    SELECT due_date, return_date INTO due_date_val, return_date_val
    FROM checkouts 
    WHERE checkout_id = checkout_id_param;
    
    IF return_date_val IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN return_date_val <= due_date_val;
END //

-- Function to calculate number of books borrowed in a given time range
CREATE FUNCTION GetBooksBorrowedInRange(start_date TIMESTAMP, end_date TIMESTAMP) 
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE book_count INT DEFAULT 0;
    
    SELECT COUNT(*) INTO book_count
    FROM checkouts 
    WHERE checkout_date BETWEEN start_date AND end_date;
    
    RETURN book_count;
END //

DELIMITER ;

-- =============================================
-- STORED PROCEDURES
-- =============================================

DELIMITER //

-- Stored procedure to borrow a book with enhanced concurrency control
CREATE PROCEDURE BorrowBook(
    IN p_user_id INT,
    IN p_book_id INT,
    IN p_due_days INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_available_copies INT DEFAULT 0;
    DECLARE v_retry_count INT DEFAULT 0;
    DECLARE v_max_retries INT DEFAULT 3;
    DECLARE v_deadlock_occurred BOOLEAN DEFAULT FALSE;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'An error occurred during book borrowing';
    END;
    
    -- Retry logic for deadlock handling
    retry_loop: WHILE v_retry_count < v_max_retries DO
        SET v_deadlock_occurred = FALSE;
        
        START TRANSACTION;
        
        -- Lock the book row for update to prevent race conditions
        SELECT available_copies INTO v_available_copies
        FROM books 
        WHERE book_id = p_book_id AND is_retired = FALSE
        FOR UPDATE;
        
        -- Check if book is available
        IF v_available_copies IS NULL THEN
            SET p_success = FALSE;
            SET p_message = 'Book not found or retired';
            ROLLBACK;
            LEAVE retry_loop;
        ELSEIF v_available_copies <= 0 THEN
            SET p_success = FALSE;
            SET p_message = 'Book is not available for borrowing';
            ROLLBACK;
            LEAVE retry_loop;
        ELSE
            -- Insert checkout record
            INSERT INTO checkouts (user_id, book_id, due_date)
            VALUES (p_user_id, p_book_id, DATE_ADD(NOW(), INTERVAL p_due_days DAY));
            
            -- Update available copies atomically
            UPDATE books 
            SET available_copies = available_copies - 1,
                updated_at = NOW()
            WHERE book_id = p_book_id AND available_copies > 0;
            
            -- Check if update was successful (handles race condition)
            IF ROW_COUNT() = 0 THEN
                SET p_success = FALSE;
                SET p_message = 'Book was borrowed by another user. Please try again.';
                ROLLBACK;
                LEAVE retry_loop;
            END IF;
            
            SET p_success = TRUE;
            SET p_message = 'Book borrowed successfully';
            COMMIT;
            LEAVE retry_loop;
        END IF;
        
        -- Handle deadlock
        IF v_deadlock_occurred THEN
            ROLLBACK;
            SET v_retry_count = v_retry_count + 1;
            -- Wait before retry (exponential backoff)
            DO SLEEP(POWER(2, v_retry_count) * 0.1);
        END IF;
    END WHILE;
    
    -- If we exhausted retries
    IF v_retry_count >= v_max_retries THEN
        SET p_success = FALSE;
        SET p_message = 'Unable to borrow book due to high concurrency. Please try again later.';
    END IF;
END //

-- Stored procedure to return a book with enhanced concurrency control
CREATE PROCEDURE ReturnBook(
    IN p_checkout_id INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255),
    OUT p_late_fee DECIMAL(10,2)
)
BEGIN
    DECLARE v_book_id INT;
    DECLARE v_due_date TIMESTAMP;
    DECLARE v_is_late BOOLEAN DEFAULT FALSE;
    DECLARE v_late_days INT DEFAULT 0;
    DECLARE v_late_fee_rate DECIMAL(5,2) DEFAULT 1.00; -- $1 per day
    DECLARE v_retry_count INT DEFAULT 0;
    DECLARE v_max_retries INT DEFAULT 3;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'An error occurred during book return';
    END;
    
    -- Retry logic for deadlock handling
    retry_loop: WHILE v_retry_count < v_max_retries DO
        START TRANSACTION;
        
        -- Lock checkout record for update to prevent race conditions
        SELECT book_id, due_date INTO v_book_id, v_due_date
        FROM checkouts 
        WHERE checkout_id = p_checkout_id AND status = 'active'
        FOR UPDATE;
        
        IF v_book_id IS NULL THEN
            SET p_success = FALSE;
            SET p_message = 'Checkout record not found or already returned';
            ROLLBACK;
            LEAVE retry_loop;
        ELSE
            -- Calculate late fee if applicable
            IF NOW() > v_due_date THEN
                SET v_is_late = TRUE;
                SET v_late_days = DATEDIFF(NOW(), v_due_date);
                SET p_late_fee = v_late_days * v_late_fee_rate;
            ELSE
                SET p_late_fee = 0.00;
            END IF;
            
            -- Update checkout record atomically
            UPDATE checkouts 
            SET return_date = NOW(),
                is_late = v_is_late,
                late_fee = p_late_fee,
                status = 'returned',
                updated_at = NOW()
            WHERE checkout_id = p_checkout_id AND status = 'active';
            
            -- Check if update was successful
            IF ROW_COUNT() = 0 THEN
                SET p_success = FALSE;
                SET p_message = 'Checkout record was already processed by another transaction';
                ROLLBACK;
                LEAVE retry_loop;
            END IF;
            
            -- Update available copies atomically
            UPDATE books 
            SET available_copies = available_copies + 1,
                updated_at = NOW()
            WHERE book_id = v_book_id;
            
            SET p_success = TRUE;
            SET p_message = CONCAT('Book returned successfully', 
                                  IF(v_is_late, CONCAT('. Late fee: $', p_late_fee), ''));
            COMMIT;
            LEAVE retry_loop;
        END IF;
        
        -- Handle deadlock
        ROLLBACK;
        SET v_retry_count = v_retry_count + 1;
        -- Wait before retry (exponential backoff)
        DO SLEEP(POWER(2, v_retry_count) * 0.1);
    END WHILE;
    
    -- If we exhausted retries
    IF v_retry_count >= v_max_retries THEN
        SET p_success = FALSE;
        SET p_message = 'Unable to return book due to high concurrency. Please try again later.';
    END IF;
END //

-- Stored procedure to review a book
CREATE PROCEDURE ReviewBook(
    IN p_user_id INT,
    IN p_book_id INT,
    IN p_rating INT,
    IN p_comment TEXT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'An error occurred during review submission';
    END;
    
    START TRANSACTION;
    
    -- Check if user has borrowed this book
    IF NOT EXISTS (
        SELECT 1 FROM checkouts 
        WHERE user_id = p_user_id AND book_id = p_book_id AND status = 'returned'
    ) THEN
        SET p_success = FALSE;
        SET p_message = 'You can only review books you have borrowed and returned';
        ROLLBACK;
    ELSE
        -- Insert or update review
        INSERT INTO reviews (user_id, book_id, rating, comment)
        VALUES (p_user_id, p_book_id, p_rating, p_comment)
        ON DUPLICATE KEY UPDATE
            rating = p_rating,
            comment = p_comment,
            review_date = NOW();
        
        SET p_success = TRUE;
        SET p_message = 'Review submitted successfully';
        COMMIT;
    END IF;
END //

-- Stored procedure to add a book
CREATE PROCEDURE AddBook(
    IN p_staff_id INT,
    IN p_isbn VARCHAR(20),
    IN p_title VARCHAR(200),
    IN p_publisher VARCHAR(100),
    IN p_publication_date DATE,
    IN p_genre VARCHAR(50),
    IN p_language VARCHAR(20),
    IN p_total_copies INT,
    IN p_pages INT,
    IN p_description TEXT,
    IN p_author_ids JSON,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255),
    OUT p_book_id INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'An error occurred during book addition';
    END;
    
    START TRANSACTION;
    
    -- Insert book
    INSERT INTO books (isbn, title, publisher, publication_date, genre, language, 
                      total_copies, available_copies, pages, description)
    VALUES (p_isbn, p_title, p_publisher, p_publication_date, p_genre, p_language,
            p_total_copies, p_total_copies, p_pages, p_description);
    
    SET p_book_id = LAST_INSERT_ID();
    
    -- Insert book-author relationships
    INSERT INTO book_authors (book_id, author_id)
    SELECT p_book_id, JSON_UNQUOTE(JSON_EXTRACT(p_author_ids, CONCAT('$[', idx, ']')))
    FROM (
        SELECT 0 as idx UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
        UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
    ) numbers
    WHERE JSON_EXTRACT(p_author_ids, CONCAT('$[', idx, ']')) IS NOT NULL;
    
    -- Log the action
    INSERT INTO staff_logs (staff_id, action_type, target_table, target_id, new_values)
    VALUES (p_staff_id, 'add_book', 'books', p_book_id, 
            JSON_OBJECT('title', p_title, 'isbn', p_isbn, 'total_copies', p_total_copies));
    
    SET p_success = TRUE;
    SET p_message = 'Book added successfully';
    COMMIT;
END //

-- Stored procedure to update inventory with enhanced concurrency control
CREATE PROCEDURE UpdateInventory(
    IN p_staff_id INT,
    IN p_book_id INT,
    IN p_new_total_copies INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_old_total_copies INT;
    DECLARE v_available_copies INT;
    DECLARE v_new_available_copies INT;
    DECLARE v_retry_count INT DEFAULT 0;
    DECLARE v_max_retries INT DEFAULT 3;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'An error occurred during inventory update';
    END;
    
    -- Retry logic for deadlock handling
    retry_loop: WHILE v_retry_count < v_max_retries DO
        START TRANSACTION;
        
        -- Lock book row for update to prevent race conditions
        SELECT total_copies, available_copies INTO v_old_total_copies, v_available_copies
        FROM books WHERE book_id = p_book_id
        FOR UPDATE;
        
        IF v_old_total_copies IS NULL THEN
            SET p_success = FALSE;
            SET p_message = 'Book not found';
            ROLLBACK;
            LEAVE retry_loop;
        ELSE
            -- Calculate new available copies
            SET v_new_available_copies = v_available_copies + (p_new_total_copies - v_old_total_copies);
            
            -- Update book atomically
            UPDATE books 
            SET total_copies = p_new_total_copies,
                available_copies = GREATEST(0, v_new_available_copies),
                updated_at = NOW()
            WHERE book_id = p_book_id;
            
            -- Check if update was successful
            IF ROW_COUNT() = 0 THEN
                SET p_success = FALSE;
                SET p_message = 'Book was modified by another transaction. Please try again.';
                ROLLBACK;
                LEAVE retry_loop;
            END IF;
            
            -- Log the action with transaction safety
            INSERT INTO staff_logs (staff_id, action_type, target_table, target_id, 
                                   old_values, new_values, action_timestamp)
            VALUES (p_staff_id, 'update_inventory', 'books', p_book_id,
                    JSON_OBJECT('total_copies', v_old_total_copies, 'available_copies', v_available_copies),
                    JSON_OBJECT('total_copies', p_new_total_copies, 'available_copies', GREATEST(0, v_new_available_copies)),
                    NOW());
            
            SET p_success = TRUE;
            SET p_message = 'Inventory updated successfully';
            COMMIT;
            LEAVE retry_loop;
        END IF;
        
        -- Handle deadlock
        ROLLBACK;
        SET v_retry_count = v_retry_count + 1;
        -- Wait before retry (exponential backoff)
        DO SLEEP(POWER(2, v_retry_count) * 0.1);
    END WHILE;
    
    -- If we exhausted retries
    IF v_retry_count >= v_max_retries THEN
        SET p_success = FALSE;
        SET p_message = 'Unable to update inventory due to high concurrency. Please try again later.';
    END IF;
END //

-- Stored procedure to retire a book
CREATE PROCEDURE RetireBook(
    IN p_staff_id INT,
    IN p_book_id INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'An error occurred during book retirement';
    END;
    
    START TRANSACTION;
    
    -- Check if book exists and is not already retired
    IF NOT EXISTS (SELECT 1 FROM books WHERE book_id = p_book_id) THEN
        SET p_success = FALSE;
        SET p_message = 'Book not found';
        ROLLBACK;
    ELSEIF EXISTS (SELECT 1 FROM books WHERE book_id = p_book_id AND is_retired = TRUE) THEN
        SET p_success = FALSE;
        SET p_message = 'Book is already retired';
        ROLLBACK;
    ELSE
        -- Update book status
        UPDATE books 
        SET is_retired = TRUE
        WHERE book_id = p_book_id;
        
        -- Log the action
        INSERT INTO staff_logs (staff_id, action_type, target_table, target_id, new_values)
        VALUES (p_staff_id, 'retire_book', 'books', p_book_id, 
                JSON_OBJECT('is_retired', TRUE));
        
        SET p_success = TRUE;
        SET p_message = 'Book retired successfully';
        COMMIT;
    END IF;
END //

-- Test procedure for concurrency testing
CREATE PROCEDURE TestConcurrency(
    IN p_test_type ENUM('borrow', 'return', 'inventory'),
    IN p_book_id INT,
    IN p_user_id INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_test_result VARCHAR(255);
    DECLARE v_start_time TIMESTAMP;
    DECLARE v_end_time TIMESTAMP;
    
    SET v_start_time = NOW(6);
    
    CASE p_test_type
        WHEN 'borrow' THEN
            CALL BorrowBook(p_user_id, p_book_id, 14, p_success, p_message);
        WHEN 'return' THEN
            -- Get a checkout ID for testing
            SELECT checkout_id INTO @test_checkout_id 
            FROM checkouts 
            WHERE book_id = p_book_id AND status = 'active' 
            LIMIT 1;
            
            IF @test_checkout_id IS NOT NULL THEN
                CALL ReturnBook(@test_checkout_id, p_success, p_message, @late_fee);
            ELSE
                SET p_success = FALSE;
                SET p_message = 'No active checkout found for testing';
            END IF;
        WHEN 'inventory' THEN
            CALL UpdateInventory(1, p_book_id, 10, p_success, p_message);
    END CASE;
    
    SET v_end_time = NOW(6);
    
    -- Log the test result
    INSERT INTO staff_logs (staff_id, action_type, target_table, target_id, new_values)
    VALUES (1, 'test_concurrency', 'test', p_book_id, 
            JSON_OBJECT('test_type', p_test_type, 'success', p_success, 
                       'execution_time_ms', TIMESTAMPDIFF(MICROSECOND, v_start_time, v_end_time) / 1000));
END //

DELIMITER ;

-- =============================================
-- TRIGGERS
-- =============================================

DELIMITER //

-- Trigger to update book rating when a new review is added
CREATE TRIGGER update_book_rating_after_review_insert
AFTER INSERT ON reviews
FOR EACH ROW
BEGIN
    UPDATE books 
    SET average_rating = (
        SELECT AVG(rating) 
        FROM reviews 
        WHERE book_id = NEW.book_id AND is_approved = TRUE
    ),
    total_reviews = (
        SELECT COUNT(*) 
        FROM reviews 
        WHERE book_id = NEW.book_id AND is_approved = TRUE
    )
    WHERE book_id = NEW.book_id;
END //

-- Trigger to update book rating when a review is updated
CREATE TRIGGER update_book_rating_after_review_update
AFTER UPDATE ON reviews
FOR EACH ROW
BEGIN
    UPDATE books 
    SET average_rating = (
        SELECT AVG(rating) 
        FROM reviews 
        WHERE book_id = NEW.book_id AND is_approved = TRUE
    ),
    total_reviews = (
        SELECT COUNT(*) 
        FROM reviews 
        WHERE book_id = NEW.book_id AND is_approved = TRUE
    )
    WHERE book_id = NEW.book_id;
END //

-- Trigger to update book rating when a review is deleted
CREATE TRIGGER update_book_rating_after_review_delete
AFTER DELETE ON reviews
FOR EACH ROW
BEGIN
    UPDATE books 
    SET average_rating = COALESCE((
        SELECT AVG(rating) 
        FROM reviews 
        WHERE book_id = OLD.book_id AND is_approved = TRUE
    ), 0.00),
    total_reviews = (
        SELECT COUNT(*) 
        FROM reviews 
        WHERE book_id = OLD.book_id AND is_approved = TRUE
    )
    WHERE book_id = OLD.book_id;
END //

-- Trigger to update checkout status when due date passes
CREATE TRIGGER update_overdue_checkouts
BEFORE UPDATE ON checkouts
FOR EACH ROW
BEGIN
    IF NEW.status = 'active' AND NEW.due_date < NOW() AND NEW.return_date IS NULL THEN
        SET NEW.status = 'overdue';
    END IF;
END //

DELIMITER ;
