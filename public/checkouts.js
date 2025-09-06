/* 
 * Checkout Functions JavaScript
 * Contains all client-side functionality for borrowing, returning, and renewing books
 */

// DOM ready event
document.addEventListener('DOMContentLoaded', () => {
    // Initialize checkout-related functionality if user is logged in
    const token = localStorage.getItem('authToken');
    if (token) {
        setupCheckoutUI();
        loadUserCheckouts();
        loadUserOverdueBooks();
        loadSoonDueBooks();
    } else {
        // Add event listener for login event
        document.addEventListener('userLoggedIn', () => {
            setupCheckoutUI();
            loadUserCheckouts();
            loadUserOverdueBooks();
            loadSoonDueBooks();
        });
    }
});

// Setup checkout UI components
function setupCheckoutUI() {
    // Add event handlers for checkout tabs
    const checkoutTabElements = document.querySelectorAll('.checkout-tab');
    if (checkoutTabElements.length > 0) {
        checkoutTabElements.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = tab.getAttribute('data-tab');
                switchCheckoutTab(tabId);
            });
        });

        // Activate default tab
        switchCheckoutTab('active-checkouts');
    }

    // Setup search history form
    const searchHistoryForm = document.getElementById('search-history-form');
    if (searchHistoryForm) {
        searchHistoryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(searchHistoryForm);
            const searchParams = new URLSearchParams();
            
            for (let pair of formData.entries()) {
                if (pair[1]) searchParams.append(pair[0], pair[1]);
            }
            
            searchCheckoutHistory(searchParams.toString());
        });
    }
}

// Load user's current checkouts
function loadUserCheckouts(status = 'active', page = 1, limit = 10) {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const checkoutsContainer = document.getElementById('active-checkouts-container');
    if (!checkoutsContainer) return;

    checkoutsContainer.innerHTML = '<div class="loader"></div>';

    fetch(`/api/checkouts/my-checkouts?status=${status}&page=${page}&limit=${limit}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            displayCheckouts(data.data.checkouts, checkoutsContainer, status === 'active');
            setupPagination(data.data.pagination, 'checkouts-pagination', (page) => {
                loadUserCheckouts(status, page, limit);
            });
        } else {
            checkoutsContainer.innerHTML = `<p class="error-message">${data.message}</p>`;
        }
    })
    .catch(error => {
        console.error('Error loading checkouts:', error);
        checkoutsContainer.innerHTML = '<p class="error-message">Failed to load checkouts. Please try again later.</p>';
    });
}

// Load user's overdue books
function loadUserOverdueBooks() {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const overdueContainer = document.getElementById('overdue-books-container');
    if (!overdueContainer) return;

    overdueContainer.innerHTML = '<div class="loader"></div>';

    fetch('/api/checkouts/overdue', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (data.data.length === 0) {
                overdueContainer.innerHTML = '<p class="info-message">You have no overdue books.</p>';
                return;
            }

            displayOverdueBooks(data.data, overdueContainer);
        } else {
            overdueContainer.innerHTML = `<p class="error-message">${data.message}</p>`;
        }
    })
    .catch(error => {
        console.error('Error loading overdue books:', error);
        overdueContainer.innerHTML = '<p class="error-message">Failed to load overdue books. Please try again later.</p>';
    });
}

// Load books that are due soon
function loadSoonDueBooks(days = 3) {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const soonDueContainer = document.getElementById('soon-due-books-container');
    if (!soonDueContainer) return;

    soonDueContainer.innerHTML = '<div class="loader"></div>';

    fetch(`/api/checkouts/soon-due?days=${days}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (data.data.length === 0) {
                soonDueContainer.innerHTML = `<p class="info-message">You have no books due within the next ${days} days.</p>`;
                return;
            }

            displaySoonDueBooks(data.data, soonDueContainer);
        } else {
            soonDueContainer.innerHTML = `<p class="error-message">${data.message}</p>`;
        }
    })
    .catch(error => {
        console.error('Error loading soon due books:', error);
        soonDueContainer.innerHTML = '<p class="error-message">Failed to load soon due books. Please try again later.</p>';
    });
}

