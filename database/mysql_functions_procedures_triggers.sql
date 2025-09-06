-- Smart Library - MySQL Stored Procedures and Triggers
USE smart_library;

DELIMITER $$

-- AddBook: create a book and attach authors (single author ID)
DROP PROCEDURE IF EXISTS AddBook$$
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
    IN p_author_id INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255),
    OUT p_book_id INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_success = FALSE;
        SET p_message = 'SQL error occurred';
        SET p_book_id = NULL;
    END;

    START TRANSACTION;
    
    -- Initialize variables
    SET p_success = FALSE;
    SET p_message = '';
    SET p_book_id = NULL;

    -- Verify author exists
    IF NOT EXISTS (SELECT 1 FROM authors WHERE author_id = p_author_id) THEN
        SET p_success = FALSE;
        SET p_message = CONCAT('Author ID ', p_author_id, ' not found');
        ROLLBACK;
    ELSE
        -- Insert book
        INSERT INTO books(
            isbn, title, publisher, publication_date, genre, 
            language, total_copies, available_copies, pages, description
        ) VALUES (
            p_isbn, p_title, p_publisher, p_publication_date, p_genre,
            p_language, p_total_copies, p_total_copies, p_pages, p_description
        );
        
        SET p_book_id = LAST_INSERT_ID();

        -- Add book-author relationship
        INSERT INTO book_authors(book_id, author_id) 
        VALUES(p_book_id, p_author_id);

        -- Log the action
        INSERT INTO staff_logs(staff_id, action_type, target_table, target_id, new_values)
        VALUES(p_staff_id, 'add_book', 'books', p_book_id, JSON_OBJECT('title', p_title));

        SET p_success = TRUE;
        SET p_message = 'Book added successfully';
        
        COMMIT;
    END IF;
END$$