// Search checkout history
function searchCheckoutHistory(queryParams = '', page = 1, limit = 10) {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const historyContainer = document.getElementById('checkout-history-container');
    if (!historyContainer) return;

    historyContainer.innerHTML = '<div class="loader"></div>';

    const url = `/api/checkouts/search-history?${queryParams}&page=${page}&limit=${limit}`;
    
    fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (data.data.history.length === 0) {
                historyContainer.innerHTML = '<p class="info-message">No checkout records found matching your criteria.</p>';
                return;
            }

            displayCheckoutHistory(data.data.history, historyContainer);
            setupPagination(data.data.pagination, 'history-pagination', (page) => {
                searchCheckoutHistory(queryParams, page, limit);
            });
        } else {
            historyContainer.innerHTML = `<p class="error-message">${data.message}</p>`;
        }
    })
    .catch(error => {
        console.error('Error searching checkout history:', error);
        historyContainer.innerHTML = '<p class="error-message">Failed to search checkout history. Please try again later.</p>';
    });
}

// Display checkouts
function displayCheckouts(checkouts, container, showActions = true) {
    if (!checkouts || checkouts.length === 0) {
        container.innerHTML = '<p class="info-message">No books currently checked out.</p>';
        return;
    }

    let html = '<div class="checkout-list">';
    
    checkouts.forEach(checkout => {
        const dueDate = new Date(checkout.due_date).toLocaleDateString();
        
        html += `
        <div class="checkout-item" data-id="${checkout.checkout_id}">
            <div class="checkout-cover">
                <img src="${checkout.cover_image_url || '/images/default-cover.png'}" alt="${checkout.title}" />
            </div>
            <div class="checkout-details">
                <h3>${checkout.title}</h3>
                <p class="checkout-author">${checkout.authors || 'Unknown author'}</p>
                <p class="checkout-isbn">ISBN: ${checkout.isbn || 'N/A'}</p>
                <p class="checkout-date">Borrowed: ${new Date(checkout.checkout_date).toLocaleDateString()}</p>
                <p class="checkout-due">Due: ${dueDate}</p>
            </div>
            ${showActions ? `
            <div class="checkout-actions">
                <button class="btn btn-primary return-book" data-id="${checkout.checkout_id}">Return</button>
                <button class="btn btn-outline renew-book" data-id="${checkout.checkout_id}">Renew</button>
            </div>
            ` : ''}
        </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;

    // Add event listeners for action buttons
    if (showActions) {
        container.querySelectorAll('.return-book').forEach(button => {
            button.addEventListener('click', handleReturnBook);
        });
        
        container.querySelectorAll('.renew-book').forEach(button => {
            button.addEventListener('click', handleRenewBook);
        });
    }
}

// Display overdue books
function displayOverdueBooks(overdueBooks, container) {
    let html = '<div class="checkout-list overdue-list">';
    
    overdueBooks.forEach(book => {
        const dueDate = new Date(book.due_date).toLocaleDateString();
        
        html += `
        <div class="checkout-item overdue-item" data-id="${book.checkout_id}">
            <div class="checkout-cover">
                <img src="${book.cover_image_url || '/images/default-cover.png'}" alt="${book.title}" />
                <span class="overdue-badge">Overdue</span>
            </div>
            <div class="checkout-details">
                <h3>${book.title}</h3>
                <p class="checkout-author">${book.authors || 'Unknown author'}</p>
                <p class="checkout-date">Due date: ${dueDate}</p>
                <p class="overdue-days">Days overdue: ${book.days_overdue}</p>
                <p class="late-fee">Late fee: $${book.late_fee.toFixed(2)}</p>
            </div>
            <div class="checkout-actions">
                <button class="btn btn-primary return-book" data-id="${book.checkout_id}">Return</button>
            </div>
        </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;

    // Add event listeners for return buttons
    container.querySelectorAll('.return-book').forEach(button => {
        button.addEventListener('click', handleReturnBook);
    });
}

// Display soon due books
function displaySoonDueBooks(soonDueBooks, container) {
    let html = '<div class="checkout-list soon-due-list">';
    
    soonDueBooks.forEach(book => {
        const dueDate = new Date(book.due_date).toLocaleDateString();
        const daysRemaining = book.days_remaining;
        
        html += `
        <div class="checkout-item soon-due-item" data-id="${book.checkout_id}">
            <div class="checkout-cover">
                <img src="${book.cover_image_url || '/images/default-cover.png'}" alt="${book.title}" />
                <span class="days-remaining-badge">${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left</span>
            </div>
            <div class="checkout-details">
                <h3>${book.title}</h3>
                <p class="checkout-author">${book.authors || 'Unknown author'}</p>
                <p class="checkout-date">Due date: ${dueDate}</p>
            </div>
            <div class="checkout-actions">
                <button class="btn btn-primary return-book" data-id="${book.checkout_id}">Return</button>
                <button class="btn btn-outline renew-book" data-id="${book.checkout_id}">Renew</button>
            </div>
        </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;

    // Add event listeners for action buttons
    container.querySelectorAll('.return-book').forEach(button => {
        button.addEventListener('click', handleReturnBook);
    });
    
    container.querySelectorAll('.renew-book').forEach(button => {
        button.addEventListener('click', handleRenewBook);
    });
}

// Display checkout history
function displayCheckoutHistory(history, container) {
    let html = '<div class="checkout-list history-list">';
    
    history.forEach(item => {
        const checkoutDate = new Date(item.checkout_date).toLocaleDateString();
        const dueDate = new Date(item.due_date).toLocaleDateString();
        const returnDate = item.return_date ? new Date(item.return_date).toLocaleDateString() : 'Not returned';
        const status = item.status === 'active' ? 'Active' : 
                      item.is_late ? 'Returned late' : 'Returned on time';
        
        html += `
        <div class="checkout-item history-item ${item.is_late ? 'late-return' : ''}">
            <div class="checkout-cover">
                <img src="${item.cover_image_url || '/images/default-cover.png'}" alt="${item.title}" />
                <span class="status-badge ${item.status === 'active' ? 'active' : item.is_late ? 'late' : 'returned'}">${status}</span>
            </div>
            <div class="checkout-details">
                <h3>${item.title}</h3>
                <p class="checkout-author">${item.authors || 'Unknown author'}</p>
                <p class="checkout-date">Borrowed: ${checkoutDate}</p>
                <p class="checkout-due">Due: ${dueDate}</p>
                <p class="checkout-return">Returned: ${returnDate}</p>
                ${item.late_fee > 0 ? `<p class="late-fee">Late fee: $${parseFloat(item.late_fee).toFixed(2)}</p>` : ''}
            </div>
        </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Handle returning a book
function handleReturnBook(e) {
    const checkoutId = e.target.getAttribute('data-id');
    const token = localStorage.getItem('authToken');
    if (!token || !checkoutId) return;

    if (!confirm('Are you sure you want to return this book?')) return;

    fetch('/api/checkouts/return', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ checkoutId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Book returned successfully', 'success');
            if (data.data.lateFee > 0) {
                showToast(`Late fee: $${data.data.lateFee.toFixed(2)}`, 'info');
            }
            // Refresh the UI
            loadUserCheckouts();
            loadUserOverdueBooks();
            loadSoonDueBooks();
        } else {
            showToast(data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error returning book:', error);
        showToast('Failed to return book. Please try again later.', 'error');
    });
}

// Handle renewing a book
function handleRenewBook(e) {
    const checkoutId = e.target.getAttribute('data-id');
    const token = localStorage.getItem('authToken');
    if (!token || !checkoutId) return;

    // Show renew dialog
    showRenewDialog(checkoutId);
}

// Show renew dialog
function showRenewDialog(checkoutId) {
    // Create dialog backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    
    // Create dialog content
    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.innerHTML = `
        <div class="modal-header">
            <h3>Renew Book</h3>
            <button class="close-button">&times;</button>
        </div>
        <div class="modal-body">
            <form id="renew-form">
                <div class="form-group">
                    <label for="additionalDays">Additional Days:</label>
                    <input type="number" id="additionalDays" name="additionalDays" min="1" max="14" value="7" required>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">Renew Book</button>
                    <button type="button" class="btn btn-outline cancel-btn">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(backdrop);
    document.body.appendChild(dialog);
    
    // Add event listeners
    dialog.querySelector('.close-button').addEventListener('click', () => {
        closeDialog(backdrop, dialog);
    });
    
    dialog.querySelector('.cancel-btn').addEventListener('click', () => {
        closeDialog(backdrop, dialog);
    });
    
    dialog.querySelector('#renew-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const additionalDays = parseInt(dialog.querySelector('#additionalDays').value);
        renewBook(checkoutId, additionalDays);
        closeDialog(backdrop, dialog);
    });
}

// Close dialog
function closeDialog(backdrop, dialog) {
    document.body.removeChild(backdrop);
    document.body.removeChild(dialog);
}

// Renew book
function renewBook(checkoutId, additionalDays) {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    fetch('/api/checkouts/renew', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ checkoutId, additionalDays })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Book renewed successfully', 'success');
            showToast(`New due date: ${new Date(data.data.due_date).toLocaleDateString()}`, 'info');
            // Refresh the UI
            loadUserCheckouts();
            loadSoonDueBooks();
        } else {
            showToast(data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error renewing book:', error);
        showToast('Failed to renew book. Please try again later.', 'error');
    });
}

// Switch checkout tab
function switchCheckoutTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.checkout-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabId}-container`).classList.add('active');
    
    // Update tab buttons
    document.querySelectorAll('.checkout-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelector(`.checkout-tab[data-tab="${tabId}"]`).classList.add('active');
    
    // Load data for the selected tab if needed
    if (tabId === 'active-checkouts') {
        loadUserCheckouts('active');
    } else if (tabId === 'checkout-history') {
        // Load first page of all history
        searchCheckoutHistory();
    } else if (tabId === 'overdue-books') {
        loadUserOverdueBooks();
    } else if (tabId === 'soon-due-books') {
        loadSoonDueBooks();
    }
}

// Setup pagination
function setupPagination(pagination, containerId, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!pagination || pagination.totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination">';
    
    // Previous button
    if (pagination.currentPage > 1) {
        html += `<button class="page-btn prev-btn" data-page="${pagination.currentPage - 1}">Previous</button>`;
    } else {
        html += `<button class="page-btn prev-btn disabled">Previous</button>`;
    }
    
    // Page numbers
    let startPage = Math.max(1, pagination.currentPage - 2);
    let endPage = Math.min(pagination.totalPages, pagination.currentPage + 2);
    
    if (startPage > 1) {
        html += `<button class="page-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            html += `<span class="page-ellipsis">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        if (i === pagination.currentPage) {
            html += `<button class="page-btn current" data-page="${i}">${i}</button>`;
        } else {
            html += `<button class="page-btn" data-page="${i}">${i}</button>`;
        }
    }
    
    if (endPage < pagination.totalPages) {
        if (endPage < pagination.totalPages - 1) {
            html += `<span class="page-ellipsis">...</span>`;
        }
        html += `<button class="page-btn" data-page="${pagination.totalPages}">${pagination.totalPages}</button>`;
    }
    
    // Next button
    if (pagination.currentPage < pagination.totalPages) {
        html += `<button class="page-btn next-btn" data-page="${pagination.currentPage + 1}">Next</button>`;
    } else {
        html += `<button class="page-btn next-btn disabled">Next</button>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
    
    // Add event listeners to pagination buttons
    container.querySelectorAll('.page-btn:not(.disabled)').forEach(button => {
        button.addEventListener('click', () => {
            const page = parseInt(button.getAttribute('data-page'));
            callback(page);
        });
    });
}

// Show toast notification
function showToast(message, type = 'info') {
    // Check if toast container exists, if not create it
    let toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = message;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.add('fadeOut');
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 3000);
}