-- UpdateInventory: change total copies and fix available accordingly
DROP PROCEDURE IF EXISTS UpdateInventory$$
CREATE PROCEDURE UpdateInventory(
    IN p_staff_id INT,
    IN p_book_id INT,
    IN p_new_total INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE current_total INT; DECLARE current_available INT;
    SELECT total_copies, available_copies INTO current_total, current_available FROM books WHERE book_id = p_book_id FOR UPDATE;
    IF current_total IS NULL THEN
        SET p_success = FALSE; SET p_message = 'Book not found';
    ELSE
        -- Adjust available relative to delta, but never negative
        UPDATE books 
        SET total_copies = p_new_total,
            available_copies = GREATEST(0, p_new_total - (total_copies - available_copies))
        WHERE book_id = p_book_id;

        INSERT INTO staff_logs(staff_id, action_type, target_table, target_id, old_values, new_values)
        VALUES(p_staff_id, 'update_inventory', 'books', p_book_id,
               JSON_OBJECT('total_copies', current_total, 'available_copies', current_available),
               (SELECT JSON_OBJECT('total_copies', total_copies, 'available_copies', available_copies) FROM books WHERE book_id = p_book_id));
        SET p_success = TRUE; SET p_message = 'Inventory updated';
    END IF;
END$$

-- RetireBook: mark as retired
DROP PROCEDURE IF EXISTS RetireBook$$
CREATE PROCEDURE RetireBook(
    IN p_staff_id INT,
    IN p_book_id INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    UPDATE books SET is_retired = 1 WHERE book_id = p_book_id;
    IF ROW_COUNT() = 0 THEN
        SET p_success = FALSE; SET p_message = 'Book not found';
    ELSE
        INSERT INTO staff_logs(staff_id, action_type, target_table, target_id, new_values)
        VALUES(p_staff_id, 'retire_book', 'books', p_book_id, JSON_OBJECT('is_retired', 1));
        SET p_success = TRUE; SET p_message = 'Book retired';
    END IF;
END$$

-- BorrowBook: enforce rules and create checkout
DROP PROCEDURE IF EXISTS BorrowBook$$
CREATE PROCEDURE BorrowBook(
    IN p_user_id INT,
    IN p_book_id INT,
    IN p_due_days INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE available INT; DECLARE retired TINYINT(1);
    SELECT available_copies, is_retired INTO available, retired FROM books WHERE book_id = p_book_id FOR UPDATE;
    IF available IS NULL OR retired = 1 THEN
        SET p_success = FALSE; SET p_message = 'Book not available';
    ELSEIF available <= 0 THEN
        SET p_success = FALSE; SET p_message = 'No available copies';
    ELSE
        INSERT INTO checkouts(user_id, book_id, due_date, status)
        VALUES(p_user_id, p_book_id, DATE_ADD(NOW(), INTERVAL p_due_days DAY), 'active');
        UPDATE books SET available_copies = available_copies - 1 WHERE book_id = p_book_id;
        SET p_success = TRUE; SET p_message = 'Book borrowed';
    END IF;
END$$

-- ReturnBook: close checkout, compute late fee, update availability
DROP PROCEDURE IF EXISTS ReturnBook$$
CREATE PROCEDURE ReturnBook(
    IN p_checkout_id INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255),
    OUT p_late_fee DECIMAL(10,2)
)
BEGIN
    DECLARE v_book_id INT; DECLARE v_due DATETIME; DECLARE v_status VARCHAR(20);
    DECLARE v_days_overdue INT; DECLARE v_fee DECIMAL(10,2);
    SET p_success = FALSE; SET p_message = 'Checkout not found'; SET p_late_fee = 0.00;

    SELECT book_id, due_date, status INTO v_book_id, v_due, v_status 
    FROM checkouts WHERE checkout_id = p_checkout_id FOR UPDATE;

    IF v_book_id IS NOT NULL AND v_status = 'active' THEN
        SET v_days_overdue = GREATEST(DATEDIFF(NOW(), v_due), 0);
        SET v_fee = v_days_overdue * 1.00; -- 1 unit per day

        UPDATE checkouts 
        SET return_date = NOW(), 
            is_late = (v_days_overdue > 0),
            late_fee = v_fee,
            status = IF(v_days_overdue > 0, 'overdue', 'returned')
        WHERE checkout_id = p_checkout_id;

        UPDATE books SET available_copies = available_copies + 1 WHERE book_id = v_book_id;

        SET p_success = TRUE; SET p_message = 'Book returned'; SET p_late_fee = v_fee;
    END IF;
END$$

-- ReviewBook: insert/update a review and refresh aggregates via triggers
DROP PROCEDURE IF EXISTS ReviewBook$$
CREATE PROCEDURE ReviewBook(
    IN p_user_id INT,
    IN p_book_id INT,
    IN p_rating INT,
    IN p_comment TEXT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE existing INT;
    SELECT review_id INTO existing FROM reviews WHERE user_id = p_user_id AND book_id = p_book_id LIMIT 1;
    IF existing IS NULL THEN
        INSERT INTO reviews(user_id, book_id, rating, comment) VALUES(p_user_id, p_book_id, p_rating, p_comment);
        SET p_success = TRUE; SET p_message = 'Review submitted';
    ELSE
        UPDATE reviews SET rating = p_rating, comment = p_comment, review_date = NOW() WHERE review_id = existing;
        SET p_success = TRUE; SET p_message = 'Review updated';
    END IF;
END$$

-- RenewBook: extend due date for a checkout
DROP PROCEDURE IF EXISTS RenewBook$$
CREATE PROCEDURE RenewBook(
    IN p_checkout_id INT,
    IN p_additional_days INT,
    OUT p_success BOOLEAN,
    OUT p_message VARCHAR(255)
)
BEGIN
    DECLARE v_user_id INT;
    DECLARE v_due_date DATETIME;
    DECLARE v_status VARCHAR(20);
    DECLARE v_renewal_count INT DEFAULT 0;
    
    SET p_success = FALSE;
    SET p_message = 'Checkout not found';
    
    -- Get checkout details
    SELECT user_id, due_date, status, renewal_count 
    INTO v_user_id, v_due_date, v_status, v_renewal_count
    FROM checkouts 
    WHERE checkout_id = p_checkout_id FOR UPDATE;
    
    IF v_user_id IS NOT NULL THEN
        -- Check if checkout is active
        IF v_status = 'active' THEN
            -- Check renewal limit (max 2 renewals)
            IF v_renewal_count < 2 THEN
                -- Update due date and renewal count
                UPDATE checkouts 
                SET due_date = DATE_ADD(due_date, INTERVAL p_additional_days DAY),
                    renewal_count = renewal_count + 1,
                    last_renewal_date = NOW()
                WHERE checkout_id = p_checkout_id;
                
                SET p_success = TRUE;
                SET p_message = 'Book renewed successfully';
            ELSE
                SET p_success = FALSE;
                SET p_message = 'Maximum renewals reached (2 renewals allowed)';
            END IF;
        ELSE
            SET p_success = FALSE;
            SET p_message = 'Cannot renew returned or overdue book';
        END IF;
    END IF;
END$$

DELIMITER ;


